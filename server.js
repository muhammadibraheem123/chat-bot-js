require('dotenv').config(); // 1️⃣ Load .env file to get API key
const express = require('express'); // 2️⃣ Import Express
const cors = require('cors'); // 3️⃣ Import CORS (allows browser to call server)
const { GoogleGenerativeAI } = require('@google/generative-ai'); // 4️⃣ Gemini SDK
const multer = require('multer'); // 📸 For handling image uploads
const fs = require('fs'); // 📁 To read/delete uploaded image files

const app = express(); // 5️⃣ Create Express app   

// 6️⃣ Middlewares
app.use(cors()); // Allow cross-origin requests
app.use(express.json()); // Parse JSON bodies
app.use(express.static('public')); // Serve frontend files (HTML, CSS, JS)

// 7️⃣ Image Upload Config
const upload = multer({ dest: 'uploads/' }); // Store image files temporarily in upl=oads/

// ✅ Check for API key
if (!process.env.GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY not found in .env file!");
    process.exit(1); // Stop server if no key
}

// 🔐 Set the Gemini API key 
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 🧠 Use the Gemini 1.5 Pro model
const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

// 🔀 Chat memory (resets on server restart)
let chatHistory = []; // 🧠 Store all messages between user and model
let allChats = []; // ⬆️ New: Store each chat session

// 🚀 Chat endpoint: Accepts prompt and optionally image
app.post('/api/chat', upload.single('image'), async (req, res) => {
    const userPrompt = req.body.prompt?.trim(); // 🔹 Get prompt from request
    const imageFile = req.file; // 🔹 Get uploaded image (if any)

    console.log("📩 Prompt:", userPrompt);
    if (imageFile) console.log("🖼️ Image received:", imageFile.originalname);

    // ❗ Validation: Require at least prompt or image
    if (!userPrompt && !imageFile) {
        return res.json({ response: "⚠️ Please provide a prompt or an image." });
    }

    try {
        let parts = [];

        // 🌤️ Add user text prompt if available
        if (userPrompt) {
            parts.push({ text: userPrompt });
        }

        // 🖼️ If image is uploaded, convert to base64 and add
        if (imageFile) {
            const imageBuffer = fs.readFileSync(imageFile.path);
            const base64Image = imageBuffer.toString('base64');

            parts.push({
                inlineData: {
                    mimeType: imageFile.mimetype,
                    data: base64Image,
                },
            });

            fs.unlinkSync(imageFile.path); // 🧹 Clean up image after use
        }

        // 🧠 Save current user message to memory
        chatHistory.push({
            role: "user",
            parts: parts
        });

        // 💬 Send entire memory to Gemini
        const result = await model.generateContent({
            contents: chatHistory
        });

        // 📬 Extract and return Gemini's reply
        const aiReply = result.response.text();
        console.log("🤖 Gemini Response:", aiReply);

        // 🧠 Add AI response to memory
        chatHistory.push({
            role: "model",
            parts: [{ text: aiReply }]
        });

        res.json({ response: aiReply });

    } catch (error) {
        const status = error.response?.status;
        const message = error.message || 'Unknown error';

        console.error("❌ Gemini API Error:", message);

        if (status === 429 || message.includes('429')) {
            res.json({ response: "🚫 You have exceeded the API usage limit. Please wait a moment and try again." });
        } else if (status === 403 || message.includes('403')) {
            res.json({ response: "⚠️ Access denied. Please check your API key and billing status." });
        } else if (status === 503 || message.includes('503')) {
            res.json({ response: "⏳ The service is temporarily unavailable. Please try again later." });
        } else {
            res.json({ response: "❗ An unexpected error occurred. Please try again later." });
        }
    }
});

// 🖑️ Clear chat memory endpoint
app.post('/api/clear', (req, res) => {
    chatHistory = [];
    console.log("🧹 Chat history cleared.");
    res.json({ success: true, message: "Chat memory cleared." });
});

// ⬆️ Save current chat to allChats (optional, just for completeness)
app.post('/api/save-chat', (req, res) => {
    if (chatHistory.length > 0) {
        allChats.push([...chatHistory]);
        chatHistory = [];
        res.json({ success: true, message: "Chat saved." });
    } else {
        res.json({ success: false, message: "No chat to save." });
    }
});

// 📂 Endpoint to get all saved chats (for sidebar display)
app.get('/api/chats', (req, res) => {
    res.json({ chats: allChats });
});

// 🎧 Server starts listening
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
