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

    // Reintroduce code generation logic, but with a more refined keyword list
    let isCodeGenerationRequest = false;
    // Refined code keywords - focus on explicit code/UI elements
    const codeKeywords = ["html", "css", "javascript", "js", "code", "markup", "frontend", "ui", "ux", "component", "form", "button", "layout", "page", "section", "card", "modal", "navbar", "footer", "header", "table", "list", "gallery", "grid", "flexbox", "responsive", "style", "element", "structure"];
    const lowerCasePrompt = prompt.toLowerCase();

    for (const keyword of codeKeywords) {
        if (lowerCasePrompt.includes(keyword)) {
            isCodeGenerationRequest = true;
            break;
        }
    }

    let geminiPromptText;
    if (isCodeGenerationRequest) {
        // Specific prompt for code generation
        geminiPromptText = `Create a single, self-contained HTML file with modern, responsive, and clean design using inline CSS and JavaScript for the following component. Do not use any external libraries or frameworks. The entire output must be a single block of valid HTML code, starting with <!DOCTYPE html>. Component description: ${prompt}`;
    } else {
        // For general conversation, just pass the prompt as is.
        geminiPromptText = prompt;
    }

    // Use the non-streaming generateContent endpoint
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

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

        // Parse the non-streaming JSON response
        const data = await response.json(); // Use response.json() directly
        let fullContent = '';

        if (data.candidates && Array.isArray(data.candidates) && data.candidates.length > 0) {
            if (data.candidates[0].content && Array.isArray(data.candidates[0].content.parts) && data.candidates[0].content.parts.length > 0) {
                fullContent = data.candidates[0].content.parts[0].text;
            }
        }

        res.status(200).json({ text: fullContent, isCode: isCodeGenerationRequest }); // Send isCode flag

    } catch (error) {
        console.error('Serverless Function Error:', error);
        console.log('Caught general error');
        res.status(500).json({ error: `Serverless function error: ${error.message}` });
    }
};