// Authentication System

const AUTH_CONFIG = {
    username: 'Bismi',
    password: 'Admin123',
    sessionKey: 'bismi_store_auth'
};

// Check if user is authenticated
function isAuthenticated() {
    const auth = localStorage.getItem(AUTH_CONFIG.sessionKey);
    if (!auth) return false;
    
    try {
        const authData = JSON.parse(auth);
        // Check if session is still valid (24 hours)
        const now = new Date().getTime();
        if (now - authData.timestamp > 24 * 60 * 60 * 1000) {
            logout();
            return false;
        }
        return authData.authenticated === true;
    } catch (e) {
        return false;
    }
}

// Login function
function login(username, password) {
    if (username === AUTH_CONFIG.username && password === AUTH_CONFIG.password) {
        const authData = {
            authenticated: true,
            timestamp: new Date().getTime()
        };
        localStorage.setItem(AUTH_CONFIG.sessionKey, JSON.stringify(authData));
        return true;
    }
    return false;
}

// Logout function
function logout() {
    localStorage.removeItem(AUTH_CONFIG.sessionKey);
}

// Protect pages - redirect to login if not authenticated
function protectPage() {
    // Don't protect login page itself
    if (window.location.pathname.includes('login.html')) {
        // If already authenticated, redirect to index
        if (isAuthenticated()) {
            window.location.href = 'index.html';
        }
        return;
    }
    
    // Protect all other pages
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
    }
}

// Initialize authentication on page load
document.addEventListener('DOMContentLoaded', () => {
    // Setup login form if on login page
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const errorMessage = document.getElementById('errorMessage');
            
            if (login(username, password)) {
                // Success - redirect to index
                window.location.href = 'index.html';
            } else {
                // Show error
                errorMessage.classList.add('show');
                // Clear password field
                document.getElementById('password').value = '';
                // Hide error after 3 seconds
                setTimeout(() => {
                    errorMessage.classList.remove('show');
                }, 3000);
            }
        });
        
        // Auto-focus on username field
        document.getElementById('username').focus();
    }
    
    // Protect page if not login page
    protectPage();
});

// Export logout function for use in other scripts
window.logout = logout;

