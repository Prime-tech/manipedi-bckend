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

const sendBookingRequestEmail = async (businessEmail, bookingDetails) => {
  try {
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: businessEmail,
      subject: 'New Booking Request - Manipedi',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">New Booking Request</h2>
          <div style="background-color: #f8f8f8; padding: 20px; border-radius: 5px;">
            <p><strong>Booking ID:</strong> ${bookingDetails.bookingId}</p>
            <p><strong>Customer:</strong> ${bookingDetails.customerName}</p>
            <p><strong>Service:</strong> ${bookingDetails.serviceType}</p>
            <p><strong>Date/Time:</strong> ${new Date(bookingDetails.dateTime).toLocaleString()}</p>
            <p><strong>Location:</strong> ${bookingDetails.zipCode}</p>
          </div>
          <p style="margin-top: 20px;">
            Please respond to this request by clicking one of the following links:
          </p>
          <div style="text-align: center; margin-top: 20px;">
            <a href="${process.env.FRONTEND_URL}/accept-booking/${bookingDetails.bookingId}" 
               style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; margin-right: 10px;">
              Accept Booking
            </a>
            <a href="${process.env.FRONTEND_URL}/decline-booking/${bookingDetails.bookingId}" 
               style="background-color: #f44336; color: white; padding: 10px 20px; text-decoration: none;">
              Decline Booking
            </a>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Booking Request Email Sent:', { businessEmail });
  } catch (error) {
    console.error('❌ Booking Email Error:', error);
    throw error;
  }
};

const sendBookingConfirmationEmail = async (customerEmail, bookingDetails) => {
  try {
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: customerEmail,
      subject: 'Your Manipedi Booking is Confirmed!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Booking Confirmed!</h2>
          <div style="background-color: #f8f8f8; padding: 20px; border-radius: 5px;">
            <p><strong>Booking ID:</strong> ${bookingDetails.bookingId}</p>
            <p><strong>Service:</strong> ${bookingDetails.serviceType}</p>
            <p><strong>Date/Time:</strong> ${new Date(bookingDetails.dateTime).toLocaleString()}</p>
            <p><strong>Business:</strong> ${bookingDetails.businessName}</p>
            <p><strong>Business Phone:</strong> ${bookingDetails.businessPhone}</p>
          </div>
          <p style="margin-top: 20px; color: #666;">
            If you need to make any changes to your booking, please contact the business directly.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Booking Confirmation Email Sent:', { customerEmail });
  } catch (error) {
    console.error('❌ Booking Confirmation Email Error:', error);
    throw error;
  }
};

const sendBusinessConfirmationEmail = async (businessEmail, bookingDetails) => {
  try {
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: businessEmail,
      subject: 'Booking Confirmation - Manipedi',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Booking Confirmed</h2>
          <div style="background-color: #f8f8f8; padding: 20px; border-radius: 5px;">
            <p><strong>Booking ID:</strong> ${bookingDetails.bookingId}</p>
            <p><strong>Customer:</strong> ${bookingDetails.customerName}</p>
            <p><strong>Customer Phone:</strong> ${bookingDetails.customerPhone}</p>
            <p><strong>Service:</strong> ${bookingDetails.serviceType}</p>
            <p><strong>Date/Time:</strong> ${new Date(bookingDetails.dateTime).toLocaleString()}</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Business Confirmation Email Sent:', { businessEmail });
  } catch (error) {
    console.error('❌ Business Confirmation Email Error:', error);
    throw error;
  }
};

const sendBookingCancellationEmail = async (customerEmail, bookingDetails) => {
  try {
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: customerEmail,
      subject: 'Booking Update - Manipedi',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Booking Update</h2>
          <div style="background-color: #f8f8f8; padding: 20px; border-radius: 5px;">
            <p>We're sorry, but we couldn't find an available business for your booking:</p>
            <p><strong>Booking ID:</strong> ${bookingDetails.bookingId}</p>
            <p><strong>Service:</strong> ${bookingDetails.serviceType}</p>
            <p><strong>Date/Time:</strong> ${new Date(bookingDetails.dateTime).toLocaleString()}</p>
          </div>
          <p style="margin-top: 20px; color: #666;">
            Please try booking again with a different time or date.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Booking Cancellation Email Sent:', { customerEmail });
  } catch (error) {
    console.error('❌ Booking Cancellation Email Error:', error);
    throw error;
  }
};

module.exports = {
  sendOTP,
  sendBookingRequestEmail,
  sendBookingConfirmationEmail,
  sendBusinessConfirmationEmail,
  sendBookingCancellationEmail
};