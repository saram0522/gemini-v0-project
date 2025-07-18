console.log('DEBUG: proxy-server/index.js is starting up.');
require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
// Vercel, Render 등 다양한 플랫폼에서 제공하는 PORT 환경 변수를 사용하거나 기본값 3001을 사용합니다.
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// 프록시 요청을 처리할 엔드포인트입니다.
// Netlify 함수가 이 주소로 요청을 보낼 것입니다. (예: https://your-proxy.vercel.app/api/generate)
app.post('/', async (req, res) => {
    const { prompt } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    console.log('DEBUG: API Key loaded:', apiKey ? 'Loaded' : 'Not Loaded');
    console.log('DEBUG: API Key first 5 chars:', apiKey ? apiKey.substring(0, 5) : 'N/A');
    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`;
    console.log('DEBUG: API URL:', apiUrl);

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    // 이 프록시 서버를 배포할 때, GEMINI_API_KEY를 환경 변수로 설정해야 합니다.
    if (!apiKey || apiKey === 'YOUR_API_KEY') {
        return res.status(500).json({ error: 'API key not configured on the proxy server.' });
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

        const data = await response.json();
        console.log('DEBUG: Gemini API Response Status:', response.status);
        console.log('DEBUG: Gemini API Response Data:', data);
        // Gemini API의 응답을 그대로 클라이언트(Netlify 함수)에게 전달합니다.
        res.status(response.status).json(data);

    } catch (error) {
        console.error('Proxy Server Error:', error);
        res.status(500).json({ error: `Proxy server error: ${error.message}` });
    }
});

// Vercel과 같은 서버리스 환경에서는 이 부분이 필요 없을 수 있지만, 일반적인 Node.js 서버를 위해 남겨둡니다.
app.listen(port, () => {
    console.log(`Proxy server listening at http://localhost:${port}`);
});

// Vercel 배포를 위해 app을 export합니다.
module.exports = app;