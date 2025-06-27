const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');
const router = express.Router();

// Setup Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// POST /upload - upload image and extract text
router.post('/', upload.single('receipt'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const originalPath = req.file.path;
  const preprocessedPath = `uploads/processed-${req.file.filename}`;

  try {
    // Step 1: Preprocess image for better OCR accuracy
    await sharp(originalPath)
      .resize({ width: 1000 }) // normalize width
      .grayscale()
      .sharpen()
      .toFile(preprocessedPath);

    // Step 2: OCR with Tesseract
    const result = await Tesseract.recognize(
      preprocessedPath,
      'eng',
      { logger: m => console.log(m) }
    );

    const { text, confidence } = result.data;

    // Step 3: Cleanup processed temp file
    fs.unlink(preprocessedPath, err => {
      if (err) console.warn('Failed to remove temp processed file:', err);
    });

    // Step 4: Send result
    res.status(200).json({
      message: 'File uploaded and processed successfully',
      text: text,
      confidence: confidence,
      filePath: req.file.path
    });
  } catch (err) {
    console.error('OCR Error:', err);
    res.status(500).json({ error: 'OCR processing failed' });
  }
});

module.exports = router;
