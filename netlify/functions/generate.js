// 최종 진단용 함수: 외부 API 호출 없이, 단순히 메시지만 반환합니다.
exports.handler = async (event) => {
    try {
        // 프론트엔드가 예상하는 Gemini API 응답 구조를 흉내냅니다.
        const mockResponse = {
            candidates: [{
                content: {
                    parts: [{
                        text: "```html\n<h1>Hello from Netlify!</h1>\n<p>If you can see this, the function is running correctly.</p>\n```"
                    }]
                }
            }]
        };

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mockResponse)
        };

    } catch (error) {
        // 이 코드는 거의 실행될 일이 없지만, 만약을 위해 남겨둡니다.
        console.error('Basic Function Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'The most basic function failed.' })
        };
    }
};
