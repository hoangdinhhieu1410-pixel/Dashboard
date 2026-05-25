/**
 * ===================================================================
 * CONFIG.JS - Cấu hình Dashboard B2B Giao Hàng Nhanh
 * ===================================================================
 * Chỉnh sửa các giá trị trong file này để thay đổi ngưỡng đánh giá,
 * URL dữ liệu, token Telegram, v.v.
 * ===================================================================
 */

const CONFIG = {
    // ===================== GOOGLE SHEETS =====================
    SHEET_ID: '1_scZljYPAEaP9Uf5zuMLvGvLo2sib98WyqFzLbvxb2I',

    // Ánh xạ menuKey → GID của từng sheet tab
    SHEETS: {
        'nang-suat':         { gid: 0,            name: 'Data năng suất' },
        'con-cung':          { gid: 1312986221,   name: 'Con cưng' },
        'data-push':         { gid: 1504388847,   name: 'Push giao B2B' },
        'data-ton':          { gid: 426449690,    name: 'Data tồn 3 ngày' },
        'canh-bao':          { gid: 1533780219,   name: 'Data cảnh báo' },
        'data-gtc':          { gid: 1594571780,   name: 'Data GTC' },
        'gan-ontime':        { gid: 480102568,    name: 'Gán Ontime' },
        'ontime-toan-trinh': { gid: 57386343,     name: 'Ontime toàn trình' },
        'luong-nvxl':        { gid: 184168157,    name: 'Lương NVXL' },
        'don-tao':           { gid: 470624134,    name: 'Đơn tạo' },
        'tra-hang':          { gid: 80724180,     name: 'Trả hàng' },
    },

    // ===================== NGƯỠNG ĐÁNH GIÁ =====================
    // (Thay đổi số để điều chỉnh tiêu chí xếp hạng)
    THRESHOLDS: {
        GTC_GOOD:      90,   // Tỷ lệ GTC ≥ 90% → Tốt (🟢)
        GTC_WARN:      75,   // Tỷ lệ GTC 75-90% → Trung bình (🟡)
        // Dưới 75% → Kém (🔴)

        ONTIME_GOOD:   90,   // Ontime ≥ 90% → Tốt
        ONTIME_WARN:   75,   // Ontime 75-90% → TB

        TON_NGAY_WARN: 5,    // Tồn ≥ 5 ngày → Báo động
        TY_LE_WARN:    60,   // Tỷ lệ giao/trả ≤ 60% → Báo động

        TRA_GOOD:      5,    // % trả ≤ 5% → Tốt
        TRA_WARN:      15,   // % trả 5-15% → TB, > 15% → Kém

        DON_TAO_TANG:  20,   // Đơn tạo tăng > 20% → Cảnh báo
        DON_TAO_ON:    5,    // ± 5% → Ổn định

        LUONG_BAT_THUONG: 3, // Chi phí/thao tác > 3x TB → Bất thường
        LUONG_THEO_DOI:   2, // Chi phí/thao tác 2-3x TB → Theo dõi
    },

    // ===================== TELEGRAM =====================
    TELEGRAM: {
        DEFAULT_TOKEN:   '8646169114:AAH8t3VhB4IKJzy8rm2Wp81RqNPPhKgdlcQ',
        DEFAULT_CHAT_ID: '5939351089',
    },

    // ===================== GEMINI AI =====================
    GEMINI: {
        MODEL: 'gemini-2.0-flash',
        MAX_TOKENS: 2048,
        TEMPERATURE: 0.7,
    },

    // ===================== GIAO DIỆN =====================
    UI: {
        MAX_TABLE_ROWS: 200,    // Giới hạn số dòng hiển thị trong bảng
        FETCH_TIMEOUT:  20000,  // Timeout lấy dữ liệu (20 giây)
        CACHE_DURATION: 300000, // Cache dữ liệu 5 phút
    },

    // Link Google Sheet gốc
    SHEET_URL: 'https://docs.google.com/spreadsheets/d/1_scZljYPAEaP9Uf5zuMLvGvLo2sib98WyqFzLbvxb2I/edit?hl=vi',
};
