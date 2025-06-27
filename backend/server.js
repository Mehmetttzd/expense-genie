require('dotenv').config(); // Load env vars from .env file at the very top

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const verifyToken = require('./middleware/auth');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Basic root route - health check
app.get('/', (req, res) => {
  res.send('Expense Genie API is running');
});

// Auth routes (register, login)
app.use('/auth', authRoutes);

// Protect upload route with JWT token verification middleware
app.use('/upload', verifyToken, uploadRoutes);

// Serve uploaded images statically
app.use('/uploads', express.static('uploads'));

// Error handling middleware (simple)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
