/**
 * ===================================================================
 * AUTH.JS - Xác thực đăng nhập bằng Google (chỉ @ghn.vn)
 * ===================================================================
 * Sử dụng Google Identity Services để đăng nhập.
 * Chỉ cho phép email có đuôi @ghn.vn truy cập Dashboard.
 * ===================================================================
 */

const Auth = (() => {
    const ALLOWED_DOMAIN = 'ghn.vn';
    const SESSION_KEY = 'ghn_auth_session';

    /** Kiểm tra đã đăng nhập chưa */
    function isLoggedIn() {
        const session = _getSession();
        if (!session) return false;
        // Session hết hạn sau 8 tiếng
        if (Date.now() - session.loginTime > 8 * 60 * 60 * 1000) {
            logout();
            return false;
        }
        return true;
    }

    /** Lấy thông tin user hiện tại */
    function getUser() {
        return _getSession();
    }

    /** Xử lý sau khi Google trả về credential */
    function handleGoogleCallback(response) {
        try {
            // Decode JWT token từ Google
            const payload = _decodeJWT(response.credential);
            const email = payload.email || '';
            const name = payload.name || '';
            const picture = payload.picture || '';
            const domain = email.split('@')[1] || '';

            if (domain.toLowerCase() !== ALLOWED_DOMAIN) {
                _showLoginError(
                    `⛔ Email <strong>${email}</strong> không được phép truy cập.<br>` +
                    `Chỉ chấp nhận email <strong>@${ALLOWED_DOMAIN}</strong>`
                );
                return;
            }

            // Lưu session
            const session = {
                email,
                name,
                picture,
                loginTime: Date.now()
            };
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));

            // Hiện dashboard, ẩn login
            _showDashboard();
        } catch (e) {
            _showLoginError('❌ Lỗi xác thực: ' + e.message);
        }
    }

    /** Đăng xuất */
    function logout() {
        sessionStorage.removeItem(SESSION_KEY);
        // Reload trang để hiện lại login
        window.location.reload();
    }

    /** Khởi tạo - kiểm tra session khi load trang */
    function init() {
        if (isLoggedIn()) {
            _showDashboard();
        } else {
            _showLogin();
        }
    }

    // ===================== PRIVATE =====================

    function _getSession() {
        try {
            return JSON.parse(sessionStorage.getItem(SESSION_KEY));
        } catch (e) {
            return null;
        }
    }

    /** Decode JWT token (không cần thư viện) */
    function _decodeJWT(token) {
        const parts = token.split('.');
        if (parts.length !== 3) throw new Error('Token không hợp lệ');
        const payload = parts[1];
        const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(decoded);
    }

    /** Hiện màn đăng nhập, ẩn dashboard */
    function _showLogin() {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('dashboard-app').classList.add('hidden');
    }

    /** Hiện dashboard, ẩn login */
    function _showDashboard() {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('dashboard-app').classList.remove('hidden');

        // Cập nhật user info trong header
        const user = getUser();
        if (user) {
            const userEl = document.getElementById('user-info');
            if (userEl) {
                userEl.innerHTML = `
                    <img src="${user.picture}" alt="" class="user-avatar" onerror="this.style.display='none'">
                    <span class="user-name">${user.name || user.email}</span>
                `;
            }
        }
    }

    /** Hiện lỗi trên login screen */
    function _showLoginError(message) {
        const el = document.getElementById('login-error');
        if (el) {
            el.innerHTML = message;
            el.classList.remove('hidden');
            // Rung animation
            el.classList.remove('shake');
            void el.offsetWidth;
            el.classList.add('shake');
        }
    }

    // Đăng ký callback toàn cục cho Google
    window.handleGoogleCallback = handleGoogleCallback;

    return { init, isLoggedIn, getUser, logout, handleGoogleCallback };
})();
