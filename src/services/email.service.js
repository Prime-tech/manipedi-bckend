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
      subject: 'Your Manipedi Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; text-align: center;">Welcome to Manipedi!</h2>
          <div style="background-color: #f8f8f8; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; font-size: 16px;">Your verification code is:</p>
            <h1 style="color: #4a90e2; text-align: center; font-size: 36px; margin: 20px 0;">${otp}</h1>
            <p style="margin: 0; font-size: 14px; color: #666;">This code will expire in 10 minutes.</p>
          </div>
          <p style="color: #666; font-size: 14px; text-align: center;">
            If you didn't request this code, please ignore this email.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ OTP Email Sent:', { email });
  } catch (error) {
    console.error('❌ Email Error:', error);
    throw error;
  }
};

module.exports = { sendOTP };