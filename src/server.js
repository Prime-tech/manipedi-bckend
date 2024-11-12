const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');

dotenv.config();

const app = express();

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3000'], // Add your frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Request logger middleware
app.use((req, res, next) => {
  console.log(`\n🔄 ${new Date().toISOString()}`);
  console.log(`📨 ${req.method} ${req.url}`);
  console.log('📦 Headers:', req.headers);
  next();
});

app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
});