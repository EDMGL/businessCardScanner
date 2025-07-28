// ocrServer.js
const express = require('express');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const cors = require('cors');
const fs = require('fs');

const app = express();
const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});
app.use(cors());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'OK', message: 'OCR API çalışıyor' });
});

app.post('/ocr', upload.single('image'), async (req, res) => {
  const imagePath = req.file.path;

  try {
    const result = await Tesseract.recognize(imagePath, 'eng');
    const ocrText = result.data.text;

    // Basit regex ile bilgi çıkarma
    const extractedInfo = extractInfoFromText(ocrText);

    fs.unlinkSync(imagePath);
    res.json({
      full_text: ocrText,
      ...extractedInfo
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'OCR failed', details: err.message });
  }
});

function extractInfoFromText(text) {
  const lines = text.split('\n');
  const result = {
    name: null,
    title: null,
    tel: null,
    company: null,
    email: null,
    address: null,
    web: null
  };

  // Email tespiti
  const emailMatch = text.match(/[\w\.-]+@[\w\.-]+/);
  if (emailMatch) {
    result.email = emailMatch[0];
  }

  // Telefon tespiti
  const phoneMatch = text.match(/(\+?\d{1,3}[\s-]?)?(\(?\d{3}\)?[\s-]?)?\d{2,4}[\s-]?\d{2,4}[\s-]?\d{2,4}/);
  if (phoneMatch) {
    result.tel = phoneMatch[0];
  }

  // Web sitesi tespiti
  const webMatch = text.match(/(www\.|https?:\/\/)[^\s]+/);
  if (webMatch) {
    result.web = webMatch[0];
  }

  // İsim tespiti (basit yaklaşım)
  for (const line of lines) {
    const cleanLine = line.trim();
    if (cleanLine && !cleanLine.includes('@') && !cleanLine.includes('www') && 
        !cleanLine.includes('.com') && !/\d/.test(cleanLine) && 
        cleanLine.split(' ').length >= 2 && cleanLine.split(' ').length <= 4) {
      result.name = cleanLine;
      break;
    }
  }

  return result;
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🟢 OCR API http://localhost:${PORT} üzerinden çalışıyor`);
});