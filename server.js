require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.post('/api/generate', async (req, res) => {
    const { prompt } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!apiKey || apiKey === 'YOUR_API_KEY') {
        return res.status(500).json({ error: 'API key not configured on the server.' });
    }

    const requestBody = {
        "contents": [{
            "parts": [{
                "text": `Create a single, self-contained HTML file with modern, responsive, and clean design using inline CSS and JavaScript for the following component. The design should be aesthetically pleasing. Do not use any external libraries or frameworks. The entire output must be a single block of valid HTML code, starting with <!DOCTYPE html>. Component description: ${prompt}`
            }]
        }],
        "generationConfig": { "temperature": 0.4, "topK": 1, "topP": 1, "maxOutputTokens": 8192 },
        "safetySettings": [
            { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
            { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
            { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
            { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
        ]
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini API Error:', errorText);
            return res.status(response.status).json({ error: `Gemini API error: ${errorText}` });
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error('Proxy Server Error:', error);
        res.status(500).json({ error: `Proxy server error: ${error.message}` });
    }
});

app.listen(port, () => {
    console.log(`Proxy server listening at http://localhost:${port}`);
});
