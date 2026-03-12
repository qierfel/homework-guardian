/**
 * 主程序入口 - app.js
 * 协调各模块，启动应用
 */

class HomeworkGuardianApp {
    constructor() {
        this.isSetupComplete = false;
        this.attentionCheckInterval = null;
        this.lastAlertTime = 0;
        this.currentStream = null;
        this.facingMode = 'user'; // 'user' 前置, 'environment' 后置
    }

    /**
     * 应用初始化
     */
    async init() {
        console.log('作业守护者 - 启动中...');

        // 监听用户第一次点击，激活 iOS TTS
        document.addEventListener('click', function activateTTS() {
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance('');
            u.volume = 0.01;
            u.lang = 'zh-CN';
            window.speechSynthesis.speak(u);
            document.removeEventListener('click', activateTTS);
            console.log('TTS 已激活');
        }, { once: true });

        // 检查是否已完成设置
        this.checkSetup();

        // 绑定设置页面事件
        this.bindSetupEvents();

        // 如果已完成设置，直接进入主界面
        if (this.isSetupComplete) {
            await this.enterMainScreen();
        }

        console.log('应用初始化完成');
    }

    /**
     * 检查设置状态
     */
    checkSetup() {
        const apiKey = window.aiAssistant.getApiKey();
        this.isSetupComplete = !!apiKey;
    }

    /**
     * 绑定设置页面事件
     */
    bindSetupEvents() {
        const saveBtn = document.getElementById('save-settings');
        
        saveBtn.addEventListener('click', () => {
            const apiKey = document.getElementById('api-key').value.trim();
            const bailianKey = document.getElementById('bailian-key').value.trim();
            const childName = document.getElementById('child-name').value.trim();

            if (!apiKey) {
                window.showToast('请输入 OpenRouter API Key');
                return;
            }
            
            if (!bailianKey) {
                window.showToast('请输入百炼 API Key');
                return;
            }

            // iOS TTS 激活
            try {
                window.speechSynthesis.cancel();
                const activate = new SpeechSynthesisUtterance('已启动');
                activate.lang = 'zh-CN';
                activate.volume = 1.0;
                activate.rate = 1.0;
                window.speechSynthesis.speak(activate);
            } catch(e) {
                console.log('TTS激活失败:', e);
            }

            // 保存设置
            window.aiAssistant.setApiKey(apiKey);
            localStorage.setItem('bailian_api_key', bailianKey);
            
            if (childName) {
                localStorage.setItem('child_name', childName);
            }

            this.isSetupComplete = true;
            
            // 进入主界面
            this.enterMainScreen();
        });
    }

    /**
     * 进入主界面
     */
    async enterMainScreen() {
        // 隐藏设置页面
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('main-screen').classList.remove('hidden');

        // 不自动初始化，等用户点击"开始守护"按钮
        console.log('已进入主界面，等待用户启动守护');
    }

    /**
     * 开始守护（由用户点击触发）
     */
    async startGuardian() {
        // 隐藏开始按钮
        const startBtn = document.getElementById('start-guardian-btn');
        if (startBtn) {
            startBtn.style.display = 'none';
        }

        try {
            window.showLoading('初始化中...');
            
            // 1. 初始化 UI 控制器（绑定所有按钮事件）
            window.uiController.init();
            
            // 2. 直接启动摄像头（最简单方式）
            const video = document.getElementById('camera-video');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user' }
            });
            
            video.srcObject = stream;
            this.currentStream = stream; // 保存 stream 供切换摄像头使用
            await video.play();
            
            // 3. 绑定摄像头控制按钮
            this.bindCameraControls();
            
            // 4. 启动注意力检测
            await this.startAttentionMonitoring();
            
            window.hideLoading();
            window.showToast('系统已就绪');
            
