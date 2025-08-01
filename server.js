const express = require('express');
const multer = require('multer'); // middleware for handling multipart/form-data
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup Gemini API
const genAI = new GoogleGenerativeAI(process.env.API_KEY);

// Memory-based chat storage (for simplicity)
let chatHistory = [];

// Multer setup for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + file.originalname;
        cb(null, uniqueName);
    }
});

const upload = multer({ storage });

// 👇 Serve homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 🔁 Chat endpoint: handles prompt and returns response from Gemini
app.post('/api/chat', async (req, res) => {
    const prompt = req.body.prompt;
    if (!prompt) return res.status(400).json({ error: 'No prompt provided' });

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Save to chat history (for /api/clear)
        chatHistory.push({ role: 'user', content: prompt });
        chatHistory.push({ role: 'bot', content: text });

        res.json({ response: text });
    } catch (error) {
        console.error('Error generating content:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

// 📤 Handle file upload (image only)
app.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('Image uploaded:', req.file.filename);
    res.json({ success: true, filename: req.file.filename });
});

// 🧹 Clear chat endpoint
app.post('/api/clear', (req, res) => {
    chatHistory = [];
    res.json({ success: true });
});

// ▶️ Start server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
