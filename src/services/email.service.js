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

// Add detailed logging for transporter creation
const createTransporter = async () => {
  try {
    console.log('📧 CREATING EMAIL TRANSPORTER');
    
    const oauth2Client = new OAuth2Client(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN
    });

    console.log('🔑 OAUTH2 CLIENT CREATED');

    const accessToken = await oauth2Client.getAccessToken();
    console.log('✅ OAUTH2 ACCESS TOKEN OBTAINED');

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.GMAIL_USER,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
        accessToken: accessToken?.token || ''
      }
    });

    // Verify the transporter
    await transporter.verify();
    console.log('✅ EMAIL TRANSPORTER VERIFIED');
    
    return transporter;
  } catch (error) {
    console.error('❌ FAILED TO CREATE EMAIL TRANSPORTER:', {
      error: error.message,
      stack: error.stack,
      credentials: {
        clientId: process.env.GMAIL_CLIENT_ID ? 'Set' : 'Missing',
        clientSecret: process.env.GMAIL_CLIENT_SECRET ? 'Set' : 'Missing',
        refreshToken: process.env.GMAIL_REFRESH_TOKEN ? 'Set' : 'Missing',
        user: process.env.GMAIL_USER ? 'Set' : 'Missing'
      }
    });
    throw error;
  }
};

const sendBookingRequestEmail = async (businessEmail, bookingDetails) => {
  try {
    // Check if FRONTEND_URL exists and provide a default if not
    const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://www.manipeditime.com').replace(/\/$/, '');
    
    console.log('📧 SENDING BUSINESS EMAIL:', {
      to: businessEmail,
      requestId: bookingDetails.requestId,
      frontendUrl: FRONTEND_URL, // Add this for debugging
      timestamp: new Date().toISOString()
    });

    // Create unique URLs for accept/decline actions
    const acceptUrl = `${FRONTEND_URL}/business/quote/${bookingDetails.requestId}`;
    const declineUrl = `${FRONTEND_URL}/business/decline/${bookingDetails.requestId}`;

    console.log('🔗 Generated URLs:', {
      acceptUrl,
      declineUrl
    });

    // Create transporter using the createTransporter function
    const transporter = await createTransporter();

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: businessEmail,
      subject: 'New Booking Request - Manipedi',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">New Booking Request</h2>
          <div style="background-color: #f8f8f8; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <p><strong>Service Type:</strong> ${bookingDetails.serviceType}</p>
            <p><strong>Date/Time:</strong> ${new Date(bookingDetails.dateTime).toLocaleString()}</p>
            <p><strong>Location:</strong> ${bookingDetails.zipCode}</p>
            <p><strong>Request ID:</strong> ${bookingDetails.requestId}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${acceptUrl}" 
               style="display: inline-block; background-color: #4CAF50; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin-right: 15px; margin-bottom: 10px; font-weight: bold;">
              Accept & Enter Quote
            </a>
            <a href="${declineUrl}" 
               style="display: inline-block; background-color: #f44336; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Decline Request
            </a>
          </div>
          
          <div style="margin-top: 20px; padding: 15px; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 14px;">
              • Clicking "Accept & Enter Quote" will take you to a form to provide your price quote<br>
              • Clicking "Decline Request" will immediately decline this booking request<br>
              • Please respond within 2 hours to ensure the best chance of securing the booking
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Booking Request Email Sent:', {
      businessEmail,
      requestId: bookingDetails.requestId
    });
  } catch (error) {
    console.error('❌ Booking Request Email Error:', {
      error: error.message,
      stack: error.stack,
      env: {
        frontendUrl: process.env.FRONTEND_URL || 'not set',
        gmailUser: process.env.GMAIL_USER ? 'set' : 'not set'
      }
    });
    throw error;
  }
};

const sendBookingConfirmationEmail = async (userEmail, details) => {
  try {
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: userEmail,
      subject: 'Booking Confirmed! - Manipedi',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Your Booking is Confirmed!</h2>
          <div style="background-color: #f8f8f8; padding: 20px; border-radius: 5px;">
            <p><strong>Salon:</strong> ${details.businessName}</p>
            <p><strong>Date/Time:</strong> ${new Date(details.dateTime).toLocaleString()}</p>
            <p><strong>Price:</strong> $${details.price}</p>
            <p><strong>Booking ID:</strong> ${details.bookingId}</p>
          </div>
          <p style="margin-top: 20px; color: #666;">
            The salon has been notified and is expecting you. Enjoy your service!
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('❌ Booking Confirmation Email Error:', error);
    throw error;
  }
};

const sendBusinessConfirmationEmail = async (businessEmail, details) => {
  try {
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: businessEmail,
      subject: 'Booking Confirmed! - Manipedi',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">New Booking Confirmed!</h2>
          <div style="background-color: #f8f8f8; padding: 20px; border-radius: 5px;">
            <p><strong>Customer:</strong> ${details.customerName}</p>
            <p><strong>Phone:</strong> ${details.customerPhone}</p>
            <p><strong>Date/Time:</strong> ${new Date(details.dateTime).toLocaleString()}</p>
            <p><strong>Price:</strong> $${details.price}</p>
            <p><strong>Booking ID:</strong> ${details.bookingId}</p>
            ${details.message ? `<p><strong>Message:</strong> ${details.message}</p>` : ''}
          </div>
          <p style="margin-top: 20px; color: #666;">
            Please prepare for the customer's arrival at the scheduled time.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
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

// Add new email function for salon responses
const sendSalonResponseEmail = async (userEmail, responseDetails) => {
  try {
    const viewQuoteUrl = `${process.env.FRONTEND_URL}/bookings/${responseDetails.bookingId}/quotes`;
    
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: userEmail,
      subject: 'New Quote for Your Booking - Manipedi',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">New Quote Received!</h2>
          <div style="background-color: #f8f8f8; padding: 20px; border-radius: 5px;">
            <p><strong>Salon:</strong> ${responseDetails.businessName}</p>
            <p><strong>Price:</strong> $${responseDetails.price}</p>
            ${responseDetails.notes ? `<p><strong>Notes:</strong> ${responseDetails.notes}</p>` : ''}
            <p><strong>Booking ID:</strong> ${responseDetails.bookingId}</p>
          </div>
          <div style="margin-top: 20px; text-align: center;">
            <a href="${viewQuoteUrl}" 
               style="display: inline-block; background-color: #ff69b4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              View All Quotes
            </a>
          </div>
          <p style="margin-top: 20px; color: #666; font-size: 14px;">
            You can compare all quotes and select your preferred salon by clicking the button above.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Salon Response Email Sent:', { userEmail });
  } catch (error) {
    console.error('❌ Salon Response Email Error:', error);
    throw error;
  }
};

module.exports = {
  sendOTP,
  sendBookingRequestEmail,
  sendBookingConfirmationEmail,
  sendBusinessConfirmationEmail,
  sendBookingCancellationEmail,
  sendSalonResponseEmail
};