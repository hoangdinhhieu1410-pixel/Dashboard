/**
 * ===================================================================
 * UI.JS - Xử lý giao diện Dashboard
 * ===================================================================
 * Menu, modal, loading, bộ lọc, accordion, helper functions
 * ===================================================================
 */

// =====================================================================
// H - HELPER FUNCTIONS (được dùng bởi pages.js)
// =====================================================================
const H = {
    /** Parse số từ bất kỳ kiểu nào */
    num(v) {
        if (v === null || v === undefined || v === '') return 0;
        if (typeof v === 'number') return v;
        const s = String(v).replace(/[,%đ\s]/g, '').replace(/\./g, '');
        const n = parseFloat(s);
        return isNaN(n) ? 0 : n;
    },

    /** Format số có dấu phẩy phân cách hàng nghìn */
    fmt(n) {
        if (n === null || n === undefined) return '--';
        return Math.round(H.num(n)).toLocaleString('vi-VN');
    },

    /** Format phần trăm */
    pct(n) {
        if (n === null || n === undefined) return '--';
        return H.num(n).toFixed(1) + '%';
    },

    /** Format tiền VNĐ */
    fmtMoney(n) {
        if (n === null || n === undefined) return '--';
        return Math.round(H.num(n)).toLocaleString('vi-VN') + 'đ';
    },

    /** Gom nhóm mảng object theo key */
    groupBy(arr, key) {
        const map = {};
        arr.forEach(item => {
            const k = item[key] || 'Khác';
            if (!map[k]) map[k] = [];
            map[k].push(item);
        });
        return map;
    },

    /** Tổng 1 cột số */
    sumCol(arr, key) {
        return arr.reduce((s, r) => s + H.num(r[key]), 0);
    },

    /** Trung bình 1 cột số */
    avgCol(arr, key) {
        if (!arr.length) return 0;
        return H.sumCol(arr, key) / arr.length;
    },

    /** Unique values của 1 cột */
    uniqueVals(arr, key) {
        const set = new Set();
        arr.forEach(r => { if (r[key] != null && r[key] !== '') set.add(r[key]); });
        return Array.from(set).sort();
    },

    /** Tìm tên cột gần giống trong 1 row (case-insensitive, trim) */
    findCol(row, names) {
        if (!row) return null;
        const keys = Object.keys(row);
        for (const name of names) {
            const lower = name.toLowerCase().trim();
            const found = keys.find(k => k.toLowerCase().trim() === lower);
            if (found) return found;
        }
        // Tìm partial match
        for (const name of names) {
            const lower = name.toLowerCase().trim();
            const found = keys.find(k => k.toLowerCase().trim().includes(lower) || lower.includes(k.toLowerCase().trim()));
            if (found) return found;
        }
        return null;
    },

    /** Lấy giá trị từ row, tìm cột theo nhiều tên có thể */
    getVal(row, names) {
        const col = H.findCol(row, names);
        return col ? row[col] : null;
    },

    /** Badge class dựa trên giá trị (cao = tốt) */
    badge(val, good, warn) {
        const v = H.num(val);
        if (v >= good) return 'success';
        if (v >= warn) return 'warning';
        return 'danger';
    },

    /** Badge class ngược (thấp = tốt, VD: trả hàng) */
    badgeReverse(val, good, warn) {
        const v = H.num(val);
        if (v <= good) return 'success';
        if (v <= warn) return 'warning';
        return 'danger';
    },

    /** Tính trend so sánh */
    trend(current, previous) {
        const c = H.num(current), p = H.num(previous);
        if (!p) return { cls: 'trend-stable', text: '--' };
        const diff = ((c - p) / p * 100).toFixed(1);
        if (diff > 0) return { cls: 'trend-up', text: '+' + diff + '%' };
        if (diff < 0) return { cls: 'trend-down', text: diff + '%' };
        return { cls: 'trend-stable', text: '0%' };
    },

    /** Tính tỷ lệ phần trăm an toàn */
    safePct(numerator, denominator) {
        const n = H.num(numerator), d = H.num(denominator);
        if (!d) return 0;
        return (n / d) * 100;
    },
};

