const nodemailer = require('nodemailer');
const { GoogleAuth } = require('google-auth-library');
const { OAuth2Client } = require('google-auth-library');

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

const sendOTP = async (email, otp) => {
  try {
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: 'Your OTP for Manipedi',
      text: `Your OTP is: ${otp}. This OTP will expire in 10 minutes.`
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
};

module.exports = { sendOTP };