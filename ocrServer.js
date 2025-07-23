// ocrServer.js
const express = require('express');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const cors = require('cors');
const fs = require('fs');
const { spawn } = require('child_process');

const app = express();
const upload = multer({ dest: 'uploads/' });
app.use(cors());

function runNER(text) {
  return new Promise((resolve, reject) => {
    const py = spawn('python3', ['ner_parser.py']);
    let data = '';

    py.stdout.on('data', (chunk) => {
      data += chunk.toString();
    });

    py.stderr.on('data', (err) => {
      console.error('Python stderr:', err.toString());
    });

    py.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Python exited with code ${code}`));
      }
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(err);
      }
    });

    py.stdin.write(text);
    py.stdin.end();
  });
}

app.post('/ocr', upload.single('image'), async (req, res) => {
  const imagePath = req.file.path;

  try {
    const result = await Tesseract.recognize(imagePath, 'eng');
    const ocrText = result.data.text;

    const nerResult = await runNER(ocrText);

    fs.unlinkSync(imagePath);
    res.json({
      full_text: ocrText,
      name: nerResult.name,
      title: nerResult.title,
      tel: nerResult.tel,
      company: nerResult.company,
      email: nerResult.email,
      address: nerResult.address,
      web: nerResult.web
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'OCR or NER failed', details: err.message });
  }
});

app.listen(3001, () => {
  console.log('🟢 OCR + NER API http://localhost:3001 üzerinden çalışıyor');
});