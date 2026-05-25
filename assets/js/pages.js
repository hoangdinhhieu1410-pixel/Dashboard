/**
 * ===================================================================
 * PAGES.JS - Logic render cho 12 trang Dashboard
 * ===================================================================
 * Được gọi từ UI.js qua: Pages.render(menuKey, data, container)
 * Sử dụng: CONFIG, H, Charts, DataService
 * ===================================================================
 */

// =====================================================================
// HÀM RENDER CHÍNH - Điều hướng theo menuKey
// =====================================================================

/**
 * Render trang theo menuKey
 * @param {string} menuKey - Key menu (tong-quan, nang-suat, ...)
 * @param {Array} data - Dữ liệu đã fetch (trừ tong-quan tự fetch)
 * @param {HTMLElement} container - Phần tử #page-container
 */
function render(menuKey, data, container) {
    switch (menuKey) {
        case 'tong-quan':         return renderTongQuan(container);
        case 'nang-suat':         return renderNangSuat(data, container);
        case 'con-cung':          return renderConCung(data, container);
        case 'data-push':         return renderDataPush(data, container);
        case 'data-ton':          return renderDataTon(data, container);
        case 'canh-bao':          return renderCanhBao(data, container);
        case 'data-gtc':          return renderDataGTC(data, container);
        case 'gan-ontime':        return renderGanOntime(data, container);
        case 'ontime-toan-trinh': return renderOntimeToanTrinh(data, container);
        case 'luong-nvxl':        return renderLuongNVXL(data, container);
        case 'don-tao':           return renderDonTao(data, container);
        case 'tra-hang':          return renderTraHang(data, container);
        default:                  return _renderFallback(menuKey, data, container);
    }
}

// =====================================================================
// HÀM TIỆN ÍCH NỘI BỘ
// =====================================================================

/** Render bảng mặc định khi không khớp menuKey */
function _renderFallback(title, data, container) {
    if (!data || !data.length) {
        container.innerHTML = '<div class="card"><p>Không có dữ liệu.</p></div>';
        return;
    }
    const cols = Object.keys(data[0]).filter(k => !k.endsWith('_fmt'));
    let html = `<div class="card"><h2 class="card-title">${title}</h2>
        <div class="table-wrapper"><table><thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>`;
    data.slice(0, CONFIG.UI.MAX_TABLE_ROWS).forEach(row => {
        html += '<tr>' + cols.map(c => `<td>${row[c] ?? ''}</td>`).join('') + '</tr>';
    });
    html += '</tbody></table></div></div>';
    container.innerHTML = html;
}

/** Tạo HTML cho 1 thẻ KPI */
function _kpiCard(icon, color, label, value, trendHtml) {
    return `<div class="kpi-card">
        <div class="kpi-icon ${color}"><span class="material-icons-outlined">${icon}</span></div>
        <div class="kpi-content">
            <div class="kpi-label">${label}</div>
            <div class="kpi-value">${value}</div>
            ${trendHtml ? `<div class="kpi-trend">${trendHtml}</div>` : ''}
        </div>
    </div>`;
}

/** Tạo HTML cho filter dropdown */
function _filterSelect(id, label, options) {
    return `<div class="filter-group">
        <label class="filter-label">${label}</label>
        <select class="filter-select" id="${id}">
            <option value="">-- Tất cả --</option>
            ${options.map(o => `<option value="${o}">${o}</option>`).join('')}
        </select>
    </div>`;
}

/** Gắn event accordion toggle cho container */
function _bindAccordion(container) {
    container.querySelectorAll('.accordion-toggle').forEach(toggle => {
        toggle.addEventListener('click', function () {
            const targetId = this.getAttribute('data-target');
            const content = document.getElementById(targetId);
            if (content) {
                this.classList.toggle('open');
                content.classList.toggle('open');
            }
        });
    });
}

/** Tạo ID duy nhất cho accordion */
let _accCounter = 0;
function _accId() { return 'acc-' + (++_accCounter) + '-' + Date.now(); }

// =====================================================================
// MENU 0: TỔNG QUAN
// =====================================================================
/** Trang tổng quan - tự fetch tất cả 11 sheet để tổng hợp */
async function renderTongQuan(container) {
    // Hiển thị loading tạm
    container.innerHTML = `<div class="kpi-grid">
        ${_kpiCard('people', 'orange', 'Tổng Nhân Viên', '<span class="spinner-sm"></span>', 'Đang tải...')}
        ${_kpiCard('check_circle', 'green', 'TB GTC%', '<span class="spinner-sm"></span>', 'Đang tải...')}
        ${_kpiCard('warning', 'red', 'Kho Báo Động', '<span class="spinner-sm"></span>', 'Đang tải...')}
        ${_kpiCard('schedule', 'blue', 'Ontime%', '<span class="spinner-sm"></span>', 'Đang tải...')}
    </div>
    <div class="card"><p>⏳ Đang tải dữ liệu tổng quan từ tất cả các sheet...</p></div>`;

    try {
        // Fetch tất cả 11 sheet song song
        const allKeys = Object.keys(CONFIG.SHEETS);
        const allData = await DataService.fetchMultiple(allKeys);

        // --- Tính KPI ---
        const nsData = allData['nang-suat'] || [];
        const cbData = allData['canh-bao'] || [];
        const otData = allData['ontime-toan-trinh'] || [];
        const traData = allData['tra-hang'] || [];

        // Tổng NV (unique Driver_id từ năng suất)
        const colDriver = H.findCol(nsData[0] || {}, ['Driver_id', 'driver_id', 'Mã nhân viên', 'mã nv']);
        const tongNV = colDriver ? H.uniqueVals(nsData, colDriver).length : '--';

        // TB GTC% từ năng suất
        const colVol = H.findCol(nsData[0] || {}, ['Vol', 'vol', 'Số đơn']);
        const colSucc = H.findCol(nsData[0] || {}, ['Vol_succeeded', 'vol_succeeded', 'Đơn thành công']);
        const totalVol = H.sumCol(nsData, colVol);
        const totalSucc = H.sumCol(nsData, colSucc);
        const tbGTC = totalVol > 0 ? (totalSucc / totalVol * 100) : 0;

        // Kho báo động (total ngày >= 5 từ cảnh báo)
        const colTotalDays = H.findCol(cbData[0] || {}, ['total ngày', 'total_ngay', 'tổng ngày']);
        const khoBaoDong = colTotalDays
            ? cbData.filter(r => H.num(r[colTotalDays]) >= CONFIG.THRESHOLDS.TON_NGAY_WARN).length
            : '--';

        // Ontime% từ ontime toàn trình
        const colOTRate = H.findCol(otData[0] || {}, ['tỷ lệ', 'ty_le', '%', 'ontime', 'Tỷ lệ ontime']);
        const tbOntime = otData.length > 0 ? H.avgCol(otData, colOTRate) : 0;

        // --- Biểu đồ GTC theo kho ---
        const colWH = H.findCol(nsData[0] || {}, ['Warehouse_name', 'warehouse_name', 'Tên kho', 'kho']);
        const byWH = H.groupBy(nsData, colWH);
        const whLabels = [];
        const whRates = [];
        const whColors = [];
        Object.entries(byWH).forEach(([wh, rows]) => {
            const v = H.sumCol(rows, colVol);
            const s = H.sumCol(rows, colSucc);
            const rate = v > 0 ? (s / v * 100) : 0;
            whLabels.push(wh);
            whRates.push(parseFloat(rate.toFixed(1)));
            whColors.push(Charts.colorByThreshold(rate, CONFIG.THRESHOLDS.GTC_GOOD, CONFIG.THRESHOLDS.GTC_WARN));
        });

        // --- Bảng xếp hạng kho ---
        // Thu thập thông tin tồn, ontime, trả% theo kho
        const colCBWH = H.findCol(cbData[0] || {}, ['kho', 'warehouse', 'Tên kho', 'warehouse_name']);
        const colOTWH = H.findCol(otData[0] || {}, ['kho', 'warehouse', 'Tên kho']);
        const colTraWH = H.findCol(traData[0] || {}, ['kho', 'warehouse', 'Tên kho']);
        const colTraRate = H.findCol(traData[0] || {}, ['% trả', 'ty_le_tra', 'tỷ lệ trả', '% trả hàng']);

        // Tổng hợp thông tin từ các sheet
        const khoSet = new Set([...whLabels]);
        const khoRanking = [...khoSet].map(wh => {
            // GTC%
            const nsRows = (byWH[wh] || []);
            const v = H.sumCol(nsRows, colVol);
            const s = H.sumCol(nsRows, colSucc);
            const gtcPct = v > 0 ? (s / v * 100) : 0;

            // Tồn
            const cbRows = cbData.filter(r => r[colCBWH] === wh);
            const tonVal = cbRows.length > 0 ? H.num(cbRows[0][colTotalDays]) : 0;

            // Ontime
            const otRows = otData.filter(r => r[colOTWH] === wh);
            const ontimePct = otRows.length > 0 ? H.avgCol(otRows, colOTRate) : 0;

            // Trả%
            const traRows = traData.filter(r => r[colTraWH] === wh);
            const traPct = traRows.length > 0 ? H.avgCol(traRows, colTraRate) : 0;

            // Trạng thái tổng hợp
            let status = '🟢 Ổn định', statusCls = 'success';
            if (tonVal >= CONFIG.THRESHOLDS.TON_NGAY_WARN || gtcPct < CONFIG.THRESHOLDS.GTC_WARN) {
                status = '🔴 Báo động'; statusCls = 'danger';
            } else if (gtcPct < CONFIG.THRESHOLDS.GTC_GOOD || ontimePct < CONFIG.THRESHOLDS.ONTIME_GOOD) {
                status = '🟡 Cảnh báo'; statusCls = 'warning';
            }
            return { wh, gtcPct, tonVal, ontimePct, traPct, status, statusCls };
        }).sort((a, b) => b.gtcPct - a.gtcPct);

        // --- Render giao diện ---
        container.innerHTML = `
        <div class="kpi-grid">
            ${_kpiCard('people', 'orange', 'Tổng Nhân Viên', H.fmt(tongNV), '')}
            ${_kpiCard('check_circle', 'green', 'TB GTC%', H.pct(tbGTC),
                `<span class="badge ${H.badge(tbGTC, CONFIG.THRESHOLDS.GTC_GOOD, CONFIG.THRESHOLDS.GTC_WARN)}">${tbGTC >= CONFIG.THRESHOLDS.GTC_GOOD ? 'Tốt' : tbGTC >= CONFIG.THRESHOLDS.GTC_WARN ? 'TB' : 'Kém'}</span>`)}
            ${_kpiCard('warning', 'red', 'Kho Báo Động', khoBaoDong, khoBaoDong > 0 ? '<span class="trend-down">⚠ Cần xử lý</span>' : '<span class="trend-up">✓ An toàn</span>')}
            ${_kpiCard('schedule', 'blue', 'Ontime%', H.pct(tbOntime),
                `<span class="badge ${H.badge(tbOntime, CONFIG.THRESHOLDS.ONTIME_GOOD, CONFIG.THRESHOLDS.ONTIME_WARN)}">${tbOntime >= CONFIG.THRESHOLDS.ONTIME_GOOD ? 'Tốt' : 'Cần cải thiện'}</span>`)}
        </div>

        <div class="grid-2">
            <div class="card">
                <h3 class="card-title">📊 Tỷ Lệ GTC theo Kho</h3>
                <div class="chart-container"><canvas id="chart-tq-gtc"></canvas></div>
            </div>
            <div class="card">
                <h3 class="card-title">🏅 Xếp Hạng Kho Tổng Hợp</h3>
                <div class="table-wrapper"><table>
                    <thead><tr><th>Kho</th><th>GTC%</th><th>Tồn</th><th>Ontime%</th><th>Trả%</th><th>Trạng thái</th></tr></thead>
                    <tbody>
                    ${khoRanking.map(k => `<tr>
                        <td>${k.wh}</td>
                        <td><span class="badge ${H.badge(k.gtcPct, CONFIG.THRESHOLDS.GTC_GOOD, CONFIG.THRESHOLDS.GTC_WARN)}">${H.pct(k.gtcPct)}</span></td>
                        <td>${k.tonVal > 0 ? `<span class="badge ${k.tonVal >= CONFIG.THRESHOLDS.TON_NGAY_WARN ? 'danger' : 'warning'}">${k.tonVal} ngày</span>` : '<span class="badge success">0</span>'}</td>
                        <td><span class="badge ${H.badge(k.ontimePct, CONFIG.THRESHOLDS.ONTIME_GOOD, CONFIG.THRESHOLDS.ONTIME_WARN)}">${H.pct(k.ontimePct)}</span></td>
                        <td><span class="badge ${H.badgeReverse(k.traPct, CONFIG.THRESHOLDS.TRA_GOOD, CONFIG.THRESHOLDS.TRA_WARN)}">${H.pct(k.traPct)}</span></td>
                        <td><span class="badge ${k.statusCls}">${k.status}</span></td>
                    </tr>`).join('')}
                    </tbody>
                </table></div>
            </div>
        </div>

        <div class="card">
            <div class="ai-box">
                <div class="ai-box-title">🤖 Phân Tích AI</div>
                <div class="ai-box-content" id="ai-tq-content">
                    <p>Nhấn nút bên dưới để AI phân tích tổng quan vận hành...</p>
                    <button class="btn btn-primary" id="btn-ai-tq" style="margin-top:8px">🧠 Phân tích ngay</button>
                </div>
            </div>
        </div>`;

        // Vẽ biểu đồ GTC theo kho
        Charts.bar('chart-tq-gtc', whLabels, [{
            label: 'GTC%',
            data: whRates,
            backgroundColor: whColors,
            borderRadius: 6
        }], { yMax: 100 });

        // Gắn event AI
        const btnAI = document.getElementById('btn-ai-tq');
        if (btnAI) {
            btnAI.addEventListener('click', async () => {
                const settings = JSON.parse(localStorage.getItem('ghn_settings') || '{}');
                const geminiKey = settings.geminiKey || '';
                if (!geminiKey) {
                    document.getElementById('ai-tq-content').innerHTML = '<p class="alert alert-warning">⚠ Chưa có Gemini API Key. Vào Cài đặt để thêm.</p>';
                    return;
                }
                btnAI.disabled = true;
                btnAI.textContent = '⏳ Đang phân tích...';
                try {
                    const sample = { tongNV, tbGTC: tbGTC.toFixed(1), khoBaoDong, tbOntime: tbOntime.toFixed(1), khoRanking: khoRanking.slice(0, 8) };
                    const prompt = `Bạn là chuyên gia vận hành logistics B2B. Phân tích ngắn gọn (5-7 gạch đầu dòng) dữ liệu tổng quan sau và đưa ra cảnh báo + đề xuất:\n\n${JSON.stringify(sample)}`;
                    const result = await GeminiService.analyze(geminiKey, prompt);
                    document.getElementById('ai-tq-content').innerHTML = `<div style="white-space:pre-wrap">${result}</div>`;
                } catch (e) {
                    document.getElementById('ai-tq-content').innerHTML = `<p class="alert alert-danger">❌ Lỗi AI: ${e.message}</p>`;
                }
            });
        }
    } catch (e) {
        container.innerHTML = `<div class="card"><div class="alert alert-danger">❌ Lỗi tải tổng quan: ${e.message}</div></div>`;
    }
}

