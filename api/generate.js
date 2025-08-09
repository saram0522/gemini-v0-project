const fetch = require('node-fetch');

module.exports = async (req, res) => {
    console.log('Function started');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { prompt } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!prompt || !apiKey) {
        return res.status(400).json({ error: 'Prompt and API key are required' });
    }

    
    

    

    let geminiPromptText = prompt;

    // 스트리밍을 위해 :streamGenerateContent 엔드포인트 사용
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:streamGenerateContent?key=${apiKey}`;

    console.log('Before fetch call');

    const requestBody = {
        "contents": [{
            "parts": [{
                "text": geminiPromptText
            }]
        }],
        "generationConfig": { "temperature": 0.7, "topK": 40, "topP": 0.95, "maxOutputTokens": 8192 },
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

        console.log('After fetch call');

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini API Error:', errorText);
            console.log('Response not OK');
            return res.status(response.status).json({ error: `Gemini API error: ${errorText}` });
        }

        // 스트리밍 응답을 위해 Content-Type을 text/event-stream으로 설정
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Gemini API 응답 스트림을 클라이언트로 직접 파리핑
        response.body.pipe(res);

    } catch (error) {
        console.error('Serverless Function Error:', error);
        console.log('Caught general error');
        res.status(500).json({ error: `Serverless function error: ${error.message}` });
    }
};