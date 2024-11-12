const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');

const sendOTP = async (email, otp) => {
  console.log('📧 STARTING EMAIL SEND:', {
    to: email,
    timestamp: new Date().toISOString()
  });

  try {
    // Verify environment variables
    const requiredVars = [
      'GMAIL_CLIENT_ID',
      'GMAIL_CLIENT_SECRET',
      'GMAIL_REFRESH_TOKEN',
      'GMAIL_USER'
    ];

    requiredVars.forEach(varName => {
      if (!process.env[varName]) {
        throw new Error(`Missing environment variable: ${varName}`);
      }
    });

    const oauth2Client = new OAuth2Client(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      'https://developers.google.com/oauthplayground'
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN
    });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.GMAIL_USER,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN
      }
    });

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: 'Your OTP for Manipedi',
      text: `Your OTP is: ${otp}. This OTP will expire in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Welcome to Manipedi!</h2>
          <p>Your One-Time Password (OTP) is:</p>
          <h1 style="color: #4a90e2;">${otp}</h1>
          <p>This OTP will expire in 10 minutes.</p>
          <p>If you didn't request this OTP, please ignore this email.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    
    console.log('✅ EMAIL SENT SUCCESSFULLY:', {
      to: email,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ EMAIL SERVICE ERROR:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

module.exports = { sendOTP };