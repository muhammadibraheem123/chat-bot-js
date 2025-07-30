require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ✅ Check API key
if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY not found in .env file!");
    process.exit(1);
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

app.post('/api/chat', async (req, res) => {
    const userPrompt = req.body.prompt?.trim();
    console.log("📩 Prompt received:", userPrompt);

    if (!userPrompt) {
        return res.json({ response: "⚠️ Prompt cannot be empty." });
    }

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "You are a helpful assistant." },
                { role: "user", content: userPrompt }
            ],
        });

        const aiReply = response.choices[0].message.content;
        console.log("🤖 ChatGPT Response:", aiReply);

        res.json({ response: aiReply });
    } catch (e) {
        console.error("❌ Error from OpenAI:", e.message);

        if (e.message.includes('429')) {
            res.json({ response: "🚫 Rate limit exceeded. Please try again later." });
        } else if (e.message.includes('503')) {
            res.json({ response: "⏳ OpenAI API is temporarily unavailable. Try again later." });
        } else {
            res.json({ response: `❗ Unexpected error: ${e.message}` });
        }
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
