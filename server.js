// index.js

// ─── Imports ─────────────────────────────────────────────
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const sharp = require('sharp');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ─── Environment Setup ───────────────────────────────────
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ──────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── Gemini API Setup ────────────────────────────────────
if (!process.env.GEMINI_API_KEY) {
    console.error("❌ Missing GEMINI_API_KEY in .env");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─── Chat Route ──────────────────────────────────────────
app.post('/chat', async (req, res) => {
    const { message, images = [], history = [] } = req.body;

    console.log("📥 Prompt received:", message);
    if (images.length > 0) console.log(`🖼️ ${images.length} image(s) received.`);

    try {
        // ── Image Resize Logic ──────────────────────────────
        const resizeRegex = /resize\s+to\s+(\d+)\s*[x×]\s*(\d+)/i;
        const match = message?.match(resizeRegex);

        if (match && images.length > 0) {
            const width = parseInt(match[1]);
            const height = parseInt(match[2]);

            const resizedImages = await Promise.all(images.map(async (base64) => {
                const buffer = Buffer.from(base64, 'base64');
                const resized = await sharp(buffer)
                    .resize(width, height)
                    .toFormat('jpeg')
                    .toBuffer();
                return resized.toString('base64');
            }));

            return res.json({
                reply: `✅ Image(s) resized to ${width}×${height}.`,
                resizedImages,
            });
        }

        // ── Gemini Chat with or without Image ───────────────
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const chatHistory = history.map(msg => ({
            role: msg.role === "bot" ? "model" : "user",
            parts: [{ text: msg.content }]
        }));

        const parts = [];

        if (Array.isArray(images) && images.length > 0) {
            parts.push(...images.map(base64 => ({
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: base64
                }
            })));
        }

        if (message) {
            parts.push({ text: message });
        }

        const contents = [...chatHistory, { role: 'user', parts }];

        const result = await model.generateContent({ contents });
        const response = result?.response?.text?.();

        if (!response) {
            console.warn("⚠️ Empty response from Gemini.");
            return res.status(429).json({ reply: "⚠️ No response. You may have hit a usage limit or quota." });
        }

        console.log("🤖 Gemini response:", response);
        res.json({ reply: response });

    } catch (error) {
        console.error("🔥 Gemini API Error:", error.message || error);

        const msg = (error.message || "").toLowerCase();
        if (msg.includes("quota") || msg.includes("exceeded") || msg.includes("429")) {
            return res.status(429).json({ reply: "⚠️ Quota limit reached. Try again later or use another API key." });
        }

        if (msg.includes("overloaded") || msg.includes("503")) {
            return res.status(503).json({ reply: "⚠️ Gemini is overloaded. Try again soon." });
        }

        res.status(500).json({ reply: `❌ Gemini error: ${error.message || "Unknown error"}` });
    }
});

// ─── Start Server ────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
