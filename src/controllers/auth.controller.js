const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const { sendOTP } = require('../services/email.service');

const prisma = new PrismaClient();
const otpMap = new Map();

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Signup controller
const signup = async (req, res) => {
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
    
    // Store OTP with timestamp
    otpMap.set(email, {
      otp,
      fullName,
      phone,
      timestamp: new Date(),
      attempts: 0
    });

    console.log('✅ OTP Generated:', { email, otp }); // For testing

    // Send OTP email
    await sendOTP(email, otp);

    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('❌ Signup Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Verify signup OTP controller
const verifySignup = async (req, res) => {
  try {
    const { email, otp } = req.body;
    console.log('📍 Verify Signup Request:', { email, otp });

    const storedData = otpMap.get(email);
    console.log('📍 Stored OTP Data:', storedData);

    if (!storedData) {
      return res.status(400).json({ message: 'No OTP found for this email' });
    }

    // Check if OTP is expired (10 minutes)
    const now = new Date();
    const otpAge = (now - storedData.timestamp) / 1000 / 60; // in minutes
    
    if (otpAge > 10) {
      otpMap.delete(email);
      return res.status(400).json({ message: 'OTP has expired' });
    }

    // Increment attempts
    storedData.attempts += 1;
    if (storedData.attempts > 3) {
      otpMap.delete(email);
      return res.status(400).json({ message: 'Too many attempts. Please request a new OTP' });
    }

    // Verify OTP
    if (storedData.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Create user in database
    const user = await prisma.user.create({
      data: {
        email: email,
        fullName: storedData.fullName,
        phone: storedData.phone,
        verified: true
      }
    });

    // Clear OTP after successful verification
    otpMap.delete(email);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.status(200).json({
      message: 'Signup successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone
      }
    });

  } catch (error) {
    console.error('❌ Verify Signup Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Login controller
const login = async (req, res) => {
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
const verifyLogin = async (req, res) => {
  try {
    const { email, otp } = req.body;

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

    // Get user with isAdmin field
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        isAdmin: true
      }
    });

    // Delete used OTP
    await prisma.oTP.delete({ where: { id: otpRecord.id } });

    // Generate JWT with isAdmin claim
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        isAdmin: user.isAdmin  // Include isAdmin in token
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('✅ VERIFY LOGIN SUCCESS:', {
      userId: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.fullName,
        email: user.email,
        phone: user.phone || undefined,
        isAdmin: user.isAdmin  // Include isAdmin in response
      }
    });
  } catch (error) {
    console.error('❌ VERIFY LOGIN ERROR:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Export all methods
module.exports = {
  signup,
  verifySignup,
  login,
  verifyLogin
};