// =====================================================================
// MENU 1: NĂNG SUẤT NV
// =====================================================================
function renderNangSuat(data, container) {
    if (!data || !data.length) { _renderFallback('Năng suất NV', data, container); return; }

    const sample = data[0];
    const colDriver = H.findCol(sample, ['Driver_id', 'driver_id', 'Mã nhân viên', 'mã nv']);
    const colWH     = H.findCol(sample, ['Warehouse_name', 'warehouse_name', 'Tên kho', 'kho']);
    const colType   = H.findCol(sample, ['Type', 'type', 'Loại']);
    const colVol    = H.findCol(sample, ['Vol', 'vol', 'Số đơn']);
    const colSucc   = H.findCol(sample, ['Vol_succeeded', 'vol_succeeded', 'Đơn thành công']);
    const colRate   = H.findCol(sample, ['Tỷ lê GTC', 'Tỷ lệ GTC', 'tỷ lệ gtc', 'ty_le_gtc']);

    // Danh sách unique cho filter
    const khoList = H.uniqueVals(data, colWH);
    const typeList = H.uniqueVals(data, colType);

    // Render HTML
    container.innerHTML = `
    <div class="filter-bar">
        ${_filterSelect('f-ns-kho', 'Kho', khoList)}
        ${_filterSelect('f-ns-type', 'Loại (Giao/Lấy)', typeList)}
    </div>
    <div class="kpi-grid" id="ns-kpi"></div>
    <div class="grid-2">
        <div class="card">
            <h3 class="card-title">📊 So sánh GTC giữa các Kho</h3>
            <div class="chart-container"><canvas id="chart-ns-bar"></canvas></div>
        </div>
        <div class="card" id="ns-top-area"></div>
    </div>
    <div class="card">
        <h3 class="card-title">📋 Bảng Nhân Viên</h3>
        <div class="table-wrapper" id="ns-table-area"></div>
    </div>`;

    /** Hàm re-render nội dung khi filter thay đổi */
    function _rerender() {
        const fKho = document.getElementById('f-ns-kho').value;
        const fType = document.getElementById('f-ns-type').value;

        let filtered = data;
        if (fKho) filtered = filtered.filter(r => r[colWH] === fKho);
        if (fType) filtered = filtered.filter(r => r[colType] === fType);

        // Tính KPI
        const tongDon = H.sumCol(filtered, colVol);
        const donTC = H.sumCol(filtered, colSucc);
        const tyLeGTC = tongDon > 0 ? (donTC / tongDon * 100) : 0;
        const tongNV = colDriver ? H.uniqueVals(filtered, colDriver).length : filtered.length;

        document.getElementById('ns-kpi').innerHTML =
            _kpiCard('inventory_2', 'orange', 'Tổng đơn', H.fmt(tongDon), '') +
            _kpiCard('check_circle', 'green', 'Đơn TC', H.fmt(donTC), '') +
            _kpiCard('percent', 'blue', 'Tỷ lệ GTC%', H.pct(tyLeGTC),
                `<span class="badge ${H.badge(tyLeGTC, CONFIG.THRESHOLDS.GTC_GOOD, CONFIG.THRESHOLDS.GTC_WARN)}">${tyLeGTC >= CONFIG.THRESHOLDS.GTC_GOOD ? 'Tốt' : tyLeGTC >= CONFIG.THRESHOLDS.GTC_WARN ? 'TB' : 'Kém'}</span>`) +
            _kpiCard('people', 'yellow', 'Tổng NV', H.fmt(tongNV), '');

        // Biểu đồ bar GTC theo kho
        Charts.destroyAll();
        const byWH = H.groupBy(filtered, colWH);
        const whLabels = [], whRates = [], whColors = [];
        Object.entries(byWH).forEach(([wh, rows]) => {
            const v = H.sumCol(rows, colVol);
            const s = H.sumCol(rows, colSucc);
            const rate = v > 0 ? (s / v * 100) : 0;
            whLabels.push(wh);
            whRates.push(parseFloat(rate.toFixed(1)));
            whColors.push(Charts.colorByThreshold(rate, CONFIG.THRESHOLDS.GTC_GOOD, CONFIG.THRESHOLDS.GTC_WARN));
        });
        Charts.bar('chart-ns-bar', whLabels, [{
            label: 'GTC%', data: whRates, backgroundColor: whColors, borderRadius: 6
        }], { yMax: 100 });

        // Bảng NV - sắp xếp theo tỷ lệ giảm dần
        const nvList = filtered.map(r => {
            const vol = H.num(r[colVol]);
            const succ = H.num(r[colSucc]);
            const rate = colRate ? H.num(r[colRate]) : (vol > 0 ? (succ / vol * 100) : 0);
            return { id: r[colDriver], kho: r[colWH], loai: r[colType], vol, succ, rate };
        }).filter(r => r.vol > 0).sort((a, b) => b.rate - a.rate);

        // Top 5 tốt / kém
        const top5Good = nvList.slice(0, 5);
        const top5Bad = nvList.slice(-5).reverse();

        document.getElementById('ns-top-area').innerHTML = `
            <h3 class="card-title">🏆 Top 5 Tốt & ⚠ Top 5 Kém</h3>
            <div class="table-wrapper"><table><thead><tr><th></th><th>Mã NV</th><th>Kho</th><th>%</th></tr></thead><tbody>
            ${top5Good.map((r, i) => `<tr style="background:#F0FDF4"><td>🥇 #${i + 1}</td><td>${r.id}</td><td>${r.kho}</td><td><span class="badge success">${H.pct(r.rate)}</span></td></tr>`).join('')}
            ${top5Bad.map((r, i) => `<tr style="background:#FEF2F2"><td>⚠ #${nvList.length - 4 + i}</td><td>${r.id}</td><td>${r.kho}</td><td><span class="badge danger">${H.pct(r.rate)}</span></td></tr>`).join('')}
            </tbody></table></div>`;

        // Bảng đầy đủ NV
        let tableHtml = '<table><thead><tr><th>STT</th><th>Mã NV</th><th>Kho</th><th>Loại</th><th>Đơn</th><th>TC</th><th>%</th><th>Đánh giá</th></tr></thead><tbody>';
        nvList.slice(0, CONFIG.UI.MAX_TABLE_ROWS).forEach((r, i) => {
            const isTop5 = i < 5;
            const isBot5 = i >= nvList.length - 5;
            const bgStyle = isTop5 ? ' style="background:#F0FDF4"' : (isBot5 ? ' style="background:#FEF2F2"' : '');
            const badgeCls = r.rate >= 90 ? 'success' : (r.rate >= 60 ? 'warning' : 'danger');
            tableHtml += `<tr${bgStyle}>
                <td>${i + 1}</td><td>${r.id}</td><td>${r.kho}</td><td>${r.loai}</td>
                <td>${H.fmt(r.vol)}</td><td>${H.fmt(r.succ)}</td>
                <td><span class="badge ${badgeCls}">${H.pct(r.rate)}</span></td>
                <td><span class="badge ${badgeCls}">${r.rate >= 90 ? 'Tốt' : r.rate >= 60 ? 'TB' : 'Kém'}</span></td>
            </tr>`;
        });
        tableHtml += '</tbody></table>';
        tableHtml += `<p style="margin-top:8px;font-size:12px;color:#9CA3AF">Hiển thị ${Math.min(nvList.length, CONFIG.UI.MAX_TABLE_ROWS)} / ${nvList.length} NV</p>`;
        document.getElementById('ns-table-area').innerHTML = tableHtml;
    }

    // Gắn event filter
    document.getElementById('f-ns-kho').addEventListener('change', _rerender);
    document.getElementById('f-ns-type').addEventListener('change', _rerender);
    _rerender();
}

// =====================================================================
// MENU 2: CON CƯNG
// =====================================================================
function renderConCung(data, container) {
    if (!data || !data.length) { _renderFallback('Con Cưng', data, container); return; }

    const sample = data[0];
    const colAddr  = H.findCol(sample, ['Địa chỉ', 'dia_chi', 'address', 'Địa Chỉ']);
    const colStore = H.findCol(sample, ['Tên cửa hàng', 'ten_cua_hang', 'store_name', 'Cửa hàng']);
    const colNV    = H.findCol(sample, ['Nhân viên', 'nhan_vien', 'driver', 'NV']);
    const dedupeKey = colStore || colAddr;

    // Lọc trùng theo cột Địa chỉ hoặc Tên cửa hàng
    const seen = new Set();
    const uniqueStores = [];
    data.forEach(row => {
        const key = dedupeKey ? String(row[dedupeKey] || '').trim().toLowerCase() : JSON.stringify(row);
        if (!seen.has(key)) { seen.add(key); uniqueStores.push(row); }
    });

    // Tách Tỉnh + Quận từ địa chỉ (phần cuối sau dấu phẩy)
    const storesByProvince = {};
    uniqueStores.forEach(row => {
        const addr = String(row[colAddr] || '');
        const parts = addr.split(',').map(p => p.trim());
        const province = parts.length >= 2 ? parts[parts.length - 1] : 'Không xác định';
        const district = parts.length >= 3 ? parts[parts.length - 2] : (parts.length >= 2 ? parts[0] : 'Không xác định');
        if (!storesByProvince[province]) storesByProvince[province] = {};
        if (!storesByProvince[province][district]) storesByProvince[province][district] = [];
        storesByProvince[province][district].push(row);
    });

    const provinceList = Object.keys(storesByProvince).sort();
    const totalDistricts = Object.values(storesByProvince).reduce((s, d) => s + Object.keys(d).length, 0);

    container.innerHTML = `
    <div class="filter-bar">
        ${_filterSelect('f-cc-tinh', 'Tỉnh/TP', provinceList)}
    </div>
    <div class="kpi-grid">
        ${_kpiCard('storefront', 'orange', 'Tổng Cửa Hàng (Lọc trùng)', H.fmt(uniqueStores.length), `Trước lọc: ${data.length}`)}
        ${_kpiCard('location_city', 'blue', 'Số Tỉnh/TP', H.fmt(provinceList.length), '')}
        ${_kpiCard('map', 'green', 'Số Quận/Huyện', H.fmt(totalDistricts), '')}
    </div>
    <div class="grid-2">
        <div class="card">
            <h3 class="card-title">📊 Số Cửa Hàng theo Tỉnh</h3>
            <div class="chart-container"><canvas id="chart-cc-bar"></canvas></div>
        </div>
        <div class="card">
            <h3 class="card-title">📋 Chi Tiết Tỉnh / Quận</h3>
            <div class="table-wrapper" id="cc-table-area"></div>
        </div>
    </div>`;

    function _rerender() {
        const fTinh = document.getElementById('f-cc-tinh').value;

        // Lọc dữ liệu theo tỉnh
        const filteredProvinces = fTinh
            ? { [fTinh]: storesByProvince[fTinh] || {} }
            : storesByProvince;

        // Biểu đồ bar
        Charts.destroyAll();
        const provLabels = [], provCounts = [];
        Object.entries(filteredProvinces).sort((a, b) => {
            const cntA = Object.values(a[1]).reduce((s, arr) => s + arr.length, 0);
            const cntB = Object.values(b[1]).reduce((s, arr) => s + arr.length, 0);
            return cntB - cntA;
        }).forEach(([prov, districts]) => {
            const cnt = Object.values(districts).reduce((s, arr) => s + arr.length, 0);
            provLabels.push(prov);
            provCounts.push(cnt);
        });
        Charts.bar('chart-cc-bar', provLabels, [{
            label: 'Số cửa hàng', data: provCounts, backgroundColor: '#F26522', borderRadius: 6
        }]);

        // Bảng
        let tHtml = '<table><thead><tr><th>Tỉnh/TP</th><th>Quận/Huyện</th><th>Số CH</th><th>Số NV</th></tr></thead><tbody>';
        Object.entries(filteredProvinces).sort((a, b) => {
            const cntA = Object.values(a[1]).reduce((s, arr) => s + arr.length, 0);
            const cntB = Object.values(b[1]).reduce((s, arr) => s + arr.length, 0);
            return cntB - cntA;
        }).forEach(([prov, districts]) => {
            const totalProv = Object.values(districts).reduce((s, arr) => s + arr.length, 0);
            tHtml += `<tr style="background:#FFF7ED;font-weight:600"><td>${prov}</td><td>Tổng</td><td>${totalProv}</td><td>--</td></tr>`;
            Object.entries(districts).sort((a, b) => b[1].length - a[1].length).forEach(([dist, stores]) => {
                const nvSet = new Set();
                stores.forEach(s => { if (colNV && s[colNV]) nvSet.add(s[colNV]); });
                tHtml += `<tr><td></td><td>${dist}</td><td>${stores.length}</td><td>${nvSet.size || '--'}</td></tr>`;
            });
        });
        tHtml += '</tbody></table>';
        document.getElementById('cc-table-area').innerHTML = tHtml;
    }

    document.getElementById('f-cc-tinh').addEventListener('change', _rerender);
    _rerender();
}

// =====================================================================
// MENU 3: PUSH B2B
// =====================================================================
function renderDataPush(data, container) {
    if (!data || !data.length) { _renderFallback('Push giao B2B', data, container); return; }

    const sample = data[0];
    const colPriority = H.findCol(sample, ['Mức độ ưu tiên', 'muc_do_uu_tien', 'Priority', 'ưu tiên']);
    const colWH       = H.findCol(sample, ['Tên kho', 'ten_kho', 'kho', 'warehouse']);
    const colAction   = H.findCol(sample, ['Cần làm gì', 'can_lam_gi', 'action', 'thao tác']);
    const colClient   = H.findCol(sample, ['Khách', 'khach', 'client', 'Khách hàng', 'client_name']);
    const colOrderId  = H.findCol(sample, ['Mã đơn', 'ma_don', 'order_id', 'Mã đơn hàng']);

    const priorityList = H.uniqueVals(data, colPriority);
    const khoList      = H.uniqueVals(data, colWH);
    const actionList   = H.uniqueVals(data, colAction);
    const clientList   = H.uniqueVals(data, colClient);

    // Đếm đơn theo mức ưu tiên
    const byPrio = H.groupBy(data, colPriority);
    const prioLabels = ['Cao', 'Trung bình', 'Thấp'];
    const prioIcons  = ['error', 'warning', 'info'];
    const prioColors = ['red', 'yellow', 'blue'];

    container.innerHTML = `
    <div class="filter-bar">
        ${_filterSelect('f-push-prio', 'Mức độ ưu tiên', priorityList)}
        ${_filterSelect('f-push-kho', 'Kho', khoList)}
        ${_filterSelect('f-push-action', 'Cần làm gì', actionList)}
        ${_filterSelect('f-push-client', 'Khách', clientList)}
    </div>
    <div class="kpi-grid" id="push-kpi"></div>
    <div class="card">
        <h3 class="card-title">📋 Bảng Tổng Hợp Push B2B</h3>
        <div class="table-wrapper" id="push-table-area"></div>
    </div>`;

    function _rerender() {
        const fP = document.getElementById('f-push-prio').value;
        const fK = document.getElementById('f-push-kho').value;
        const fA = document.getElementById('f-push-action').value;
        const fC = document.getElementById('f-push-client').value;

        let filtered = data;
        if (fP) filtered = filtered.filter(r => r[colPriority] === fP);
        if (fK) filtered = filtered.filter(r => r[colWH] === fK);
        if (fA) filtered = filtered.filter(r => r[colAction] === fA);
        if (fC) filtered = filtered.filter(r => r[colClient] === fC);

        // KPI theo mức ưu tiên
        const byP = H.groupBy(filtered, colPriority);
        let kpiHtml = '';
        priorityList.forEach((prio, i) => {
            const cnt = (byP[prio] || []).length;
            const icon = prio.toLowerCase().includes('cao') ? 'error' : (prio.toLowerCase().includes('th') ? 'info' : 'warning');
            const color = prio.toLowerCase().includes('cao') ? 'red' : (prio.toLowerCase().includes('th') ? 'blue' : 'yellow');
            kpiHtml += _kpiCard(icon, color, `Ưu tiên: ${prio}`, H.fmt(cnt) + ' đơn', '');
        });
        document.getElementById('push-kpi').innerHTML = kpiHtml;

        // Bảng tổng hợp: Kho | Khách | Số đơn | Cần làm | [Xem mã đơn] accordion
        const byWHClient = {};
        filtered.forEach(row => {
            const key = (row[colWH] || 'N/A') + '||' + (row[colClient] || 'N/A');
            if (!byWHClient[key]) byWHClient[key] = { wh: row[colWH], client: row[colClient], action: row[colAction], orders: [] };
            byWHClient[key].orders.push(row[colOrderId] || '');
            byWHClient[key].action = row[colAction]; // Lấy action cuối
        });

        let tHtml = '<table><thead><tr><th>Kho</th><th>Khách</th><th>Số đơn</th><th>Cần làm gì</th><th>Mã đơn</th></tr></thead><tbody>';
        Object.values(byWHClient).sort((a, b) => b.orders.length - a.orders.length).forEach(item => {
            const aid = _accId();
            tHtml += `<tr>
                <td>${item.wh || ''}</td><td>${item.client || ''}</td><td><strong>${item.orders.length}</strong></td>
                <td>${item.action || ''}</td>
                <td><span class="accordion-toggle" data-target="${aid}">▼ Xem (${item.orders.length})</span>
                    <div id="${aid}" class="accordion-content"><div style="max-height:200px;overflow:auto;font-size:12px">${item.orders.filter(Boolean).join(', ') || 'Không có mã'}</div></div>
                </td>
            </tr>`;
        });
        tHtml += '</tbody></table>';
        if (!Object.keys(byWHClient).length) tHtml = '<p>Không có đơn nào phù hợp bộ lọc.</p>';
        document.getElementById('push-table-area').innerHTML = tHtml;
        _bindAccordion(container);
    }

    ['f-push-prio', 'f-push-kho', 'f-push-action', 'f-push-client'].forEach(id => {
        document.getElementById(id).addEventListener('change', _rerender);
    });
    _rerender();
}

// =====================================================================
// MENU 4: TỒN 3 NGÀY
// =====================================================================
function renderDataTon(data, container) {
    if (!data || !data.length) { _renderFallback('Data tồn 3 ngày', data, container); return; }

    const sample = data[0];
    const colWH       = H.findCol(sample, ['kho giao', 'kho', 'warehouse', 'Tên kho']);
    const colClient   = H.findCol(sample, ['client_type', 'khách', 'client', 'Loại khách']);
    const colOrderId  = H.findCol(sample, ['Mã đơn', 'ma_don', 'order_id']);
    const colDays     = H.findCol(sample, ['số ngày', 'so_ngay', 'days', 'ngày tồn']);
    const colAttempts = H.findCol(sample, ['số lần giao', 'so_lan_giao', 'attempts', 'lần giao']);

    const khoList    = H.uniqueVals(data, colWH);
    const clientList = H.uniqueVals(data, colClient);

    container.innerHTML = `
    <div class="filter-bar">
        ${_filterSelect('f-ton-kho', 'Kho giao', khoList)}
        ${_filterSelect('f-ton-client', 'Khách (client_type)', clientList)}
    </div>
    <div class="kpi-grid" id="ton-kpi"></div>
    <div class="grid-2">
        <div class="card">
            <h3 class="card-title">📊 Số Đơn Tồn theo Kho</h3>
            <div class="chart-container"><canvas id="chart-ton-bar"></canvas></div>
        </div>
        <div class="card">
            <h3 class="card-title">📋 Tổng Hợp theo Kho</h3>
            <div class="table-wrapper" id="ton-summary"></div>
        </div>
    </div>`;

    function _rerender() {
        const fKho = document.getElementById('f-ton-kho').value;
        const fClient = document.getElementById('f-ton-client').value;

        let filtered = data;
        if (fKho) filtered = filtered.filter(r => r[colWH] === fKho);
        if (fClient) filtered = filtered.filter(r => r[colClient] === fClient);

        // Chia nhóm tồn
        const ton4_7 = colDays ? filtered.filter(r => { const d = H.num(r[colDays]); return d >= 4 && d <= 7; }) : [];
        const ton7plus = colDays ? filtered.filter(r => H.num(r[colDays]) > 7) : [];

        document.getElementById('ton-kpi').innerHTML =
            _kpiCard('inventory_2', 'yellow', 'Tồn 4-7 ngày', H.fmt(ton4_7.length), '<span class="badge warning">Theo dõi</span>') +
            _kpiCard('error', 'red', 'Tồn > 7 ngày', H.fmt(ton7plus.length), '<span class="badge danger">Nguy hiểm</span>');

        // Biểu đồ bar theo kho
        Charts.destroyAll();
        const byWH = H.groupBy(filtered, colWH);
        const whLabels = [], wh47 = [], wh7p = [];
        Object.entries(byWH).sort((a, b) => b[1].length - a[1].length).forEach(([wh, rows]) => {
            whLabels.push(wh);
            if (colDays) {
                wh47.push(rows.filter(r => { const d = H.num(r[colDays]); return d >= 4 && d <= 7; }).length);
                wh7p.push(rows.filter(r => H.num(r[colDays]) > 7).length);
            } else {
                wh47.push(0);
                wh7p.push(rows.length);
            }
        });
        Charts.bar('chart-ton-bar', whLabels, [
            { label: 'Tồn 4-7 ngày', data: wh47, backgroundColor: '#F59E0B', borderRadius: 6 },
            { label: 'Tồn > 7 ngày', data: wh7p, backgroundColor: '#EF4444', borderRadius: 6 }
        ]);

        // Bảng tổng hợp theo kho với accordion chi tiết
        let tHtml = '<table><thead><tr><th>Kho</th><th>Tồn 4-7</th><th>Tồn >7</th><th>Tổng</th><th>Chi tiết</th></tr></thead><tbody>';
        Object.entries(byWH).sort((a, b) => b[1].length - a[1].length).forEach(([wh, rows]) => {
            const c47 = colDays ? rows.filter(r => { const d = H.num(r[colDays]); return d >= 4 && d <= 7; }).length : 0;
            const c7p = colDays ? rows.filter(r => H.num(r[colDays]) > 7).length : 0;
            const aid = _accId();
            // Chi tiết accordion
            let detailHtml = '<table style="font-size:12px;margin-top:4px"><thead><tr><th>Mã đơn</th><th>Ngày tồn</th><th>Lần giao</th></tr></thead><tbody>';
            rows.slice(0, 50).forEach(r => {
                const days = H.num(r[colDays]);
                const badgeCls = days > 7 ? 'danger' : (days >= 4 ? 'warning' : '');
                detailHtml += `<tr><td>${r[colOrderId] || ''}</td><td><span class="badge ${badgeCls}">${days}</span></td><td>${r[colAttempts] || '--'}</td></tr>`;
            });
            detailHtml += '</tbody></table>';
            if (rows.length > 50) detailHtml += `<p style="font-size:11px;color:#9CA3AF">...và ${rows.length - 50} đơn nữa</p>`;

            tHtml += `<tr>
                <td>${wh}</td>
                <td><span class="badge warning">${c47}</span></td>
                <td><span class="badge danger">${c7p}</span></td>
                <td><strong>${rows.length}</strong></td>
                <td><span class="accordion-toggle" data-target="${aid}">▼ Chi tiết</span>
                    <div id="${aid}" class="accordion-content">${detailHtml}</div>
                </td>
            </tr>`;
        });
        tHtml += '</tbody></table>';
        document.getElementById('ton-summary').innerHTML = tHtml;
        _bindAccordion(container);
    }

    document.getElementById('f-ton-kho').addEventListener('change', _rerender);
    document.getElementById('f-ton-client').addEventListener('change', _rerender);
    _rerender();
}

// =====================================================================
// MENU 5: CẢNH BÁO (QUAN TRỌNG NHẤT)
// =====================================================================
function renderCanhBao(data, container) {
    if (!data || !data.length) { _renderFallback('Cảnh báo', data, container); return; }

    const sample = data[0];
    const colTotalDays  = H.findCol(sample, ['total ngày', 'total_ngay', 'tổng ngày']);
    const colBLLastmile = H.findCol(sample, ['backlog lastmile', 'backlog_lastmile']);
    const colBLKTC      = H.findCol(sample, ['backlog ktc', 'backlog_ktc']);
    const colDonTao     = H.findCol(sample, ['đơn tạo N-1', 'don_tao_n1', 'đơn tạo']);
    const colGTCN1      = H.findCol(sample, ['đơn gtc N-1', 'don_gtc_n1', 'đơn gtc']);
    const colTbGTC      = H.findCol(sample, ['tb gtc (L7D)', 'tb_gtc_l7d', 'tb gtc']);
    const colMaxGTC     = H.findCol(sample, ['max gtc (L7D)', 'max_gtc_l7d', 'max gtc']);
    const colWH         = H.findCol(sample, ['kho', 'warehouse', 'Tên kho', 'warehouse_name']);

    const khoList = H.uniqueVals(data, colWH);

    // Tính toán trạng thái từng kho
    function _calcStatus(row) {
        const totalDays  = H.num(row[colTotalDays]);
        const blLastmile = H.num(row[colBLLastmile]);
        const blKTC      = H.num(row[colBLKTC]);
        const donTao     = H.num(row[colDonTao]);
        const gtcN1      = H.num(row[colGTCN1]);
        const tongTon    = blLastmile + blKTC + donTao;
        const nangLuc    = tongTon > 0 ? (gtcN1 / tongTon * 100) : 100;

        // Tìm các cột tỷ lệ <= 60% (từ cột R đến Y)
        const headers = Object.keys(row);
        const ratioWarnings = [];
        headers.forEach(h => {
            if ((h.includes('%') || h.toLowerCase().includes('tỷ lệ') || h.toLowerCase().includes('ty_le')) && !h.endsWith('_fmt')) {
                const val = H.num(row[h]);
                if (val > 0 && val <= CONFIG.THRESHOLDS.TY_LE_WARN) {
                    ratioWarnings.push({ col: h, val });
                }
            }
        });

        // Trạng thái: 🔴 nếu total ngày >= 5 VÀ năng lực < 60%
        let status, statusLabel, statusCls;
        const cond1 = totalDays >= CONFIG.THRESHOLDS.TON_NGAY_WARN;
        const cond2 = nangLuc < CONFIG.THRESHOLDS.TY_LE_WARN;
        if (cond1 && cond2) {
            status = 'danger'; statusLabel = '🔴 Báo động';
        } else if (cond1 || cond2) {
            status = 'warning'; statusLabel = '🟡 Cảnh báo';
        } else {
            status = 'success'; statusLabel = '🟢 Ổn định';
        }

        return {
            wh: row[colWH] || 'N/A', totalDays, tongTon, gtcN1, nangLuc,
            tbGTC: H.num(row[colTbGTC]), maxGTC: H.num(row[colMaxGTC]),
            status, statusLabel, ratioWarnings, row
        };
    }

    const allStats = data.map(_calcStatus);

    container.innerHTML = `
    <div class="filter-bar">
        ${_filterSelect('f-cb-kho', 'Kho', khoList)}
        ${_filterSelect('f-cb-status', 'Trạng thái', ['🟢 Ổn định', '🟡 Cảnh báo', '🔴 Báo động'])}
    </div>
    <div class="kpi-grid" id="cb-kpi"></div>
    <div class="card">
        <h3 class="card-title">📊 Tồn vs GTC theo Kho</h3>
        <div class="chart-container"><canvas id="chart-cb-bar"></canvas></div>
    </div>
    <div class="card">
        <h3 class="card-title">📋 Bảng Tóm Tắt Cảnh Báo</h3>
        <div class="table-wrapper" id="cb-table-area"></div>
    </div>
    <div id="cb-alert-area"></div>`;

    function _rerender() {
        const fKho = document.getElementById('f-cb-kho').value;
        const fStatus = document.getElementById('f-cb-status').value;

        let filtered = allStats;
        if (fKho) filtered = filtered.filter(r => r.wh === fKho);
        if (fStatus) filtered = filtered.filter(r => r.statusLabel === fStatus);

        // KPI: 3 thẻ
        const cntOK = filtered.filter(r => r.status === 'success').length;
        const cntWarn = filtered.filter(r => r.status === 'warning').length;
        const cntDanger = filtered.filter(r => r.status === 'danger').length;

        document.getElementById('cb-kpi').innerHTML =
            _kpiCard('check_circle', 'green', 'Kho Ổn Định 🟢', H.fmt(cntOK), '') +
            _kpiCard('warning', 'yellow', 'Kho Cảnh Báo 🟡', H.fmt(cntWarn), '') +
            _kpiCard('error', 'red', 'Kho Báo Động 🔴', H.fmt(cntDanger), cntDanger > 0 ? '<span class="trend-down">⚠ Cần xử lý ngay!</span>' : '');

        // Biểu đồ bar: Tồn vs GTC
        Charts.destroyAll();
        const sortedStats = [...filtered].sort((a, b) => b.tongTon - a.tongTon);
        Charts.bar('chart-cb-bar',
            sortedStats.map(s => s.wh),
            [
                { label: 'Tổng tồn', data: sortedStats.map(s => s.tongTon), backgroundColor: '#EF4444', borderRadius: 6 },
                { label: 'GTC N-1', data: sortedStats.map(s => s.gtcN1), backgroundColor: '#10B981', borderRadius: 6 }
            ]);

        // Bảng tóm tắt
        let tHtml = '<table><thead><tr><th>Kho</th><th>Trạng thái</th><th>Ngày xử lý</th><th>Tồn hiện</th><th>GTC N-1</th><th>Năng lực%</th></tr></thead><tbody>';
        sortedStats.forEach(s => {
            tHtml += `<tr>
                <td>${s.wh}</td>
                <td><span class="badge ${s.status}">${s.statusLabel}</span></td>
                <td><span class="badge ${s.totalDays >= CONFIG.THRESHOLDS.TON_NGAY_WARN ? 'danger' : 'success'}">${s.totalDays} ngày</span></td>
                <td>${H.fmt(s.tongTon)}</td>
                <td>${H.fmt(s.gtcN1)}</td>
                <td><span class="badge ${H.badge(s.nangLuc, 80, 60)}">${H.pct(s.nangLuc)}</span></td>
            </tr>`;
        });
        tHtml += '</tbody></table>';
        document.getElementById('cb-table-area').innerHTML = tHtml;

        // Alert box cho từng kho báo động
        const dangerKhos = filtered.filter(r => r.status === 'danger' || r.status === 'warning');
        let alertHtml = '';
        if (dangerKhos.length > 0) {
            dangerKhos.sort((a, b) => b.totalDays - a.totalDays).forEach(s => {
                // Lời khuyên dựa trên năng lực
                let advice = '';
                if (s.nangLuc < 50) advice = '🚨 Cần tuyển thêm nhân sự NGAY. Năng lực xử lý quá thấp!';
                else if (s.nangLuc < 80) advice = '⚠️ Cần tăng cường nhân sự hoặc điều chuyển tuyến.';
                else advice = '🔄 Cần điều chuyển tuyến để giải tỏa tồn. Năng lực OK nhưng tồn cao.';

                const cangThang = s.tongTon > 0 && s.gtcN1 > 0
                    ? Math.ceil(s.tongTon / s.gtcN1) : '∞';

                alertHtml += `<div class="alert alert-${s.status}">
                    <strong>🏭 ${s.wh}</strong> — Tồn: <strong>${s.totalDays}</strong> ngày |
                    Tổng tồn: <strong>${H.fmt(s.tongTon)}</strong> đơn |
                    GTC: <strong>${H.fmt(s.gtcN1)}</strong>/ngày |
                    Cần <strong>${cangThang}</strong> ngày xử lý
                    <br>→ ${advice}
                    ${s.ratioWarnings.length > 0 ? '<br>⚠️ Tỷ lệ thấp: ' + s.ratioWarnings.map(w => `${w.col}: ${H.pct(w.val)}`).join(', ') : ''}
                </div>`;
            });
        } else {
            alertHtml = '<div class="alert alert-success">✅ Tất cả các kho đang hoạt động ổn định.</div>';
        }
        document.getElementById('cb-alert-area').innerHTML = alertHtml;
    }

    document.getElementById('f-cb-kho').addEventListener('change', _rerender);
    document.getElementById('f-cb-status').addEventListener('change', _rerender);
    _rerender();
}

// =====================================================================
// MENU 6: DATA GTC
// =====================================================================
function renderDataGTC(data, container) {
    if (!data || !data.length) { _renderFallback('Data GTC', data, container); return; }

    const sample = data[0];
    const colWH       = H.findCol(sample, ['kho', 'warehouse', 'Tên kho']);
    const colAssigned = H.findCol(sample, ['đơn gán', 'don_gan', 'assigned', 'gán app', 'Gán App']);
    const colGTC      = H.findCol(sample, ['đơn gtc', 'don_gtc', 'gtc', 'giao thành công', 'GTC']);
    const colWeight   = H.findCol(sample, ['khối lượng', 'weight', 'tổng khối lượng', 'Khối lượng']);

    const khoList = H.uniqueVals(data, colWH);

    container.innerHTML = `
    <div class="filter-bar">
        ${_filterSelect('f-gtc-kho', 'Kho', khoList)}
    </div>
    <div class="kpi-grid" id="gtc-kpi"></div>
    <div class="grid-2">
        <div class="card">
            <h3 class="card-title">📊 Tỷ Lệ GTC theo Kho</h3>
            <div class="chart-container"><canvas id="chart-gtc-bar"></canvas></div>
        </div>
        <div class="card">
            <h3 class="card-title">📋 Bảng Chi Tiết GTC</h3>
            <div class="table-wrapper" id="gtc-table-area"></div>
        </div>
    </div>`;

    function _rerender() {
        const fKho = document.getElementById('f-gtc-kho').value;
        let filtered = fKho ? data.filter(r => r[colWH] === fKho) : data;

        const totalAssigned = H.sumCol(filtered, colAssigned);
        const totalGTC = H.sumCol(filtered, colGTC);
        const tyLe = totalAssigned > 0 ? (totalGTC / totalAssigned * 100) : 0;

        document.getElementById('gtc-kpi').innerHTML =
            _kpiCard('assignment', 'orange', 'Tổng Gán App', H.fmt(totalAssigned), '') +
            _kpiCard('check_circle', 'green', 'Tổng GTC', H.fmt(totalGTC), '') +
            _kpiCard('percent', 'blue', 'Tỷ lệ%', H.pct(tyLe),
                `<span class="badge ${H.badge(tyLe, CONFIG.THRESHOLDS.GTC_GOOD, CONFIG.THRESHOLDS.GTC_WARN)}">${tyLe >= CONFIG.THRESHOLDS.GTC_GOOD ? 'Tốt' : tyLe >= CONFIG.THRESHOLDS.GTC_WARN ? 'TB' : 'Kém'}</span>`);

        // Biểu đồ + bảng theo kho
        Charts.destroyAll();
        const byWH = H.groupBy(filtered, colWH);
        const whStats = Object.entries(byWH).map(([wh, rows]) => {
            const assigned = H.sumCol(rows, colAssigned);
            const gtc = H.sumCol(rows, colGTC);
            const rate = assigned > 0 ? (gtc / assigned * 100) : 0;
            const weight = H.sumCol(rows, colWeight);
            const badgeCls = rate >= 90 ? 'success' : (rate >= 75 ? 'warning' : 'danger');
            const rank = rate >= 90 ? 'Tốt' : (rate >= 75 ? 'TB' : 'Kém');
            return { wh, assigned, gtc, rate, weight, badgeCls, rank };
        }).sort((a, b) => b.rate - a.rate);

        Charts.bar('chart-gtc-bar', whStats.map(w => w.wh), [{
            label: 'GTC%', data: whStats.map(w => parseFloat(w.rate.toFixed(1))),
            backgroundColor: whStats.map(w => Charts.colorByThreshold(w.rate, CONFIG.THRESHOLDS.GTC_GOOD, CONFIG.THRESHOLDS.GTC_WARN)),
            borderRadius: 6
        }], { yMax: 100 });

        let tHtml = '<table><thead><tr><th>Kho</th><th>Gán App</th><th>GTC</th><th>%</th><th>Khối lượng</th><th>Xếp hạng</th></tr></thead><tbody>';
        whStats.forEach((w, i) => {
            tHtml += `<tr><td>${w.wh}</td><td>${H.fmt(w.assigned)}</td><td>${H.fmt(w.gtc)}</td>
                <td><span class="badge ${w.badgeCls}">${H.pct(w.rate)}</span></td>
                <td>${H.fmt(w.weight)}</td>
                <td><span class="badge ${w.badgeCls}">#${i + 1} ${w.rank}</span></td></tr>`;
        });
        tHtml += '</tbody></table>';
        document.getElementById('gtc-table-area').innerHTML = tHtml;
    }

    document.getElementById('f-gtc-kho').addEventListener('change', _rerender);
    _rerender();
}

