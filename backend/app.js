const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const uploadRoute = require('./routes/upload');

const app = express();

app.use(cors());
app.use(express.json());

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount upload route
app.use('/upload', uploadRoute);

app.get('/', (req, res) => {
  res.send('Expense Genie Backend is running...');
});

module.exports = app;
