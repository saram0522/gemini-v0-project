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

    let codeRequestType = 'none'; // none, html, python, etc.
    const lowerCasePrompt = prompt.toLowerCase();

    // Check for renderable code (HTML/CSS/JS)
    const renderableKeywords = ["html", "css", "javascript", "js", "component", "form", "button", "layout", "page", "section", "card", "modal", "navbar", "footer", "header", "table", "list", "gallery", "grid", "flexbox", "responsive", "style", "element", "structure"];
    for (const keyword of renderableKeywords) {
        if (lowerCasePrompt.includes(keyword)) {
            codeRequestType = 'html';
            break;
        }
    }

    // If not renderable, check for other code types
    if (codeRequestType === 'none') {
        const otherCodeKeywords = { // Add more languages as needed
            'python': ["python", "py"],
            'javascript': ["javascript", "js"]
        };

        for (const [type, keywords] of Object.entries(otherCodeKeywords)) {
            for (const keyword of keywords) {
                if (lowerCasePrompt.includes(keyword)) {
                    codeRequestType = type;
                    break;
                }
            }
            if (codeRequestType !== 'none') break;
        }
    }

    let geminiPromptText;
    if (codeRequestType === 'html') {
        geminiPromptText = `Create a single, self-contained HTML file with modern, responsive, and clean design using inline CSS and JavaScript for the following component. Do not use any external libraries or frameworks. The entire output must be a single block of valid HTML code, starting with <!DOCTYPE html>. Component description: ${prompt}`;
    } else if (codeRequestType !== 'none') {
        geminiPromptText = `Generate a code snippet for the following prompt in ${codeRequestType}. Only output the code, without any explanation or markdown formatting.`;
    } else {
        geminiPromptText = prompt;
    }

    // Use the non-streaming generateContent endpoint
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

        // Send initial JSON with isCode flag
        res.write(JSON.stringify({ codeType: codeRequestType }) + '\n');

        const decoder = new TextDecoder();
        let buffer = '';

        for await (const chunk of response.body) {
            buffer += decoder.decode(chunk, { stream: true });
            let jsonStartIndex;
            while ((jsonStartIndex = buffer.indexOf('{')) !== -1) {
                let jsonEndIndex = -1;
                let openBraceCount = 0;
                for (let i = jsonStartIndex; i < buffer.length; i++) {
                    if (buffer[i] === '{') {
                        openBraceCount++;
                    } else if (buffer[i] === '}') {
                        openBraceCount--;
                    }
                    if (openBraceCount === 0 && buffer[i] === '}') {
                        jsonEndIndex = i;
                        break;
                    }
                }
                if (jsonEndIndex !== -1) {
                    const jsonString = buffer.substring(jsonStartIndex, jsonEndIndex + 1);
                    try {
                        const json = JSON.parse(jsonString);
                        if (json.candidates && json.candidates[0].content.parts[0].text) {
                            res.write(JSON.stringify({ text: json.candidates[0].content.parts[0].text }) + '\n');
                        }
                        buffer = buffer.substring(jsonEndIndex + 1).trim();
                    } catch (e) {
                        break; // Incomplete JSON or parsing error, wait for next chunk
                    }
                } else {
                    break; // No complete JSON object found, wait for next chunk
                }
            }
        }
        res.end();

    } catch (error) {
        console.error('Serverless Function Error:', error);
        console.log('Caught general error');
        res.status(500).json({ error: `Serverless function error: ${error.message}` });
    }
};