// =====================================================================
// MENU 7: GÁN ONTIME
// =====================================================================
function renderGanOntime(data, container) {
    if (!data || !data.length) { _renderFallback('Gán Ontime', data, container); return; }

    const sample = data[0];
    const colWH        = H.findCol(sample, ['kho', 'warehouse', 'Tên kho']);
    const colNew       = H.findCol(sample, ['Nhận mới', 'nhan_moi', 'new']);
    const colAssignRate = H.findCol(sample, ['%Gán của nhận mới', 'gan_nhan_moi', '%gán', 'Gán của nhận mới', '% Gán/NM']);
    const colGTCRate   = H.findCol(sample, ['%GTC/ nhận mới', 'gtc_nhan_moi', '%GTC/nhận mới', '%gtc', '% GTC/NM']);

    const khoList = H.uniqueVals(data, colWH);

    container.innerHTML = `
    <div class="filter-bar">
        ${_filterSelect('f-go-kho', 'Kho', khoList)}
    </div>
    <div class="kpi-grid" id="go-kpi"></div>
    <div class="grid-2">
        <div class="card">
            <h3 class="card-title">📊 % Gán vs % GTC/NM theo Kho</h3>
            <div class="chart-container"><canvas id="chart-go-bar"></canvas></div>
        </div>
        <div class="card">
            <h3 class="card-title">📋 Bảng Gán Ontime</h3>
            <div class="table-wrapper" id="go-table-area"></div>
        </div>
    </div>`;

    function _rerender() {
        const fKho = document.getElementById('f-go-kho').value;
        let filtered = fKho ? data.filter(r => r[colWH] === fKho) : data;

        const totalNew = H.sumCol(filtered, colNew);
        const avgAssign = H.avgCol(filtered, colAssignRate);
        const avgGTCNM = H.avgCol(filtered, colGTCRate);

        document.getElementById('go-kpi').innerHTML =
            _kpiCard('fiber_new', 'orange', 'Tổng Nhận Mới', H.fmt(totalNew), '') +
            _kpiCard('assignment_turned_in', 'blue', '% Gán/NM', H.pct(avgAssign),
                `<span class="badge ${H.badge(avgAssign, 90, 75)}">${avgAssign >= 90 ? 'Tốt' : 'Cải thiện'}</span>`) +
            _kpiCard('check_circle', 'green', '% GTC/NM', H.pct(avgGTCNM),
                `<span class="badge ${H.badge(avgGTCNM, 90, 75)}">${avgGTCNM >= 90 ? 'Tốt' : 'Cải thiện'}</span>`);

        // Biểu đồ bar 2 dataset
        Charts.destroyAll();
        const byWH = H.groupBy(filtered, colWH);
        const whStats = Object.entries(byWH).map(([wh, rows]) => ({
            wh, nhanMoi: H.sumCol(rows, colNew),
            assignRate: H.avgCol(rows, colAssignRate),
            gtcRate: H.avgCol(rows, colGTCRate)
        })).sort((a, b) => b.gtcRate - a.gtcRate);

        Charts.bar('chart-go-bar', whStats.map(w => w.wh), [
            { label: '% Gán/NM', data: whStats.map(w => parseFloat(w.assignRate.toFixed(1))), backgroundColor: '#3B82F6', borderRadius: 6 },
            { label: '% GTC/NM', data: whStats.map(w => parseFloat(w.gtcRate.toFixed(1))), backgroundColor: '#10B981', borderRadius: 6 }
        ], { yMax: 100 });

        // Bảng
        let tHtml = '<table><thead><tr><th>Kho</th><th>Nhận mới</th><th>% Gán</th><th>% GTC/NM</th><th>Hạng</th></tr></thead><tbody>';
        whStats.forEach((w, i) => {
            tHtml += `<tr><td>${w.wh}</td><td>${H.fmt(w.nhanMoi)}</td>
                <td><span class="badge ${H.badge(w.assignRate, 90, 75)}">${H.pct(w.assignRate)}</span></td>
                <td><span class="badge ${H.badge(w.gtcRate, 90, 75)}">${H.pct(w.gtcRate)}</span></td>
                <td>#${i + 1}</td></tr>`;
        });
        tHtml += '</tbody></table>';
        document.getElementById('go-table-area').innerHTML = tHtml;
    }

    document.getElementById('f-go-kho').addEventListener('change', _rerender);
    _rerender();
}