            console.log('所有模块初始化完成');
        } catch (error) {
            window.hideLoading();
            window.showToast('摄像头错误: ' + error.name + ' ' + error.message);
            console.error('摄像头启动失败:', error);
            
            // 更新状态显示错误
            const statusText = document.querySelector('#attention-status .status-text');
            if (statusText) {
                statusText.textContent = '摄像头错误: ' + (error.name || error.message);
            }
        }
    }

    /**
     * 初始化各模块
     */
    async initModules() {
        window.showLoading('初始化中...');
        await new Promise(r => setTimeout(r, 500));

        try {
            // 1. 初始化 UI 控制器
            window.uiController.init();

            // 2. 初始化摄像头
            const videoElement = document.getElementById('camera-video');
            const canvasElement = document.getElementById('camera-canvas');
            
            try {
                const cameraSuccess = await window.cameraManager.init(videoElement, canvasElement);
                
                if (!cameraSuccess) {
                    throw new Error('摄像头初始化失败');
                }
            } catch(e) {
                window.showToast('摄像头错误: ' + e.name + ' ' + e.message);
                console.error('摄像头初始化失败:', e);
                
                // 更新状态显示错误原因
                const statusText = document.querySelector('#attention-status .status-text');
                if (statusText) {
                    statusText.textContent = '摄像头错误: ' + (e.name || e.message);
                }
                
                throw e; // 继续抛出错误
            }

            // 3. 绑定摄像头控制按钮
            this.bindCameraControls();

            // 4. 启动注意力检测
            await this.startAttentionMonitoring();

            window.hideLoading();
            window.showToast('系统已就绪');

            console.log('所有模块初始化完成');
        } catch (error) {
            window.hideLoading();
            window.showToast('初始化失败: ' + error.message);
            console.error('初始化错误:', error);
        }
    }

    /**
     * 绑定摄像头控制按钮
     */
    bindCameraControls() {
        // 切换摄像头
        const toggleBtn = document.getElementById('toggle-camera');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', async () => {
                await this.toggleCamera();
            });
        }

        // 拍照分析作业
        const captureBtn = document.getElementById('capture-photo');
        if (captureBtn) {
            captureBtn.addEventListener('click', async () => {
                await this.capturePhoto();
            });
        }
    }

    /**
     * 切换前后摄像头
     */
    async toggleCamera() {
        try {
            window.showLoading('切换中...');
            
            // 停止当前 stream
            if (this.currentStream) {
                this.currentStream.getTracks().forEach(track => track.stop());
            }
            
            // 切换 facingMode
            this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
            
            // 启动新的摄像头
            const video = document.getElementById('camera-video');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: this.facingMode }
            });
            
            video.srcObject = stream;
            this.currentStream = stream;
            await video.play();
            
            window.hideLoading();
            window.showToast(`已切换到${this.facingMode === 'user' ? '前置' : '后置'}摄像头`);
        } catch (error) {
            window.hideLoading();
            window.showToast('切换失败: ' + error.message);
            console.error('切换摄像头失败:', error);
            
            // 切换失败，恢复原模式
            this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
        }
    }

    /**
     * 拍照
     */
    async capturePhoto() {
        try {
            const video = document.getElementById('camera-video');
            const canvas = document.getElementById('camera-canvas');
            
            if (!video.videoWidth || !video.videoHeight) {
                throw new Error('摄像头未就绪');
            }
            
            // 设置 canvas 尺寸
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            // 绘制当前帧
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // 转换为 base64
            const imageBase64 = canvas.toDataURL('image/jpeg', 0.85);
            
            console.log('拍照成功，图片大小:', (imageBase64.length / 1024).toFixed(2), 'KB');
            
            // 分析作业
            await this.analyzeHomework(imageBase64);
        } catch (error) {
            window.showToast('拍照失败: ' + error.message);
            console.error('拍照失败:', error);
        }
    }

    /**
     * 启动注意力监控
     */
    async startAttentionMonitoring() {
        const videoElement = document.getElementById('camera-video');

        await window.attentionDetector.startDetection(videoElement, (result) => {
            this.handleAttentionChange(result);
        });

        // 静默检查是否为降级模式（不显示提示）
        const status = window.attentionDetector.getStatus();
        if (!status.isMediaPipeAvailable) {
            // 降级模式：静默运行，状态会自动显示为"专注中"
            console.log('降级模式：使用摄像头 + 默认专注状态');
        } else {
            // MediaPipe 可用
            console.log('MediaPipe 模式：人脸检测已启用');
        }

        console.log('注意力监控已启动');
    }

    /**
     * 处理注意力状态变化
     */
    handleAttentionChange(result) {
        const status = result.status;
        const duration = result.focusDuration || result.distractedDuration || 0;
        const fallbackMode = result.fallbackMode || false;

        // 更新 UI 显示
        window.uiController.updateAttentionStatus(status, duration, fallbackMode);
        
        // 如果是专注状态，更新专注计时器
        if (status === 'focused') {
            window.uiController.updateFocusTimer(duration);
        }

        // 走神提醒
        if (shouldAlert) {
            this.alertDistraction();
        }
    }

    /**
     * 走神提醒
     */
    alertDistraction() {
        const now = Date.now();
        
        // 防止频繁提醒（至少间隔30秒）
        if (now - this.lastAlertTime < 30000) {
            return;
        }

        this.lastAlertTime = now;

        // 语音提醒
        const childName = localStorage.getItem('child_name') || '小朋友';
        const messages = [
            `${childName}，专心点哦！`,
            `${childName}，注意力集中！`,
            `${childName}，继续加油！`,
            `检测到走神啦，${childName}要认真写作业哦~`
        ];

        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        window.voiceManager.speak(randomMessage);

        // 显示提示
        window.showToast('⚠️ 专注提醒', 2000);

        // 增加走神计数
        window.uiController.incrementDistractionCount();

        console.log('触发走神提醒');
    }

    /**
     * 分析作业
     */
    async analyzeHomework(imageBase64) {
        window.showLoading('分析作业中...');

        try {
            const result = await window.aiAssistant.analyzeHomework(imageBase64);
            
            window.hideLoading();

            // 显示结果
            const { score, feedback } = result;
            
            // 切换到问答 Tab 显示结果
            window.uiController.switchTab('question');
            window.uiController.addChatMessage('请帮我看看这道题', true);
            window.uiController.addChatMessage(feedback);

            // 语音播报
            window.voiceManager.speak(feedback);

            // 更新报告
            if (score) {
                document.getElementById('homework-score').textContent = `${score}分`;
            }

            window.uiController.addTimelineEvent('作业分析', '拍照分析作业质量');

            console.log('作业分析完成:', result);
        } catch (error) {
            window.hideLoading();
            window.showToast('分析失败: ' + error.message);
            console.error(error);
        }
    }

    /**
     * 停止所有监控
     */
    stop() {
        window.attentionDetector.stopDetection();
        window.cameraManager.stopCamera();
        console.log('应用已停止');
    }
}

// 页面加载完成后启动应用
window.addEventListener('DOMContentLoaded', () => {
    window.app = new HomeworkGuardianApp();
    window.app.init();
});

// 页面关闭前停止摄像头
window.addEventListener('beforeunload', () => {
    if (window.app) {
        window.app.stop();
    }
});

// 注册 Service Worker（PWA 支持）
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
        .then(registration => {
            console.log('Service Worker 注册成功:', registration);
        })
        .catch(error => {
            console.log('Service Worker 注册失败:', error);
        });
}

// 设置按钮
document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('[data-tab="settings"]')?.addEventListener('click', () => {
        document.getElementById('main-screen').classList.add('hidden');
        document.getElementById('auth-screen').classList.remove('hidden');
    });
});
