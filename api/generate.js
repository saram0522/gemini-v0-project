require('dotenv').config();
const fetch = require('node-fetch');

module.exports = async (req, res) => {
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

    let isCodeGenerationRequest = false;
    const codeKeywords = ["create", "generate", "html", "component", "design", "form", "button", "layout", "page", "section", "card", "modal", "navbar", "footer", "header", "table", "list", "gallery", "grid", "flexbox", "responsive", "style", "css", "javascript", "js", "interactive", "animation", "effect", "element", "structure", "build", "make", "develop", "implement", "code", "markup", "frontend", "ui", "ux"];
    const lowerCasePrompt = prompt.toLowerCase();

    for (const keyword of codeKeywords) {
        if (lowerCasePrompt.includes(keyword)) {
            isCodeGenerationRequest = true;
            break;
        }
    }

    let geminiPromptText;
    if (isCodeGenerationRequest) {
        geminiPromptText = `Create a single, self-contained HTML file with modern, responsive, and clean design using inline CSS and JavaScript for the following component. Do not use any external libraries or frameworks. The entire output must be a single block of valid HTML code, starting with <!DOCTYPE html>. Component description: ${prompt}`;
    } else {
        geminiPromptText = prompt; // For general conversation, just pass the prompt as is.
    }

    // 스트리밍을 위해 :streamGenerateContent 엔드포인트 사용
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:streamGenerateContent?key=${apiKey}`;

    const requestBody = {
        "contents": [{
            "parts": [{
                "text": geminiPromptText
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

        // 스트리밍 응답을 위해 Content-Type을 text/event-stream으로 설정
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // 응답 스트림을 클라이언트로 파이핑
        const decoder = new TextDecoder();        let buffer = '';        for await (const chunk of response.body) {            buffer += decoder.decode(chunk, { stream: true });            // 완전한 JSON 객체를 찾아서 처리            let jsonStartIndex;            while ((jsonStartIndex = buffer.indexOf('{')) !== -1) {                let jsonEndIndex = -1;                let openBraceCount = 0;                for (let i = jsonStartIndex; i < buffer.length; i++) {                    if (buffer[i] === '{') {                        openBraceCount++;                    } else if (buffer[i] === '}') {                        openBraceCount--;                    }                    if (openBraceCount === 0 && buffer[i] === '}') {                        jsonEndIndex = i;                        break;                    }                }                if (jsonEndIndex !== -1) {                    const jsonString = buffer.substring(jsonStartIndex, jsonEndIndex + 1);                    try {                        const json = JSON.parse(jsonString);                        res.write(JSON.stringify(json) + '\n'); // 각 JSON 객체를 줄바꿈으로 구분하여 전송                        buffer = buffer.substring(jsonEndIndex + 1).trim();                    } catch (e) {                        // 불완전한 JSON이거나 파싱 오류, 다음 청크를 기다림                        break;                    }                } else {                    // 완전한 JSON 객체를 찾지 못함, 다음 청크를 기다림                    break;                }            }        }        res.end();

    } catch (error) {
        console.error('Serverless Function Error:', error);
        res.status(500).json({ error: `Serverless function error: ${error.message}` });
    }
};