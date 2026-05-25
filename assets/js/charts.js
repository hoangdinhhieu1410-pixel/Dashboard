/**
 * ===================================================================
 * CHARTS.JS - Tạo biểu đồ với Chart.js
 * ===================================================================
 */

const Charts = (() => {
    const _instances = [];  // Lưu tất cả biểu đồ đang hiển thị

    /** Hủy tất cả biểu đồ hiện tại (gọi trước khi chuyển trang) */
    function destroyAll() {
        _instances.forEach(c => { try { c.destroy(); } catch(e){} });
        _instances.length = 0;
    }

    /** Tạo biểu đồ Bar */
    function bar(canvasId, labels, datasets, options = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;
        const chart = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: datasets.length > 1, position: 'top' },
                    ...options.plugins
                },
                scales: {
                    y: { beginAtZero: true, ...(options.yMax ? { max: options.yMax } : {}) },
                    x: { ...(options.xOptions || {}) }
                },
                ...options.extra
            }
        });
        _instances.push(chart);
        return chart;
    }

    /** Tạo biểu đồ Line */
    function line(canvasId, labels, datasets, options = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        // Thêm đường ngưỡng ngang nếu có
        const annotations = {};
        if (options.threshold) {
            annotations.thresholdLine = {
                type: 'line',
                yMin: options.threshold.value,
                yMax: options.threshold.value,
                borderColor: options.threshold.color || '#EF4444',
                borderWidth: 2,
                borderDash: [6, 4],
                label: {
                    display: true,
                    content: options.threshold.label || '',
                    position: 'end'
                }
            };
        }

        const chart = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: datasets.length > 1, position: 'top' },
                    annotation: Object.keys(annotations).length ? { annotations } : undefined,
                    ...options.plugins
                },
                scales: {
                    y: { beginAtZero: options.yZero !== false, ...(options.yMax ? { max: options.yMax } : {}) },
                    x: {}
                }
            }
        });
        _instances.push(chart);
        return chart;
    }

    /** Tạo biểu đồ Scatter (cho phát hiện bất thường Lương) */
    function scatter(canvasId, dataPoints, options = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;
        const chart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: options.label || 'Dữ liệu',
                    data: dataPoints,
                    backgroundColor: dataPoints.map(p => p.color || '#F26522'),
                    pointRadius: 6,
                    pointHoverRadius: 9
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const p = ctx.raw;
                                return p.name ? `${p.name}: ${p.x} thao tác, ${H.fmtMoney(p.y)}` : '';
                            }
                        }
                    }
                },
                scales: {
                    x: { title: { display: true, text: options.xLabel || 'Thao tác' } },
                    y: { title: { display: true, text: options.yLabel || 'Lương (đ)' }, beginAtZero: true }
                }
            }
        });
        _instances.push(chart);
        return chart;
    }

    /** Tạo màu bar dựa trên giá trị và ngưỡng */
    function colorByThreshold(value, good, warn) {
        if (value >= good) return '#10B981';
        if (value >= warn) return '#F59E0B';
        return '#EF4444';
    }

    /** Tạo màu bar đảo ngược (giá trị thấp = tốt, VD: trả hàng) */
    function colorByThresholdReverse(value, good, warn) {
        if (value <= good) return '#10B981';
        if (value <= warn) return '#F59E0B';
        return '#EF4444';
    }

    return { destroyAll, bar, line, scatter, colorByThreshold, colorByThresholdReverse };
})();