// =====================================================================
// MENU 8: ONTIME TOÀN TRÌNH
// =====================================================================
function renderOntimeToanTrinh(data, container) {
    if (!data || !data.length) { _renderFallback('Ontime toàn trình', data, container); return; }

    const sample = data[0];
    const colWH    = H.findCol(sample, ['kho', 'warehouse', 'Tên kho']);
    const colTotal = H.findCol(sample, ['tổng đơn', 'total', 'tổng đơn giao', 'Tổng đơn']);
    const colOntime = H.findCol(sample, ['đúng hẹn', 'ontime', 'đơn đúng hẹn', 'Đúng hẹn']);
    const colRate  = H.findCol(sample, ['tỷ lệ', 'ty_le', '%', 'ontime', 'Tỷ lệ ontime', '% ontime']);

    const khoList = H.uniqueVals(data, colWH);

    container.innerHTML = `
    <div class="filter-bar">
        ${_filterSelect('f-ot-kho', 'Kho', khoList)}
    </div>
    <div class="kpi-grid" id="ot-kpi"></div>
    <div class="grid-2">
        <div class="card">
            <h3 class="card-title">📊 % Ontime theo Kho</h3>
            <div class="chart-container"><canvas id="chart-ot-bar"></canvas></div>
        </div>
        <div class="card">
            <h3 class="card-title">📋 Bảng Ontime Toàn Trình</h3>
            <div class="table-wrapper" id="ot-table-area"></div>
        </div>
    </div>`;

    function _rerender() {
        const fKho = document.getElementById('f-ot-kho').value;
        let filtered = fKho ? data.filter(r => r[colWH] === fKho) : data;

        const totalDon = H.sumCol(filtered, colTotal);
        const totalOntime = H.sumCol(filtered, colOntime);
        // Nếu không tìm được cột tổng đơn/đúng hẹn, dùng cột tỷ lệ
        const pctOntime = totalDon > 0 ? (totalOntime / totalDon * 100) : H.avgCol(filtered, colRate);

        document.getElementById('ot-kpi').innerHTML =
            _kpiCard('local_shipping', 'orange', 'Tổng đơn giao', H.fmt(totalDon || filtered.length), '') +
            _kpiCard('check_circle', 'green', 'Đúng hẹn', H.fmt(totalOntime), '') +
            _kpiCard('schedule', 'blue', '% Ontime', H.pct(pctOntime),
                `<span class="badge ${H.badge(pctOntime, CONFIG.THRESHOLDS.ONTIME_GOOD, CONFIG.THRESHOLDS.ONTIME_WARN)}">${pctOntime >= CONFIG.THRESHOLDS.ONTIME_GOOD ? 'Tốt' : 'Cải thiện'}</span>`);

        // Biểu đồ + bảng
        Charts.destroyAll();
        const byWH = H.groupBy(filtered, colWH);
        const whStats = Object.entries(byWH).map(([wh, rows]) => {
            const tot = H.sumCol(rows, colTotal);
            const ot = H.sumCol(rows, colOntime);
            const rate = tot > 0 ? (ot / tot * 100) : H.avgCol(rows, colRate);
            const badgeCls = rate >= 90 ? 'success' : (rate >= 75 ? 'warning' : 'danger');
            const rank = rate >= 90 ? 'Tốt' : (rate >= 75 ? 'TB' : 'Kém');
            return { wh, total: tot || rows.length, ontime: ot, rate, badgeCls, rank };
        }).sort((a, b) => b.rate - a.rate);

        Charts.bar('chart-ot-bar', whStats.map(w => w.wh), [{
            label: 'Ontime%', data: whStats.map(w => parseFloat(w.rate.toFixed(1))),
            backgroundColor: whStats.map(w => Charts.colorByThreshold(w.rate, CONFIG.THRESHOLDS.ONTIME_GOOD, CONFIG.THRESHOLDS.ONTIME_WARN)),
            borderRadius: 6
        }], { yMax: 100 });

        let tHtml = '<table><thead><tr><th>Kho</th><th>Tổng đơn</th><th>Đúng hẹn</th><th>% OT</th><th>Xếp hạng</th></tr></thead><tbody>';
        whStats.forEach((w, i) => {
            tHtml += `<tr><td>${w.wh}</td><td>${H.fmt(w.total)}</td><td>${H.fmt(w.ontime)}</td>
                <td><span class="badge ${w.badgeCls}">${H.pct(w.rate)}</span></td>
                <td><span class="badge ${w.badgeCls}">#${i + 1} ${w.rank}</span></td></tr>`;
        });
        tHtml += '</tbody></table>';
        document.getElementById('ot-table-area').innerHTML = tHtml;
    }

    document.getElementById('f-ot-kho').addEventListener('change', _rerender);
    _rerender();
}

