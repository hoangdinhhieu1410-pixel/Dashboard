/**
 * ===================================================================
 * TELEGRAM.JS - Gửi Telegram + Phân tích AI Gemini
 * ===================================================================
 */

const TelegramService = (() => {
    /** Gửi tin nhắn qua Telegram Bot API */
    async function send(token, chatId, text) {
        if (!token || !chatId || !text) throw new Error('Thiếu token, chatId hoặc text');
        const url = `https://api.telegram.org/bot${token}/sendMessage`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true })
        });
        const data = await res.json();
        if (!data.ok) throw new Error('Telegram: ' + (data.description || 'Lỗi'));
        return data;
    }

    return { send };
})();

const GeminiService = (() => {
    /** Gọi Gemini API phân tích dữ liệu */
    async function analyze(apiKey, prompt) {
        if (!apiKey) throw new Error('Chưa cấu hình Gemini API Key');
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI.MODEL}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: CONFIG.GEMINI.MAX_TOKENS, temperature: CONFIG.GEMINI.TEMPERATURE }
            })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error('Gemini: ' + (err?.error?.message || 'HTTP ' + res.status));
        }
        const data = await res.json();
        if (!data.candidates?.length) throw new Error('Gemini không trả kết quả');
        return data.candidates[0].content.parts.map(p => p.text || '').join('');
    }

    /** Tạo prompt phân tích cho 1 trang */
    function buildPrompt(pageName, dataSample) {
        return `Bạn là chuyên gia phân tích vận hành B2B logistics cho Giao Hàng Nhanh.
Phân tích NGẮN GỌN (tối đa 5 gạch đầu dòng) dữ liệu mẫu thuộc hạng mục "${pageName}".
Đưa ra: 1) Tình hình chung  2) Điểm cần chú ý  3) Đề xuất hành động cụ thể.
Viết bằng tiếng Việt, ngắn gọn, dễ hiểu.

Dữ liệu mẫu (${dataSample.length} dòng đầu):
${JSON.stringify(dataSample.slice(0, 10), null, 0)}`;
    }

    return { analyze, buildPrompt };
})();
