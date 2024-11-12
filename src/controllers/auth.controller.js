const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const { sendOTP } = require('../services/email.service');

const prisma = new PrismaClient();

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Signup controller
exports.signup = async (req, res) => {
  console.log('📍 SIGNUP REQUEST:', {
    body: req.body,
    timestamp: new Date().toISOString()
  });

  try {
    const { fullName, email, phone } = req.body;

    // Input validation
    if (!email || !fullName) {
      const error = 'Email and full name are required';
      console.log('❌ SIGNUP VALIDATION ERROR:', { error, email, fullName });
      return res.status(400).json({ message: error });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      const error = 'Email already registered';
      console.log('❌ SIGNUP USER EXISTS:', { error, email });
      return res.status(400).json({ message: error });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP in memory (temporary solution)
    if (!global.signupOTPs) {
      global.signupOTPs = new Map();
    }

    global.signupOTPs.set(email, {
      otp,
      fullName,
      phone,
      timestamp: new Date()
    });

    console.log('✅ OTP GENERATED:', {
      email,
      otp,
      timestamp: new Date().toISOString()
    });

    // Send OTP email
    try {
      await sendOTP(email, otp);
      console.log('✅ OTP EMAIL SENT:', { email });
    } catch (emailError) {
      console.error('❌ EMAIL SENDING ERROR:', {
        error: emailError.message,
        stack: emailError.stack
      });
      throw new Error(`Failed to send OTP: ${emailError.message}`);
    }

    res.status(200).json({ 
      message: 'OTP sent successfully',
      email 
    });

  } catch (error) {
    console.error('❌ SIGNUP ERROR:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({ 
      message: 'Internal server error', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Verify signup OTP controller
exports.verifySignupOTP = async (req, res) => {
  console.log('📍 VERIFY SIGNUP REQUEST:', {
    body: req.body,
    timestamp: new Date().toISOString()
  });

  try {
    const { email, otp, fullName, phone } = req.body;

    // Validate input
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    // Verify OTP
    const otpRecord = await prisma.oTP.findFirst({
      where: {
        email,
        otp,
        expiresAt: { gt: new Date() }
      }
    });

    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        fullName: fullName,
        email: email,
        phone: phone,
        verified: true
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true
      }
    });

    // Delete used OTP
    await prisma.oTP.delete({ where: { id: otpRecord.id } });

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('✅ VERIFY SIGNUP SUCCESS:', {
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString()
    });
    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.fullName,
        email: user.email,
        phone: user.phone || undefined
      }
    });
  } catch (error) {
    console.error('❌ VERIFY SIGNUP ERROR:', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Login controller
exports.login = async (req, res) => {
  console.log('📍 LOGIN REQUEST:', {
    body: req.body,
    timestamp: new Date().toISOString()
  });

  try {
    const { email } = req.body;

    // Validate input
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Store OTP
    await prisma.oTP.create({
      data: {
        email,
        otp,
        expiresAt
      }
    });

    // Send OTP
    await sendOTP(email, otp);

    console.log('✅ LOGIN SUCCESS:', {
      email,
      otp,
      timestamp: new Date().toISOString()
    });
    res.status(200).json({ 
      message: 'OTP sent to email',
      otp: otp 
    });
  } catch (error) {
    console.error('❌ LOGIN ERROR:', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Verify login OTP controller
exports.verifyLoginOTP = async (req, res) => {
  console.log('📍 VERIFY LOGIN REQUEST:', {
    body: req.body,
    timestamp: new Date().toISOString()
  });

  try {
    const { email, otp } = req.body;

    // Validate input
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    // Verify OTP
    const otpRecord = await prisma.oTP.findFirst({
      where: {
        email,
        otp,
        expiresAt: { gt: new Date() }
      }
    });

    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true
      }
    });

    // Delete used OTP
    await prisma.oTP.delete({ where: { id: otpRecord.id } });

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('✅ VERIFY LOGIN SUCCESS:', {
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString()
    });
    res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.fullName,
        email: user.email,
        phone: user.phone || undefined
      }
    });
  } catch (error) {
    console.error('❌ VERIFY LOGIN ERROR:', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ message: 'Internal server error' });
  }
};