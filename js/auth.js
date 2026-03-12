/**
 * 认证系统 - 登录/注册逻辑
 */

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        // 绑定事件
        this.bindEvents();
        
        // 检查是否已登录
        this.checkAuth();
    }

    bindEvents() {
        // 切换登录/注册表单
        const showRegister = document.getElementById('show-register');
        const showLogin = document.getElementById('show-login');
        
        if (showRegister) {
            showRegister.addEventListener('click', (e) => {
                e.preventDefault();
                this.showRegisterForm();
            });
        }
        
        if (showLogin) {
            showLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.showLoginForm();
            });
        }

        // 登录按钮
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.handleLogin());
        }

        // 注册按钮
        const registerBtn = document.getElementById('register-btn');
        if (registerBtn) {
            registerBtn.addEventListener('click', () => this.handleRegister());
        }

        // 忘记密码
        const forgotPassword = document.getElementById('forgot-password');
        if (forgotPassword) {
            forgotPassword.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleForgotPassword();
            });
        }

        // Enter 键提交
        document.getElementById('login-email')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });
        
        document.getElementById('login-password')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });
        
        document.getElementById('register-password-confirm')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleRegister();
        });
    }

    showLoginForm() {
        document.getElementById('login-form').classList.add('active');
        document.getElementById('register-form').classList.remove('active');
    }

    showRegisterForm() {
        document.getElementById('register-form').classList.add('active');
        document.getElementById('login-form').classList.remove('active');
    }

    async handleLogin() {
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
            window.showToast('请输入邮箱和密码');
            return;
        }

        if (!this.validateEmail(email)) {
            window.showToast('邮箱格式不正确');
            return;
        }

        try {
            window.showLoading('登录中...');
            
            // TODO: 调用 Supabase 登录 API
            // 临时方案：模拟登录
            await this.mockLogin(email, password);
            
            window.hideLoading();
            window.showToast('登录成功！');
            
            // 跳转到主界面
            this.enterMainScreen();
            
        } catch (error) {
            window.hideLoading();
            window.showToast('登录失败: ' + error.message);
            console.error('登录失败:', error);
        }
    }

    async handleRegister() {
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-password-confirm').value;
        const childName = document.getElementById('register-child-name').value.trim();

        if (!email || !password || !confirmPassword) {
            window.showToast('请填写所有必填项');
            return;
        }

        if (!this.validateEmail(email)) {
            window.showToast('邮箱格式不正确');
            return;
        }

        if (password.length < 6) {
            window.showToast('密码至少需要6位');
            return;
        }

        if (password !== confirmPassword) {
            window.showToast('两次密码输入不一致');
            return;
        }

        try {
            window.showLoading('注册中...');
            
            // TODO: 调用 Supabase 注册 API
            // 临时方案：模拟注册
            await this.mockRegister(email, password, childName);
            
            window.hideLoading();
            window.showToast('注册成功！');
            
            // 自动登录
            this.enterMainScreen();
            
        } catch (error) {
            window.hideLoading();
            window.showToast('注册失败: ' + error.message);
            console.error('注册失败:', error);
        }
    }

    handleForgotPassword() {
        const email = prompt('请输入您的注册邮箱：');
        
        if (!email) return;
        
        if (!this.validateEmail(email)) {
            window.showToast('邮箱格式不正确');
            return;
        }

        window.showToast('重置密码链接已发送到您的邮箱');
        
        // TODO: 调用 Supabase 重置密码 API
        console.log('发送重置密码邮件到:', email);
    }

    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    checkAuth() {
        // 检查 localStorage 是否有登录信息
        const userToken = localStorage.getItem('user_token');
        
        if (userToken) {
            // TODO: 验证 token 有效性
            this.enterMainScreen();
        } else {
            this.showAuthScreen();
        }
    }

    showAuthScreen() {
        document.getElementById('auth-screen').classList.remove('hidden');
        document.getElementById('main-screen').classList.add('hidden');
    }

    enterMainScreen() {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('main-screen').classList.remove('hidden');
        
        // 初始化主应用
        if (typeof window.initApp === 'function') {
            window.initApp();
        }
    }

    logout() {
        localStorage.removeItem('user_token');
        localStorage.removeItem('user_email');
        this.currentUser = null;
        this.showAuthScreen();
        window.showToast('已退出登录');
    }

    // 临时模拟登录（真实环境需调用 Supabase）
    async mockLogin(email, password) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // 简单验证（临时）
                if (password.length >= 6) {
                    localStorage.setItem('user_token', 'mock_token_' + Date.now());
                    localStorage.setItem('user_email', email);
                    this.currentUser = { email };
                    resolve();
                } else {
                    reject(new Error('密码错误'));
                }
            }, 1000);
        });
    }

    // 临时模拟注册（真实环境需调用 Supabase）
    async mockRegister(email, password, childName) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                localStorage.setItem('user_token', 'mock_token_' + Date.now());
                localStorage.setItem('user_email', email);
                if (childName) {
                    localStorage.setItem('child_name', childName);
                }
                this.currentUser = { email, childName };
                resolve();
            }, 1000);
        });
    }
}

// 初始化认证管理器
window.authManager = new AuthManager();