// =====================================================================
// UI CONTROLLER
// =====================================================================
const UI = (() => {
    let _currentMenu = 'tong-quan';
    let _settings = {};

    // ---- KHỞI ĐỘNG ----
    function init() {
        _loadSettings();
        _bindEvents();
        navigateTo('tong-quan');
    }

    // ---- LOAD/SAVE SETTINGS ----
    function _loadSettings() {
        try {
            _settings = JSON.parse(localStorage.getItem('ghn_settings') || '{}');
        } catch (e) { _settings = {}; }

        // Điền giá trị mặc định
        if (!_settings.tgToken) _settings.tgToken = CONFIG.TELEGRAM.DEFAULT_TOKEN;
        if (!_settings.tgChat) _settings.tgChat = CONFIG.TELEGRAM.DEFAULT_CHAT_ID;

        // Cập nhật UI AI status
        _updateAIStatus();
    }

    function _saveSettings() {
        const token = document.getElementById('inp-tg-token').value.trim();
        const chat = document.getElementById('inp-tg-chat').value.trim();
        const gemini = document.getElementById('inp-gemini').value.trim();
        _settings.tgToken = token || CONFIG.TELEGRAM.DEFAULT_TOKEN;
        _settings.tgChat = chat || CONFIG.TELEGRAM.DEFAULT_CHAT_ID;
        _settings.geminiKey = gemini || '';
        localStorage.setItem('ghn_settings', JSON.stringify(_settings));
        _updateAIStatus();
        _closeModal();
        alert('✅ Đã lưu cấu hình thành công!');
    }

    function getSettings() { return _settings; }

    function _updateAIStatus() {
        const el = document.getElementById('ai-status');
        if (_settings.geminiKey) {
            el.innerHTML = '<span class="material-icons-outlined">smart_toy</span><span>AI Sẵn sàng</span>';
            el.style.background = '#ECFDF5';
            el.style.color = '#059669';
        } else {
            el.innerHTML = '<span class="material-icons-outlined">smart_toy</span><span>AI Chưa có key</span>';
            el.style.background = '#FFFBEB';
            el.style.color = '#D97706';
        }
    }

    // ---- MODAL ----
    function _openModal() {
        document.getElementById('modal-settings').classList.remove('hidden');
        document.getElementById('inp-tg-token').value = _settings.tgToken || '';
        document.getElementById('inp-tg-chat').value = _settings.tgChat || '';
        document.getElementById('inp-gemini').value = _settings.geminiKey || '';
    }

    function _closeModal() {
        document.getElementById('modal-settings').classList.add('hidden');
    }

    // ---- LOADING ----
    function showLoading() { document.getElementById('loading').classList.remove('hidden'); }
    function hideLoading() { document.getElementById('loading').classList.add('hidden'); }

    // ---- NAVIGATION ----
    async function navigateTo(menuKey) {
        _currentMenu = menuKey;

        // Cập nhật menu active
        document.querySelectorAll('.menu-item').forEach(el => {
            el.classList.toggle('active', el.dataset.target === menuKey);
        });

        // Cập nhật tiêu đề
        const titles = {
            'tong-quan': '📊 Tổng quan',
            'nang-suat': '👷 Năng suất nhân viên',
            'con-cung': '🏪 Con Cưng',
            'data-push': '📦 Push giao B2B',
            'data-ton': '📋 Data tồn 3 ngày',
            'canh-bao': '⚠️ Data cảnh báo',
            'data-gtc': '✅ Data GTC',
            'gan-ontime': '⏱️ Gán Ontime',
            'ontime-toan-trinh': '🎯 Ontime toàn trình',
            'luong-nvxl': '💰 Lương NVXL',
            'don-tao': '📈 Đơn tạo',
            'tra-hang': '📦 Trả hàng',
        };
        document.getElementById('page-title').textContent = titles[menuKey] || menuKey;

        // Đóng sidebar trên mobile
        document.getElementById('sidebar').classList.remove('open');

        // Load dữ liệu
        const container = document.getElementById('page-container');
        container.innerHTML = '';
        Charts.destroyAll();

        showLoading();
        try {
            let data = [];
            if (menuKey !== 'tong-quan') {
                data = await DataService.fetchSheet(menuKey);
            }
            hideLoading();

            if (typeof Pages !== 'undefined' && Pages.render) {
                Pages.render(menuKey, data, container);
            } else {
                container.innerHTML = '<div class="card"><p>Đang tải module trang...</p></div>';
            }
        } catch (err) {
            hideLoading();
            container.innerHTML = `
                <div class="alert alert-danger">
                    <strong>❌ Lỗi tải dữ liệu</strong><br>
                    ${err.message || 'Lỗi không xác định'}
                    <br><br>
                    <strong>💡 Gợi ý khắc phục:</strong>
                    <ol style="margin-top:8px;padding-left:20px">
                        <li>Kiểm tra kết nối mạng internet</li>
                        <li>Mở Google Sheets → Bấm "Chia sẻ" → Chọn "Bất kỳ ai có liên kết"</li>
                        <li>Bấm nút "Cập nhật Data" để thử lại</li>
                    </ol>
                </div>`;
        }
    }

    // ---- REFRESH ----
    async function refreshData() {
        DataService.clearCache();
        await navigateTo(_currentMenu);
    }

    // ---- SEND TELEGRAM ----
    async function sendTelegram() {
        if (!_settings.tgToken || !_settings.tgChat) {
            alert('⚠️ Chưa cấu hình Telegram. Vào Cài đặt ⚙️ để nhập token và chat ID.');
            return;
        }

        try {
            showLoading();
            const now = new Date().toLocaleString('vi-VN');
            let msg = `<b>📊 BÁO CÁO DASHBOARD GHN B2B</b>\n`;
            msg += `<i>${now}</i>\n\n`;
            msg += `🔗 <a href="${CONFIG.SHEET_URL}">Data Google Sheets</a>\n\n`;
            msg += `📌 Trang hiện tại: <b>${_currentMenu}</b>\n`;

            // Nếu có AI key, thêm phân tích
            if (_settings.geminiKey && _currentMenu !== 'tong-quan') {
                try {
                    const data = await DataService.fetchSheet(_currentMenu);
                    const analysis = await GeminiService.analyze(
                        _settings.geminiKey,
                        GeminiService.buildPrompt(_currentMenu, data)
                    );
                    msg += `\n<b>🤖 Phân tích AI:</b>\n${analysis}`;
                } catch (e) {
                    msg += `\n⚠️ Không thể phân tích AI: ${e.message}`;
                }
            }

            await TelegramService.send(_settings.tgToken, _settings.tgChat, msg);
            hideLoading();
            alert('✅ Đã gửi báo cáo vào Telegram thành công!');
        } catch (err) {
            hideLoading();
            alert('❌ Gửi Telegram thất bại: ' + err.message);
        }
    }

    // ---- BIND EVENTS ----
    function _bindEvents() {
        // Menu click
        document.querySelectorAll('.menu-item').forEach(el => {
            el.addEventListener('click', () => navigateTo(el.dataset.target));
        });

        // Header buttons
        document.getElementById('btn-refresh').addEventListener('click', refreshData);
        document.getElementById('btn-telegram').addEventListener('click', sendTelegram);
        document.getElementById('btn-settings').addEventListener('click', _openModal);
        document.getElementById('btn-save-settings').addEventListener('click', _saveSettings);
        document.getElementById('modal-backdrop').addEventListener('click', _closeModal);

        // Sidebar toggle mobile
        document.getElementById('btn-sidebar').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
        });
    }

    // ---- ACCORDION HELPER (gọi từ pages.js sau khi render) ----
    function bindAccordions(container) {
        container.querySelectorAll('.accordion-toggle').forEach(toggle => {
            toggle.addEventListener('click', function() {
                const targetId = this.dataset.target;
                const content = document.getElementById(targetId);
                if (content) {
                    this.classList.toggle('open');
                    content.classList.toggle('open');
                }
            });
        });
    }

    // ---- FILTER HELPER (gọi từ pages.js) ----
    function populateFilter(selectId, values, allLabel) {
        const sel = document.getElementById(selectId);
        if (!sel) return;
        sel.innerHTML = `<option value="">${allLabel || 'Tất cả'}</option>`;
        values.forEach(v => {
            sel.innerHTML += `<option value="${v}">${v}</option>`;
        });
    }

    return {
        init,
        navigateTo,
        refreshData,
        showLoading,
        hideLoading,
        getSettings,
        bindAccordions,
        populateFilter,
    };
})();

// ====== KHỞI CHẠY ======
document.addEventListener('DOMContentLoaded', () => UI.init());
