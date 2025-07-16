const fetch = require('node-fetch');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { prompt } = JSON.parse(event.body);
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey || apiKey === 'YOUR_API_KEY') {
            return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured on the server.' }) };
        }

        // Use the streaming endpoint for Gemini
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:streamGenerateContent?key=${apiKey}&alt=sse`;

        const requestBody = {
            contents: [{
                parts: [{
                    text: `Create a single, self-contained HTML file with modern, responsive, and clean design using inline CSS and JavaScript for the following component. The design should be aesthetically pleasing. Do not use any external libraries or frameworks. The entire output must be a single block of valid HTML code, starting with <!DOCTYPE html>. Component description: ${prompt}`
                }]
            }],
            generationConfig: { temperature: 0.4, topK: 1, topP: 1, maxOutputTokens: 8192 },
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            ]
        };

        const geminiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        // Return the stream from Gemini directly to the client
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
            body: geminiResponse.body // This is a ReadableStream
        };

    } catch (error) {
        console.error('Function Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `An error occurred in the function: ${error.message}` })
        };
    }
};
