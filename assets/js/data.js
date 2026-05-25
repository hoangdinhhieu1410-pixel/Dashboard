/**
 * ===================================================================
 * DATA.JS - Lấy dữ liệu từ Google Sheets
 * ===================================================================
 * Sử dụng Google Visualization API + JSONP để vượt CORS
 * khi mở file HTML trực tiếp từ máy tính (file://)
 * ===================================================================
 */

const DataService = (() => {
    let _counter = 0;
    const _cache = {};   // { menuKey: { data: [...], time: timestamp } }

    /**
     * Lấy dữ liệu 1 sheet bằng JSONP
     * Nguyên lý: Chèn thẻ <script> gọi Google Visualization API
     * → Google trả về: callbackName({...data...})
     * → Trình duyệt chạy hàm callback → ta nhận được dữ liệu
     */
    function _fetchJSONP(gid) {
        return new Promise((resolve, reject) => {
            const cbName = '__ghnCb_' + (++_counter) + '_' + Date.now();
            const url = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=responseHandler:${cbName}&gid=${gid}`;
            const timeout = CONFIG.UI.FETCH_TIMEOUT;

            const timer = setTimeout(() => {
                _cleanup(cbName);
                reject(new Error('Hết thời gian chờ. Kiểm tra mạng internet và quyền chia sẻ Google Sheets.'));
            }, timeout);

            function _cleanup(name) {
                clearTimeout(timer);
                delete window[name];
                const el = document.getElementById(name);
                if (el) el.remove();
            }

            // Đăng ký callback
            window[cbName] = function(response) {
                _cleanup(cbName);
                try {
                    resolve(_parseGvizResponse(response));
                } catch (e) {
                    reject(e);
                }
            };

            // Chèn <script>
            const script = document.createElement('script');
            script.id = cbName;
            script.src = url;
            script.onerror = function() {
                _cleanup(cbName);
                reject(new Error('Không thể kết nối Google Sheets. Kiểm tra mạng và quyền chia sẻ.'));
            };
            document.head.appendChild(script);
        });
    }

    /**
     * Parse response từ Google Visualization API
     * Chuyển {table: {cols, rows}} → [{colLabel: value, ...}, ...]
     */
    function _parseGvizResponse(res) {
        if (!res) throw new Error('Response rỗng');
        if (res.status === 'error') {
            const msg = res.errors ? res.errors.map(e => e.message).join('; ') : 'Lỗi không rõ';
            throw new Error('Google Sheets: ' + msg);
        }

        const table = res.table;
        if (!table || !table.cols || !table.rows) return [];

        const labels = table.cols.map((c, i) => c.label || c.id || ('Cột_' + i));

        return table.rows.map(row => {
            const obj = {};
            const cells = row.c || [];
            labels.forEach((label, i) => {
                const cell = cells[i];
                if (!cell || cell.v === null || cell.v === undefined) {
                    obj[label] = null;
                } else {
                    obj[label] = cell.v;
                    if (cell.f != null) obj[label + '_fmt'] = cell.f;
                }
            });
            return obj;
        });
    }

    // ===================== API CÔNG KHAI =====================

    /** Lấy dữ liệu 1 sheet theo menuKey (có cache) */
    async function fetchSheet(menuKey, forceRefresh = false) {
        const sheetCfg = CONFIG.SHEETS[menuKey];
        if (!sheetCfg) throw new Error('Menu key không hợp lệ: ' + menuKey);

        // Kiểm tra cache
        if (!forceRefresh && _cache[menuKey]) {
            const age = Date.now() - _cache[menuKey].time;
            if (age < CONFIG.UI.CACHE_DURATION) return _cache[menuKey].data;
        }

        const data = await _fetchJSONP(sheetCfg.gid);
        _cache[menuKey] = { data, time: Date.now() };
        return data;
    }

    /** Lấy nhiều sheet song song */
    async function fetchMultiple(menuKeys, forceRefresh = false) {
        const results = {};
        await Promise.all(menuKeys.map(async key => {
            try {
                results[key] = await fetchSheet(key, forceRefresh);
            } catch (e) {
                console.error('Lỗi fetch ' + key + ':', e);
                results[key] = [];
            }
        }));
        return results;
    }

    /** Xóa cache */
    function clearCache(menuKey) {
        if (menuKey) delete _cache[menuKey];
        else Object.keys(_cache).forEach(k => delete _cache[k]);
    }

    return { fetchSheet, fetchMultiple, clearCache };
})();
