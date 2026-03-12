/**
 * 认证系统 - 登录/注册逻辑（集成 Supabase）
 */

// Supabase 配置
const SUPABASE_URL = 'https://nwazdbafsgwuispakdnv.supabase.co';
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53YXpkYmFmc2d3dWlzcGFrZG52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNzM4NjYsImV4cCI6MjA4ODg0OTg2Nn0.lH7M2WvQ5g0tt7V0wPrXWkKDl2NICb0fwpklIAHFWcc";

// 初始化 Supabase 客户端
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.supabase = supabaseClient;
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
            
            // 调用 Supabase 登录 API
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) {
                throw error;
            }
            
            // 保存用户信息
            this.currentUser = data.user;
            localStorage.setItem('child_name', data.user.user_metadata?.child_name || '小朋友');
            
            // 读取用户设置（API Keys）
            await this.loadUserSettings(data.user.id);
            
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
        const childName = document.getElementById('register-child-name').value.trim() || '小朋友';

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
            
            // 调用 Supabase 注册 API
            const { data, error } = await this.supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        child_name: childName
                    }
                }
            });
            
            if (error) {
                throw error;
            }
            
            window.hideLoading();
            
            // 如果需要邮箱验证
            if (data.user && !data.session) {
                window.showToast('注册成功！请查收验证邮件');
                this.showLoginForm();
            } else {
                // 自动登录成功
                this.currentUser = data.user;
                localStorage.setItem('child_name', childName);
                window.showToast('注册成功！');
                this.enterMainScreen();
            }
            
        } catch (error) {
            window.hideLoading();
            window.showToast('注册失败: ' + error.message);
            console.error('注册失败:', error);
        }
    }

    async handleForgotPassword() {
        const email = prompt('请输入您的注册邮箱：');
        
        if (!email) return;
        
        if (!this.validateEmail(email)) {
            window.showToast('邮箱格式不正确');
            return;
        }

        try {
            window.showLoading('发送中...');
            
            const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/reset-password.html'
            });
            
            if (error) {
                throw error;
            }
            
            window.hideLoading();
            window.showToast('重置密码链接已发送到您的邮箱');
            
        } catch (error) {
            window.hideLoading();
            window.showToast('发送失败: ' + error.message);
            console.error('发送重置密码邮件失败:', error);
        }
    }

    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    async checkAuth() {
        try {
            // 检查 Supabase session
            const { data: { session } } = await this.supabase.auth.getSession();
            
            if (session) {
                this.currentUser = session.user;
                localStorage.setItem('child_name', session.user.user_metadata?.child_name || '小朋友');
                
                // 读取用户设置（API Keys）
                await this.loadUserSettings(session.user.id);
                
                this.enterMainScreen();
            } else {
                this.showAuthScreen();
            }
        } catch (error) {
            console.error('检查登录状态失败:', error);
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

    async logout() {
        try {
            await this.supabase.auth.signOut();
            localStorage.removeItem('child_name');
            localStorage.removeItem('openrouter_api_key');
            localStorage.removeItem('bailian_api_key');
            this.currentUser = null;
            this.showAuthScreen();
            window.showToast('已退出登录');
        } catch (error) {
            console.error('退出登录失败:', error);
            window.showToast('退出失败: ' + error.message);
        }
    }

    /**
     * 从 Supabase 读取用户设置（API Keys）
     */
    async loadUserSettings(userId) {
        try {
            const { data, error } = await this.supabase
                .from('user_settings')
                .select('openrouter_key, bailian_key')
                .eq('user_id', userId)
                .single();
            
            if (error) {
                if (error.code === 'PGRST116') {
                    // 记录不存在，使用默认 Keys
                    console.log('用户设置不存在，使用默认 API Keys');
                    this.setDefaultKeys();
                    await this.createDefaultSettings(userId);
                    return;
                }
                throw error;
            }
            
            if (data) {
                if (data.openrouter_key) {
                    localStorage.setItem('openrouter_api_key', data.openrouter_key);
                } else {
                    // 数据库没有 Key，使用默认
                    localStorage.setItem('openrouter_api_key', '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');
                }
                
                if (data.bailian_key) {
                    localStorage.setItem('bailian_api_key', data.bailian_key);
                } else {
                    // 数据库没有 Key，使用默认
                    localStorage.setItem('bailian_api_key', 'sk-sp-e2181324b29a4e909d569e3cc03283ec');
                }
                
                console.log('已加载用户 API 配置');
            }
        } catch (error) {
            console.error('加载用户设置失败:', error);
            // 失败时也使用默认 Keys
            this.setDefaultKeys();
        }
    }

    /**
     * 设置默认 API Keys
     */
    setDefaultKeys() {
        localStorage.setItem('openrouter_api_key', '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');
        localStorage.setItem('bailian_api_key', 'sk-sp-e2181324b29a4e909d569e3cc03283ec');
        console.log('已设置默认 API Keys');
    }

    /**
     * 创建默认用户设置
     */
    async createDefaultSettings(userId) {
        try {
            const { error } = await this.supabase
                .from('user_settings')
                .insert({
                    user_id: userId,
                    theme: 'dark',
                    notification_enabled: true
                });
            
            if (error) {
                console.error('创建默认设置失败:', error);
            }
        } catch (error) {
            console.error('创建默认设置异常:', error);
        }
    }

    /**
     * 保存用户设置到 Supabase
     */
    async saveUserSettings(openrouterKey, bailianKey) {
        if (!this.currentUser) {
            console.warn('用户未登录，无法保存设置');
            return;
        }

        try {
            const { error } = await this.supabase
                .from('user_settings')
                .upsert({
                    user_id: this.currentUser.id,
                    openrouter_key: openrouterKey || null,
                    bailian_key: bailianKey || null,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id'
                });
            
            if (error) {
                throw error;
            }
            
            // 同步到 localStorage
            if (openrouterKey) {
                localStorage.setItem('openrouter_api_key', openrouterKey);
            }
            if (bailianKey) {
                localStorage.setItem('bailian_api_key', bailianKey);
            }
            
            console.log('用户设置已保存');
        } catch (error) {
            console.error('保存用户设置失败:', error);
        }
    }
}

// 初始化认证管理器
window.authManager = new AuthManager();
