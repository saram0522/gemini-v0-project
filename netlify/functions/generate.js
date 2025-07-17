const fetch = require('node-fetch');

exports.handler = async (event) => {
    // This is a temporary diagnostic function.
    // It calls a public test API instead of the Gemini API
    // to check if the Netlify function itself is working correctly.
    const testApiUrl = 'https://jsonplaceholder.typicode.com/todos/1';

    try {
        const response = await fetch(testApiUrl, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Test API Error:', errorText);
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: `Test API error: ${errorText}` })
            };
        }

        const data = await response.json();

        // Mimic the Gemini response structure so the frontend can display it.
        const mockGeminiResponse = {
            candidates: [{
                content: {
                    parts: [{
                        text: ````html\n<!-- Test successful! Received data: -->\n<pre>${JSON.stringify(data, null, 2)}</pre>\n````
                    }]
                }
            }]
        };

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mockGeminiResponse)
        };

    } catch (error) {
        console.error('Function Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `An error occurred in the function: ${error.message}` })
        };
    }
};