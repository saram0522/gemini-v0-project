require('dotenv').config();
const fetch = require('node-fetch');

// Vercel 서버리스 함수는 req, res를 인자로 받는 단일 함수를 export합니다.
module.exports = async (req, res) => {
    // Vercel에서는 CORS 설정을 vercel.json에서 하는 것을 권장합니다.
    // 여기서는 모든 출처를 허용하도록 헤더를 설정합니다.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // OPTIONS 요청(preflight)에 대한 처리
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // POST 요청이 아닌 경우
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    console.log('DEBUG: Request received at /api/generate');

    const { prompt } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    console.log('DEBUG: API Key loaded:', apiKey ? 'Loaded' : 'Not Loaded');
    console.log('DEBUG: API Key first 5 chars:', apiKey ? apiKey.substring(0, 5) : 'N/A');

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
    console.log('DEBUG: API URL:', apiUrl);

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

        const data = await response.json();
        console.log('DEBUG: Gemini API Response Status:', response.status);
        // console.log('DEBUG: Gemini API Response Data:', data); // 너무 길어서 주석 처리

        // Gemini API의 응답을 그대로 클라이언트에게 전달합니다.
        res.status(response.status).json(data);

    } catch (error) {
        console.error('Serverless Function Error:', error);
        res.status(500).json({ error: `Serverless function error: ${error.message}` });
    }
};