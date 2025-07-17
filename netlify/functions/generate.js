const fetch = require('node-fetch');

// The URL of the Vercel proxy server.
const PROXY_URL = 'https://gemini-v0-project.vercel.app/api/generate';

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // The request body from the browser contains the prompt.
        const { prompt } = JSON.parse(event.body);

        if (!prompt) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Prompt is required' }) };
        }

        // Forward the request to the Vercel proxy server.
        const response = await fetch(PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Pass the prompt along in the request body.
            body: JSON.stringify({ prompt: prompt })
        });

        // Get the response from the proxy server.
        const data = await response.json();

        // If the proxy server returned an error, forward that error.
        if (!response.ok) {
            console.error('Proxy Server Error:', data);
            return { statusCode: response.status, body: JSON.stringify(data) };
        }
        
        // Send the successful response from the proxy back to the browser.
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        };

    } catch (error) {
        console.error('Netlify Function Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `An error occurred in the Netlify function: ${error.message}` })
        };
    }
};