// =====================================================================
// MENU 9: LƯƠNG NVXL
// =====================================================================
function renderLuongNVXL(data, container) {
    if (!data || !data.length) { _renderFallback('Lương NVXL', data, container); return; }

    const sample = data[0];
    const colNV       = H.findCol(sample, ['nhân viên', 'nhan_vien', 'Tên NV', 'tên', 'driver', 'Mã NV']);
    const colWH       = H.findCol(sample, ['kho', 'warehouse', 'Tên kho']);
    const colSalaryGN = H.findCol(sample, ['Lương giao nhận', 'luong_giao_nhan', 'lương giao', 'Lương GN']);
    const colSalaryXL = H.findCol(sample, ['Lương xử lý', 'luong_xu_ly', 'lương xử lý', 'Lương XL']);
    const colTotal    = H.findCol(sample, ['Tổng lương', 'tong_luong', 'tổng', 'Tổng']);
    const colOps      = H.findCol(sample, ['Tổng thao tác', 'tong_thao_tac', 'thao tác', 'Thao tác']);
    const colWeight   = H.findCol(sample, ['Tổng khối lượng', 'tong_khoi_luong', 'khối lượng', 'KL']);

    const khoList = H.uniqueVals(data, colWH);

    container.innerHTML = `
    <div class="filter-bar">
        ${_filterSelect('f-luong-kho', 'Kho', khoList)}
    </div>
    <div class="kpi-grid" id="luong-kpi"></div>
    <div id="luong-alert-area"></div>
    <div class="grid-2">
        <div class="card">
            <h3 class="card-title">📊 Scatter: Thao tác vs Lương</h3>
            <div class="chart-container"><canvas id="chart-luong-scatter"></canvas></div>
        </div>
        <div class="card">
            <h3 class="card-title">📋 Bảng Lương Nhân Viên</h3>
            <div class="table-wrapper" id="luong-table-area"></div>
        </div>
    </div>`;

    function _rerender() {
        const fKho = document.getElementById('f-luong-kho').value;
        let filtered = fKho ? data.filter(r => r[colWH] === fKho) : data;

        // Tính thống kê NV
        const nvStats = filtered.map(r => {
            const gn = H.num(r[colSalaryGN]);
            const xl = H.num(r[colSalaryXL]);
            const total = H.num(r[colTotal]) || (gn + xl);
            const ops = H.num(r[colOps]);
            const weight = H.num(r[colWeight]);
            const costPerOp = ops > 0 ? total / ops : 0;
            return { name: r[colNV] || 'N/A', kho: r[colWH], gn, xl, total, ops, weight, costPerOp };
        });

        // Tính TB chi phí/thao tác chung
        const allCosts = nvStats.filter(n => n.ops > 0).map(n => n.costPerOp);
        const avgCost = allCosts.length > 0 ? allCosts.reduce((s, c) => s + c, 0) / allCosts.length : 0;

        // Phát hiện bất thường
        nvStats.forEach(n => {
            n.flag = '';
            n.flagCls = '';
            if (n.ops > 0 && avgCost > 0) {
                const ratio = n.costPerOp / avgCost;
                if (ratio >= CONFIG.THRESHOLDS.LUONG_BAT_THUONG) {
                    n.flag = '🚩 Bất thường'; n.flagCls = 'danger';
                } else if (ratio >= CONFIG.THRESHOLDS.LUONG_THEO_DOI) {
                    n.flag = '🟡 Theo dõi'; n.flagCls = 'warning';
                }
            }
        });

        const anomalies = nvStats.filter(n => n.flagCls === 'danger');
        const watchList = nvStats.filter(n => n.flagCls === 'warning');

        // KPI
        const totalNV = nvStats.length;
        const avgSalary = totalNV > 0 ? nvStats.reduce((s, n) => s + n.total, 0) / totalNV : 0;

        document.getElementById('luong-kpi').innerHTML =
            _kpiCard('payments', 'orange', 'TB Lương/NV', H.fmtMoney(avgSalary), '') +
            _kpiCard('precision_manufacturing', 'blue', 'TB CP/Thao tác', H.fmtMoney(avgCost), '') +
            _kpiCard('people', 'green', 'Tổng NV', H.fmt(totalNV), '');

        // Alert bất thường
        let alertHtml = '';
        if (anomalies.length > 0) {
            alertHtml = `<div class="alert alert-danger"><strong>🚩 Phát hiện ${anomalies.length} NV bất thường (CP/TT > ${CONFIG.THRESHOLDS.LUONG_BAT_THUONG}x TB):</strong><br>` +
                anomalies.map(a => `• <strong>${a.name}</strong> (${a.kho}): Lương ${H.fmtMoney(a.total)} / ${H.fmt(a.ops)} thao tác = ${H.fmtMoney(a.costPerOp)}/TT`).join('<br>') +
                '</div>';
        }
        if (watchList.length > 0) {
            alertHtml += `<div class="alert alert-warning"><strong>🟡 ${watchList.length} NV cần theo dõi (CP/TT ${CONFIG.THRESHOLDS.LUONG_THEO_DOI}-${CONFIG.THRESHOLDS.LUONG_BAT_THUONG}x TB):</strong><br>` +
                watchList.map(a => `• ${a.name} (${a.kho}): ${H.fmtMoney(a.costPerOp)}/TT`).join('<br>') +
                '</div>';
        }
        if (!anomalies.length && !watchList.length) {
            alertHtml = '<div class="alert alert-success">✅ Không phát hiện bất thường về lương.</div>';
        }
        document.getElementById('luong-alert-area').innerHTML = alertHtml;

        // Biểu đồ scatter: X = Thao tác, Y = Lương
        Charts.destroyAll();
        const scatterData = nvStats.filter(n => n.ops > 0).map(n => ({
            x: n.ops, y: n.total, name: n.name,
            color: n.flagCls === 'danger' ? '#EF4444' : (n.flagCls === 'warning' ? '#F59E0B' : '#F26522')
        }));
        Charts.scatter('chart-luong-scatter', scatterData, {
            label: 'NV', xLabel: 'Số thao tác', yLabel: 'Lương (đ)'
        });

        // Bảng NV
        const sorted = [...nvStats].sort((a, b) => b.costPerOp - a.costPerOp);
        let tHtml = '<table><thead><tr><th>NV</th><th>Kho</th><th>Lương GN</th><th>Lương XL</th><th>Tổng</th><th>TT</th><th>KL</th><th>CP/TT</th><th>Hạng</th></tr></thead><tbody>';
        sorted.slice(0, CONFIG.UI.MAX_TABLE_ROWS).forEach((n, i) => {
            const bgStyle = n.flagCls === 'danger' ? ' style="background:#FEF2F2"' : (n.flagCls === 'warning' ? ' style="background:#FFFBEB"' : '');
            tHtml += `<tr${bgStyle}>
                <td>${n.name}</td><td>${n.kho}</td>
                <td>${H.fmtMoney(n.gn)}</td><td>${H.fmtMoney(n.xl)}</td>
                <td><strong>${H.fmtMoney(n.total)}</strong></td>
                <td>${H.fmt(n.ops)}</td><td>${H.fmt(n.weight)}</td>
                <td>${H.fmtMoney(n.costPerOp)}</td>
                <td>${n.flag ? `<span class="badge ${n.flagCls} flag">${n.flag}</span>` : `#${i + 1}`}</td>
            </tr>`;
        });
        tHtml += '</tbody></table>';
        tHtml += `<p style="margin-top:8px;font-size:12px;color:#9CA3AF">TB CP/TT: ${H.fmtMoney(avgCost)} | Hiển thị ${Math.min(sorted.length, CONFIG.UI.MAX_TABLE_ROWS)} / ${sorted.length} NV</p>`;
        document.getElementById('luong-table-area').innerHTML = tHtml;
    }

    document.getElementById('f-luong-kho').addEventListener('change', _rerender);
    _rerender();
}

// =====================================================================
// MENU 10: ĐƠN TẠO
// =====================================================================
function renderDonTao(data, container) {
    if (!data || !data.length) { _renderFallback('Đơn tạo', data, container); return; }

    const sample = data[0];
    const colWH   = H.findCol(sample, ['kho', 'warehouse', 'Tên kho', 'kho giao']);
    const colDate = H.findCol(sample, ['ngày', 'date', 'ngày tạo', 'thời gian']);
    const colQty  = H.findCol(sample, ['số lượng', 'quantity', 'đơn tạo', 'sản lượng', 'số đơn']);

    const khoList = H.uniqueVals(data, colWH);

    container.innerHTML = `
    <div class="filter-bar">
        ${_filterSelect('f-dt-kho', 'Kho giao', khoList)}
    </div>
    <div class="kpi-grid" id="dt-kpi"></div>
    <div class="card">
        <h3 class="card-title">📊 Sản Lượng theo Kho</h3>
        <div class="chart-container"><canvas id="chart-dt-bar"></canvas></div>
    </div>
    <div class="card">
        <h3 class="card-title">📋 Bảng Đơn Tạo</h3>
        <div class="table-wrapper" id="dt-table-area"></div>
    </div>`;

    function _rerender() {
        const fKho = document.getElementById('f-dt-kho').value;
        let filtered = fKho ? data.filter(r => r[colWH] === fKho) : data;

        // Tính KPI - so sánh giữa các ngày nếu có
        const totalDon = colQty ? H.sumCol(filtered, colQty) : filtered.length;

        let soHQ = '--', soTT = '--', trendHQ = '', trendTT = '';
        if (colDate) {
            const byDate = H.groupBy(filtered, colDate);
            const dates = Object.keys(byDate).sort();
            if (dates.length >= 2) {
                const today = colQty ? H.sumCol(byDate[dates[dates.length - 1]], colQty) : byDate[dates[dates.length - 1]].length;
                const yesterday = colQty ? H.sumCol(byDate[dates[dates.length - 2]], colQty) : byDate[dates[dates.length - 2]].length;
                const diffPct = yesterday > 0 ? ((today - yesterday) / yesterday * 100) : 0;
                soHQ = H.fmt(yesterday);
                trendHQ = diffPct > 0
                    ? `<span class="trend-up">↑ +${diffPct.toFixed(1)}%</span>`
                    : `<span class="trend-down">↓ ${diffPct.toFixed(1)}%</span>`;
            }
            if (dates.length >= 8) {
                const today = colQty ? H.sumCol(byDate[dates[dates.length - 1]], colQty) : byDate[dates[dates.length - 1]].length;
                const lastWeek = colQty ? H.sumCol(byDate[dates[dates.length - 8]], colQty) : byDate[dates[dates.length - 8]].length;
                const diffPct = lastWeek > 0 ? ((today - lastWeek) / lastWeek * 100) : 0;
                soTT = H.fmt(lastWeek);
                trendTT = diffPct > 0
                    ? `<span class="trend-up">↑ +${diffPct.toFixed(1)}%</span>`
                    : `<span class="trend-down">↓ ${diffPct.toFixed(1)}%</span>`;
            }
        }

        document.getElementById('dt-kpi').innerHTML =
            _kpiCard('add_shopping_cart', 'orange', 'Tổng đơn tạo', H.fmt(totalDon), '') +
            _kpiCard('compare_arrows', 'blue', 'So hôm qua', soHQ, trendHQ) +
            _kpiCard('date_range', 'green', 'So tuần trước', soTT, trendTT);

        // Biểu đồ bar theo kho
        Charts.destroyAll();
        const byWH = H.groupBy(filtered, colWH);
        const whStats = Object.entries(byWH).map(([wh, rows]) => ({
            wh, total: colQty ? H.sumCol(rows, colQty) : rows.length
        })).sort((a, b) => b.total - a.total);

        Charts.bar('chart-dt-bar', whStats.map(w => w.wh), [{
            label: 'Đơn tạo', data: whStats.map(w => w.total),
            backgroundColor: '#F26522', borderRadius: 6
        }]);

        // Bảng: Kho | Số đơn | Trend (badge theo mức tăng)
        let tHtml = '<table><thead><tr><th>Kho</th><th>Số đơn</th><th>Đánh giá</th></tr></thead><tbody>';
        // Tính trend cho từng kho nếu có cột ngày
        whStats.forEach(w => {
            let trendBadge = '<span class="badge success">Ổn định</span>';
            if (colDate) {
                const khoRows = byWH[w.wh] || [];
                const byDateKho = H.groupBy(khoRows, colDate);
                const datesK = Object.keys(byDateKho).sort();
                if (datesK.length >= 2) {
                    const todayK = colQty ? H.sumCol(byDateKho[datesK[datesK.length - 1]], colQty) : byDateKho[datesK[datesK.length - 1]].length;
                    const yestK = colQty ? H.sumCol(byDateKho[datesK[datesK.length - 2]], colQty) : byDateKho[datesK[datesK.length - 2]].length;
                    const pct = yestK > 0 ? ((todayK - yestK) / yestK * 100) : 0;
                    if (pct > CONFIG.THRESHOLDS.DON_TAO_TANG) {
                        trendBadge = `<span class="badge danger">↑ +${pct.toFixed(0)}% ⚠ Tăng mạnh</span>`;
                    } else if (pct > CONFIG.THRESHOLDS.DON_TAO_ON) {
                        trendBadge = `<span class="badge warning">↑ +${pct.toFixed(0)}% Tăng nhẹ</span>`;
                    } else if (pct < -CONFIG.THRESHOLDS.DON_TAO_ON) {
                        trendBadge = `<span class="badge warning">↓ ${pct.toFixed(0)}% Giảm</span>`;
                    } else {
                        trendBadge = `<span class="badge success">± ${Math.abs(pct).toFixed(0)}% Ổn định</span>`;
                    }
                }
            }
            tHtml += `<tr><td>${w.wh}</td><td>${H.fmt(w.total)}</td><td>${trendBadge}</td></tr>`;
        });
        tHtml += '</tbody></table>';
        document.getElementById('dt-table-area').innerHTML = tHtml;
    }

    document.getElementById('f-dt-kho').addEventListener('change', _rerender);
    _rerender();
}

// =====================================================================
// MENU 11: TRẢ HÀNG
// =====================================================================
function renderTraHang(data, container) {
    if (!data || !data.length) { _renderFallback('Trả hàng', data, container); return; }

    const sample = data[0];
    const colWH     = H.findCol(sample, ['kho', 'warehouse', 'Tên kho']);
    const colReturn = H.findCol(sample, ['đơn trả', 'don_tra', 'trả hàng', 'số đơn trả']);
    const colTotal  = H.findCol(sample, ['tổng đơn', 'tong_don', 'tổng', 'total']);
    const colRate   = H.findCol(sample, ['% trả', 'ty_le_tra', 'tỷ lệ trả', '% trả hàng']);

    const khoList = H.uniqueVals(data, colWH);

    container.innerHTML = `
    <div class="filter-bar">
        ${_filterSelect('f-tra-kho', 'Kho', khoList)}
    </div>
    <div class="kpi-grid" id="tra-kpi"></div>
    <div class="grid-2">
        <div class="card">
            <h3 class="card-title">📊 % Trả Hàng theo Kho</h3>
            <div class="chart-container"><canvas id="chart-tra-bar"></canvas></div>
        </div>
        <div class="card">
            <h3 class="card-title">📋 Bảng Trả Hàng</h3>
            <div class="table-wrapper" id="tra-table-area"></div>
        </div>
    </div>`;

    function _rerender() {
        const fKho = document.getElementById('f-tra-kho').value;
        let filtered = fKho ? data.filter(r => r[colWH] === fKho) : data;

        const totalReturn = H.sumCol(filtered, colReturn);
        const totalOrders = H.sumCol(filtered, colTotal);
        const pctTra = colRate
            ? H.avgCol(filtered, colRate)
            : (totalOrders > 0 ? (totalReturn / totalOrders * 100) : 0);

        document.getElementById('tra-kpi').innerHTML =
            _kpiCard('assignment_return', 'red', 'Tổng đơn trả', H.fmt(totalReturn), '') +
            _kpiCard('percent', 'orange', 'Tỷ lệ trả%', H.pct(pctTra),
                `<span class="badge ${H.badgeReverse(pctTra, CONFIG.THRESHOLDS.TRA_GOOD, CONFIG.THRESHOLDS.TRA_WARN)}">${pctTra <= CONFIG.THRESHOLDS.TRA_GOOD ? 'Tốt' : pctTra <= CONFIG.THRESHOLDS.TRA_WARN ? 'TB' : 'Cao'}</span>`);

        // Biểu đồ + bảng
        Charts.destroyAll();
        const byWH = H.groupBy(filtered, colWH);
        const whStats = Object.entries(byWH).map(([wh, rows]) => {
            const ret = H.sumCol(rows, colReturn);
            const tot = H.sumCol(rows, colTotal);
            const rate = colRate ? H.avgCol(rows, colRate) : (tot > 0 ? (ret / tot * 100) : 0);
            const badgeCls = rate <= CONFIG.THRESHOLDS.TRA_GOOD ? 'success' : (rate <= CONFIG.THRESHOLDS.TRA_WARN ? 'warning' : 'danger');
            const rank = rate <= CONFIG.THRESHOLDS.TRA_GOOD ? 'Tốt' : (rate <= CONFIG.THRESHOLDS.TRA_WARN ? 'TB' : 'Cao');
            return { wh, ret, tot, rate, badgeCls, rank };
        }).sort((a, b) => a.rate - b.rate); // Sắp xếp: trả thấp lên đầu (tốt)

        Charts.bar('chart-tra-bar', whStats.map(w => w.wh), [{
            label: '% Trả hàng', data: whStats.map(w => parseFloat(w.rate.toFixed(1))),
            backgroundColor: whStats.map(w => Charts.colorByThresholdReverse(w.rate, CONFIG.THRESHOLDS.TRA_GOOD, CONFIG.THRESHOLDS.TRA_WARN)),
            borderRadius: 6
        }]);

        let tHtml = '<table><thead><tr><th>Kho</th><th>Tổng đơn</th><th>Đơn trả</th><th>% Trả</th><th>Xếp hạng</th></tr></thead><tbody>';
        whStats.forEach((w, i) => {
            tHtml += `<tr><td>${w.wh}</td><td>${H.fmt(w.tot)}</td><td>${H.fmt(w.ret)}</td>
                <td><span class="badge ${w.badgeCls}">${H.pct(w.rate)}</span></td>
                <td><span class="badge ${w.badgeCls}">#${i + 1} ${w.rank}</span></td></tr>`;
        });
        tHtml += '</tbody></table>';
        document.getElementById('tra-table-area').innerHTML = tHtml;
    }

    document.getElementById('f-tra-kho').addEventListener('change', _rerender);
    _rerender();
}

// =====================================================================
// EXPORT
// =====================================================================
const Pages = { render };
