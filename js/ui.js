/**
 * UI 控制模块 - ui.js
 * 处理界面交互和状态更新
 */

class UIController {
    constructor() {
        this.currentTab = 'guardian';
        this.focusSeconds = 0;
        this.distractionCount = 0;
        this.questionCount = 0;
        this.timeline = [];
        this.initialized = false;
    }

    /**
     * 初始化 UI
     */
    init() {
        if (this.initialized) {
            console.log('UI 控制器已经初始化，跳过');
            return;
        }
        
        try {
            this.bindEvents();
            this.updateReportDate();
            this.initialized = true;
            console.log('✅ UI 控制器初始化完成');
        } catch (error) {
            console.error('❌ UI 控制器初始化失败:', error);
            throw error;
        }
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // Tab 切换
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = btn.dataset.tab;
                this.switchTab(tab);
            });
        });

        // 语音问答按钮（按住说话）
        const voiceBtn = document.getElementById('voice-ask-btn');
        if (voiceBtn) {
            voiceBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.startVoiceInput();
            });
            voiceBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.stopVoiceInput();
            });
            // 兼容鼠标操作
            voiceBtn.addEventListener('mousedown', () => this.startVoiceInput());
            voiceBtn.addEventListener('mouseup', () => this.stopVoiceInput());
        }

        // 拍照提问按钮
        const photoBtn = document.getElementById('photo-ask-btn');
        if (photoBtn) {
            photoBtn.addEventListener('click', () => {
                this.showPhotoChoiceModal();
            });
        }
        
        // 拍照选择弹窗按钮
        const choiceCamera = document.getElementById('choice-camera');
        const choiceUpload = document.getElementById('choice-upload');
        const choiceCancel = document.getElementById('choice-cancel');
        
        if (choiceCamera) {
            choiceCamera.addEventListener('click', () => {
                this.hidePhotoChoiceModal();
                this.openFullscreenCamera();
            });
        }
        
        if (choiceUpload) {
            choiceUpload.addEventListener('click', () => {
                this.hidePhotoChoiceModal();
                document.getElementById('upload-image-input').click();
            });
        }
        
        if (choiceCancel) {
            choiceCancel.addEventListener('click', () => {
                this.hidePhotoChoiceModal();
            });
        }
        
        // 全屏摄像头控制
        const closeFullscreenBtn = document.getElementById('close-fullscreen-camera');
        const toggleFullscreenBtn = document.getElementById('toggle-fullscreen-camera');
        const captureBtn = document.getElementById('capture-fullscreen-photo');
        
        if (closeFullscreenBtn) {
            closeFullscreenBtn.addEventListener('click', () => this.closeFullscreenCamera());
        }
        
        if (toggleFullscreenBtn) {
            toggleFullscreenBtn.addEventListener('click', () => this.toggleFullscreenCamera());
        }
        
        if (captureBtn) {
            captureBtn.addEventListener('click', () => this.captureFullscreenPhoto());
        }
        
        // 图片上传
        const uploadInput = document.getElementById('upload-image-input');
        if (uploadInput) {
            uploadInput.addEventListener('change', (e) => this.handleImageUpload(e));
        }
        
        // 清空对话历史
        const clearHistoryBtn = document.getElementById('clear-history-btn');
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', () => this.clearConversationHistory());
        }

        // 文字提问
        const sendBtn = document.getElementById('send-text-btn');
        const textInput = document.getElementById('text-input');
        
        if (sendBtn && textInput) {
            sendBtn.addEventListener('click', () => {
                const text = textInput.value.trim();
                if (text) {
                    this.handleUserQuestion(text);
                    textInput.value = '';
                }
            });

            textInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    sendBtn.click();
                }
            });
        }

        // 重置报告
        const resetBtn = document.getElementById('reset-report-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('确定要重置今日数据吗？')) {
                    this.resetReport();
                }
            });
        }
    }

    /**
     * 切换 Tab
     */
    switchTab(tabName) {
        this.currentTab = tabName;

        // 更新 Tab 内容显示
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.getElementById(`tab-${tabName}`).classList.add('active');

        // 更新导航按钮状态
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`.nav-item[data-tab="${tabName}"]`).classList.add('active');

        console.log('切换到 Tab:', tabName);
    }

    /**
     * 更新注意力状态显示
     */
    updateAttentionStatus(status, duration, fallbackMode = false) {
        const badge = document.getElementById('attention-status');
        const statusIcon = badge.querySelector('.status-icon');
        const statusText = badge.querySelector('.status-text');

        // 移除所有状态类
        badge.classList.remove('focused', 'distracted', 'absent');

        // 降级模式：显示专注状态（不让用户感知降级）
        if (fallbackMode) {
            badge.classList.add('focused');
            statusIcon.textContent = '✅';
            statusText.textContent = '专注中';
            this.focusSeconds = duration;
            return;
        }

        switch (status) {
            case 'focused':
                badge.classList.add('focused');
                statusIcon.textContent = '✅';
                statusText.textContent = '专注中';
                this.focusSeconds = duration;
                break;
            case 'distracted':
                badge.classList.add('distracted');
                statusIcon.textContent = '⚠️';
                statusText.textContent = `走神 ${duration || 0}秒`;
                break;
            case 'absent':
                statusIcon.textContent = '❓';
                statusText.textContent = '未检测到';
                break;
        }
    }

    /**
     * 更新专注时长显示
     */
    updateFocusTimer(seconds) {
        const timer = document.getElementById('focus-duration');
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        timer.textContent = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    /**
     * 添加聊天消息
     */
    addChatMessage(text, isUser = false, imageBase64 = null) {
        const messagesContainer = document.getElementById('chat-messages');
        
        // 移除欢迎消息
        const welcomeMsg = messagesContainer.querySelector('.welcome-message');
        if (welcomeMsg) {
            welcomeMsg.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user' : 'ai'}`;
        
        // 如果有图片，添加图片预览
        let content = text;
        if (imageBase64) {
            content = `
                <img src="${imageBase64}" 
                     style="max-width:200px;max-height:200px;border-radius:8px;cursor:pointer;display:block;margin-bottom:8px;" 
                     onclick="window.uiController.showImageFullscreen('${imageBase64}')"
                     alt="图片">
                <div>${text}</div>
            `;
        }
        
        messageDiv.innerHTML = `
            <div class="message-avatar">${isUser ? '👦' : '🤖'}</div>
            <div class="message-bubble">${content}</div>
        `;

        messagesContainer.appendChild(messageDiv);
        
        // 滚动到底部
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    /**
     * 开始语音输入
     */
    startVoiceInput() {
        console.log('🎤 startVoiceInput 被调用');
        
        const voiceBtn = document.getElementById('voice-ask-btn');
        if (!voiceBtn) {
            console.error('找不到语音按钮');
            return;
        }
        
        const voiceText = voiceBtn.querySelector('.voice-text');
        
        voiceBtn.classList.add('listening');
        if (voiceText) {
            voiceText.textContent = '松开发送...';
        }

        if (window.voiceManager && typeof window.voiceManager.startListening === 'function') {
            window.voiceManager.startListening((text) => {
                console.log('语音识别回调，文本:', text);
                this.handleUserQuestion(text);
            });
        } else {
            console.error('voiceManager 不可用');
            window.showToast('语音功能不可用');
        }
    }

    /**
     * 停止语音输入
     */
    stopVoiceInput() {
        console.log('🎤 stopVoiceInput 被调用');
        
        const voiceBtn = document.getElementById('voice-ask-btn');
        if (!voiceBtn) {
            console.error('找不到语音按钮');
            return;
        }
        
        const voiceText = voiceBtn.querySelector('.voice-text');
        
        voiceBtn.classList.remove('listening');
        if (voiceText) {
            voiceText.textContent = '按住说话';
        }

        if (window.voiceManager && typeof window.voiceManager.stopListening === 'function') {
            console.log('调用 voiceManager.stopListening()');
            window.voiceManager.stopListening();
        } else {
            console.error('voiceManager 不可用');
        }
    }

    /**
     * 显示拍照选择弹窗
     */
    showPhotoChoiceModal() {
        const modal = document.getElementById('photo-choice-modal');
        if (modal) {
            modal.style.display = 'block';
            
            // 添加按钮悬停效果
            const buttons = modal.querySelectorAll('button[id^="choice-"]');
            buttons.forEach(btn => {
                if (btn.id !== 'choice-cancel') {
                    btn.onmouseenter = () => {
                        btn.style.transform = 'scale(1.05)';
                    };
                    btn.onmouseleave = () => {
                        btn.style.transform = 'scale(1)';
                    };
                }
            });
        }
    }

    /**
     * 隐藏拍照选择弹窗
     */
    hidePhotoChoiceModal() {
        const modal = document.getElementById('photo-choice-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * 打开全屏摄像头
     */
    async openFullscreenCamera() {
        try {
            const container = document.getElementById('fullscreen-camera');
            const video = document.getElementById('fullscreen-camera-video');
            
            if (!container || !video) {
                throw new Error('找不到摄像头界面');
            }
            
            // 显示界面
            container.style.display = 'block';
            
            // 启动摄像头
            window.showToast('正在启动摄像头...');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: this.fullscreenCameraFacing || 'environment' } // 默认后置
            });
            
            video.srcObject = stream;
            this.fullscreenCameraStream = stream;
            this.fullscreenCameraFacing = 'environment';
            
            await video.play();
            console.log('全屏摄像头已启动');
            
        } catch (error) {
            console.error('启动摄像头失败:', error);
            window.showToast('摄像头启动失败: ' + error.message);
            this.closeFullscreenCamera();
        }
    }

    /**
     * 切换全屏摄像头（前后）
     */
    async toggleFullscreenCamera() {
        try {
            const video = document.getElementById('fullscreen-camera-video');
            if (!video) return;
            
            // 停止当前流
            if (this.fullscreenCameraStream) {
                this.fullscreenCameraStream.getTracks().forEach(track => track.stop());
            }
            
            // 切换方向
            this.fullscreenCameraFacing = this.fullscreenCameraFacing === 'user' ? 'environment' : 'user';
            
            // 启动新摄像头
            window.showToast('切换中...');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: this.fullscreenCameraFacing }
            });
            
            video.srcObject = stream;
            this.fullscreenCameraStream = stream;
            await video.play();
            
            window.showToast(`已切换到${this.fullscreenCameraFacing === 'user' ? '前置' : '后置'}摄像头`);
        } catch (error) {
            console.error('切换摄像头失败:', error);
            window.showToast('切换失败');
            this.fullscreenCameraFacing = this.fullscreenCameraFacing === 'user' ? 'environment' : 'user';
        }
    }

    /**
     * 拍照（全屏模式）
     */
    async captureFullscreenPhoto() {
        try {
            const video = document.getElementById('fullscreen-camera-video');
            const canvas = document.getElementById('camera-canvas');
            
            if (!video || !video.videoWidth) {
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
            
            // 关闭摄像头
            this.closeFullscreenCamera();
            
            // 发送给 AI
            await this.sendImageToAI(imageBase64);
            
        } catch (error) {
            console.error('拍照失败:', error);
            window.showToast('拍照失败: ' + error.message);
        }
    }

    /**
     * 关闭全屏摄像头
     */
    closeFullscreenCamera() {
        const container = document.getElementById('fullscreen-camera');
        const video = document.getElementById('fullscreen-camera-video');
        
        if (this.fullscreenCameraStream) {
            this.fullscreenCameraStream.getTracks().forEach(track => track.stop());
            this.fullscreenCameraStream = null;
        }
        
        if (video) {
            video.srcObject = null;
        }
        
        if (container) {
            container.style.display = 'none';
        }
    }

    /**
     * 处理图片上传
     */
    async handleImageUpload(event) {
        try {
            const file = event.target.files[0];
            if (!file) return;
            
            // 检查文件类型
            if (!file.type.startsWith('image/')) {
                window.showToast('请选择图片文件');
                return;
            }
            
            // 检查文件大小（限制5MB）
            if (file.size > 5 * 1024 * 1024) {
                window.showToast('图片太大，请选择小于5MB的图片');
                return;
            }
            
            window.showLoading('正在读取图片...');
            
            // 读取文件为 base64
            const reader = new FileReader();
            reader.onload = async (e) => {
                const imageBase64 = e.target.result;
                console.log('图片已读取，大小:', (imageBase64.length / 1024).toFixed(2), 'KB');
                
                window.hideLoading();
                
                // 发送给 AI
                await this.sendImageToAI(imageBase64);
            };
            
            reader.onerror = () => {
                window.hideLoading();
                window.showToast('读取图片失败');
            };
            
            reader.readAsDataURL(file);
            
            // 清空 input，允许再次选择同一文件
            event.target.value = '';
            
        } catch (error) {
            console.error('处理图片失败:', error);
            window.showToast('处理图片失败: ' + error.message);
        }
    }

    /**
     * 发送图片给 AI 分析
     */
    async sendImageToAI(imageBase64) {
        try {
            // 显示用户消息（带图片预览）
            this.addChatMessage('📷 [图片]', true, imageBase64);
            
            // 显示加载
            window.showLoading('AI 正在分析图片...');
            
            console.log('准备调用 AI');
            const answer = await window.aiAssistant.askQuestionWithImage('请帮我看看这道题', imageBase64);
            console.log('AI 返回结果:', answer);
            
            // 隐藏加载
            window.hideLoading();
            
            // 显示 AI 回复
            if (answer) {
                this.addChatMessage(answer);
                
                // 播放语音（如果可用）
                if (window.voiceManager) {
                    window.voiceManager.speak(answer);
                }
                
                // 更新对话计数
                this.updateConversationCount();
            }
            
            console.log('✅ 图片提问完成');
            
        } catch (error) {
            window.hideLoading();
            console.error('❌ AI 分析失败:', error);
            window.showToast('AI 分析失败: ' + error.message);
        }
    }

    /**
     * 显示摄像头预览（问问页面）
     */
    async showCameraPreview() {
        try {
            const preview = document.getElementById('question-camera-preview');
            const video = document.getElementById('question-camera-video');
            
            if (!preview || !video) {
                throw new Error('找不到预览元素');
            }
            
            // 显示预览区
            preview.style.display = 'block';
            
            // 如果已经有视频流，直接使用
            if (video.srcObject) {
                return;
            }
            
            // 启动摄像头
            window.showToast('正在启动摄像头...');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: this.questionCameraFacing || 'user' }
            });
            
            video.srcObject = stream;
            this.questionCameraStream = stream;
            this.questionCameraFacing = 'user';
            
            await video.play();
            window.showToast('摄像头已启动，调整角度后点击"拍照提问"');
            
            // 改变按钮文字
            const photoBtn = document.getElementById('photo-ask-btn');
            if (photoBtn) {
                photoBtn.textContent = '📸 拍照并提问';
                photoBtn.onclick = () => this.handlePhotoQuestion();
            }
            
        } catch (error) {
            console.error('启动摄像头失败:', error);
            window.showToast('摄像头启动失败: ' + error.message);
        }
    }

    /**
     * 切换前后摄像头（问问页面）
     */
    async toggleQuestionCamera() {
        try {
            const video = document.getElementById('question-camera-video');
            if (!video) return;
            
            // 停止当前流
            if (this.questionCameraStream) {
                this.questionCameraStream.getTracks().forEach(track => track.stop());
            }
            
            // 切换方向
            this.questionCameraFacing = this.questionCameraFacing === 'user' ? 'environment' : 'user';
            
            // 启动新摄像头
            window.showToast('切换中...');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: this.questionCameraFacing }
            });
            
            video.srcObject = stream;
            this.questionCameraStream = stream;
            await video.play();
            
            window.showToast(`已切换到${this.questionCameraFacing === 'user' ? '前置' : '后置'}摄像头`);
        } catch (error) {
            console.error('切换摄像头失败:', error);
            window.showToast('切换失败');
            // 恢复原方向
            this.questionCameraFacing = this.questionCameraFacing === 'user' ? 'environment' : 'user';
        }
    }

    /**
     * 关闭摄像头预览
     */
    closeCameraPreview() {
        const preview = document.getElementById('question-camera-preview');
        const video = document.getElementById('question-camera-video');
        
        if (this.questionCameraStream) {
            this.questionCameraStream.getTracks().forEach(track => track.stop());
            this.questionCameraStream = null;
        }
        
        if (video) {
            video.srcObject = null;
        }
        
        if (preview) {
            preview.style.display = 'none';
        }
        
        // 恢复按钮
        const photoBtn = document.getElementById('photo-ask-btn');
        if (photoBtn) {
            photoBtn.textContent = '📷 拍照提问';
            photoBtn.onclick = () => this.showCameraPreview();
        }
    }

    /**
     * 处理拍照提问
     */
    async handlePhotoQuestion() {
        try {
            console.log('📷 开始拍照提问');
            
            // 显示加载提示
            window.showLoading('拍照中...');
            
            // 优先使用问问页面的摄像头预览
            let video = document.getElementById('question-camera-video');
            let canvas = document.getElementById('camera-canvas');
            
            // 如果问问页面没有摄像头，使用守护页面的
            if (!video || !video.srcObject) {
                console.log('问问页面无摄像头，使用守护页面的');
                video = document.getElementById('camera-video');
            }
            
            console.log('video元素:', video);
            console.log('canvas元素:', canvas);
            console.log('video.readyState:', video?.readyState);
            console.log('video.videoWidth:', video?.videoWidth);
            console.log('video.videoHeight:', video?.videoHeight);
            console.log('video.srcObject:', video?.srcObject);
            
            if (!video) {
                throw new Error('找不到摄像头元素，请先进入守护页面');
            }
            
            if (!canvas) {
                throw new Error('找不到画布元素');
            }
            
            // 检查视频是否就绪
            if (video.readyState < 2) {
                console.log('视频未就绪，等待...');
                window.showToast('等待摄像头就绪...');
                
                // 等待视频加载
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('摄像头加载超时'));
                    }, 5000);
                    
                    video.addEventListener('loadeddata', () => {
                        clearTimeout(timeout);
                        resolve();
                    }, { once: true });
                    
                    // 如果已经有 srcObject，尝试播放
                    if (video.srcObject) {
                        video.play().catch(e => console.log('播放失败:', e));
                    }
                });
            }
            
            // 再次检查尺寸
            if (!video.videoWidth || !video.videoHeight) {
                // 如果没有 srcObject，需要启动摄像头
                if (!video.srcObject) {
                    console.log('没有视频流，尝试启动摄像头...');
                    window.showToast('正在启动摄像头...');
                    
                    const stream = await navigator.mediaDevices.getUserMedia({
                        video: { facingMode: 'user' }
                    });
                    video.srcObject = stream;
                    await video.play();
                    
                    // 等待视频就绪
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                
                // 最后一次检查
                if (!video.videoWidth || !video.videoHeight) {
                    throw new Error('无法获取摄像头画面，请先在守护页面启动摄像头');
                }
            }
            
            console.log('摄像头已就绪:', video.videoWidth, 'x', video.videoHeight);
            
            // 设置 canvas 尺寸
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            // 绘制当前帧
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // 转换为 base64
            const imageBase64 = canvas.toDataURL('image/jpeg', 0.85);
            
            // 检查图片是否有效（不是空白图）
            if (imageBase64.length < 1000) {
                throw new Error('拍照失败：图片无效');
            }
            
            console.log('拍照成功，图片大小:', (imageBase64.length / 1024).toFixed(2), 'KB');
            
            window.hideLoading();
            
            // 显示提示消息
            this.addChatMessage('📷 [图片]', true);
            
            // 显示加载
            window.showLoading('AI 正在分析图片...');
            
            // 调用 AI 分析
            console.log('准备调用 AI，图片大小:', (imageBase64.length / 1024).toFixed(2), 'KB');
            console.log('调用 askQuestionWithImage...');
            
            let answer;
            try {
                answer = await window.aiAssistant.askQuestionWithImage('请帮我看看这道题', imageBase64);
                console.log('AI 返回结果:', answer);
            } catch (aiError) {
                console.error('AI 调用失败:', aiError);
                throw new Error('AI 分析失败: ' + aiError.message);
            }
            
            // 隐藏加载
            window.hideLoading();
            
            // 显示 AI 回复
            if (answer) {
                this.addChatMessage(answer);
                console.log('已显示 AI 回复');
                
                // 播放语音（如果可用）
                if (window.voiceManager) {
                    window.voiceManager.speak(answer);
                }
            } else {
                throw new Error('AI 返回空结果');
            }
            
            console.log('✅ 拍照提问完成');
        } catch (error) {
            window.hideLoading();
            console.error('❌ 拍照提问失败:', error);
            console.error('错误栈:', error.stack);
            window.showToast('拍照失败: ' + error.message);
        }
    }

    /**
     * 处理用户提问
     */
    async handleUserQuestion(question) {
        // 显示用户消息
        this.addChatMessage(question, true);
        
        // 显示加载
        window.showLoading('思考中...');

        try {
            // 调用 AI
            const answer = await window.aiAssistant.askQuestion(question);
            
            // 隐藏加载
            window.hideLoading();
            
            // 显示 AI 回复
            this.addChatMessage(answer);
            
            // 语音播报
            if (window.voiceManager && typeof window.voiceManager.speak === 'function') {
                window.voiceManager.speak(answer);
            } else {
                console.warn('voiceManager 不可用，跳过语音播报');
            }
            
            // 更新统计和对话计数
            this.questionCount++;
            this.updateReportStats();
            this.updateConversationCount();
            
            // 记录时间线
            this.addTimelineEvent('提问', question);
            
        } catch (error) {
            window.hideLoading();
            window.showToast('AI 回答失败: ' + error.message);
            console.error(error);
        }
    }

    /**
     * 更新报告日期
     */
    updateReportDate() {
        const reportDate = document.getElementById('report-date');
        const now = new Date();
        const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
        reportDate.textContent = dateStr;
    }

    /**
     * 更新报告统计数据
     */
    updateReportStats() {
        // 累计专注时长
        const minutes = Math.floor(this.focusSeconds / 60);
        document.getElementById('total-focus-time').textContent = `${minutes}分钟`;

        // 走神次数
        document.getElementById('distraction-count').textContent = `${this.distractionCount}次`;

        // 提问数量
        document.getElementById('question-count').textContent = `${this.questionCount}个`;
    }

    /**
     * 添加时间线事件
     */
    addTimelineEvent(type, description) {
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        const event = {
            time: timeStr,
            type: type,
            description: description
        };

        this.timeline.push(event);
        this.updateTimeline();
    }

    /**
     * 更新时间线显示
     */
    updateTimeline() {
        const timelineList = document.getElementById('timeline-list');
        
        // 清空现有内容
        timelineList.innerHTML = '';

        // 倒序显示（最新在前）
        const recentEvents = this.timeline.slice(-10).reverse();

        recentEvents.forEach(event => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'timeline-item';
            itemDiv.innerHTML = `
                <div class="timeline-time">${event.time}</div>
                <div class="timeline-event">
                    <strong>${event.type}:</strong> ${event.description}
                </div>
            `;
            timelineList.appendChild(itemDiv);
        });

        // 如果没有事件
        if (recentEvents.length === 0) {
            timelineList.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px;">暂无记录</p>';
        }
    }

    /**
     * 重置报告数据
     */
    resetReport() {
        this.focusSeconds = 0;
        this.distractionCount = 0;
        this.questionCount = 0;
        this.timeline = [];

        this.updateReportStats();
        this.updateTimeline();

        window.showToast('数据已重置');
    }

    /**
     * 增加走神次数
     */
    incrementDistractionCount() {
        this.distractionCount++;
        this.updateReportStats();
        this.addTimelineEvent('走神提醒', '检测到注意力不集中');
    }
}

// 全局 Toast 提示函数
window.showToast = function(message, duration = 5000) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
};

// 全局加载提示函数
window.showLoading = function(message = '加载中...') {
    const overlay = document.getElementById('loading-overlay');
    const text = document.getElementById('loading-text');
    text.textContent = message;
    overlay.classList.remove('hidden');
};

window.hideLoading = function() {
    const overlay = document.getElementById('loading-overlay');
    overlay.classList.add('hidden');
};

// 汉字笔顺显示函数
window.showHanziWriter = function(character) {
    console.log('📝 showHanziWriter 被调用，汉字:', character);
    
    const container = document.getElementById('hanzi-container');
    const grid = document.getElementById('hanzi-grid');
    
    if (!container || !grid) {
        console.error('❌ 找不到汉字容器元素');
        return;
    }
    
    if (typeof HanziWriter === 'undefined') {
        console.error('❌ HanziWriter 未加载');
        window.showToast('汉字笔顺功能未加载');
        return;
    }
    
    try {
        // 清空并显示容器
        grid.innerHTML = '';
        container.style.display = 'block';
        
        // 滚动到汉字容器
        container.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        console.log('创建 HanziWriter...');
        const writer = HanziWriter.create(grid, character, {
            width: 250,
            height: 250,
            padding: 5,
            showOutline: true,
            showCharacter: false,
            strokeAnimationSpeed: 1,
            delayBetweenStrokes: 300,
            strokeColor: '#4CAF50',
            outlineColor: '#666',
            radicalColor: '#4CAF50'
        });
        
        // 等待 SVG 创建后绘制田字格
        setTimeout(() => {
            const svg = grid.querySelector('svg');
            if (svg) {
                console.log('绘制田字格...');
                
                // 白色背景
                const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                bg.setAttribute('x', '0');
                bg.setAttribute('y', '0');
                bg.setAttribute('width', '250');
                bg.setAttribute('height', '250');
                bg.setAttribute('fill', '#ffffff');
                svg.insertBefore(bg, svg.firstChild);
                
                // 外框（红色）
                const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.setAttribute('x', '5');
                rect.setAttribute('y', '5');
                rect.setAttribute('width', '240');
                rect.setAttribute('height', '240');
                rect.setAttribute('fill', 'none');
                rect.setAttribute('stroke', '#ff0000');
                rect.setAttribute('stroke-width', '2');
                svg.appendChild(rect);
                
                // 十字线（虚线）
                const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line1.setAttribute('x1', '125');
                line1.setAttribute('y1', '5');
                line1.setAttribute('x2', '125');
                line1.setAttribute('y2', '245');
                line1.setAttribute('stroke', '#999');
                line1.setAttribute('stroke-width', '1');
                line1.setAttribute('stroke-dasharray', '5,5');
                svg.appendChild(line1);
                
                const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line2.setAttribute('x1', '5');
                line2.setAttribute('y1', '125');
                line2.setAttribute('x2', '245');
                line2.setAttribute('y2', '125');
                line2.setAttribute('stroke', '#999');
                line2.setAttribute('stroke-width', '1');
                line2.setAttribute('stroke-dasharray', '5,5');
                svg.appendChild(line2);
                
                console.log('✅ 田字格绘制完成');
            } else {
                console.error('❌ 找不到 SVG 元素');
            }
        }, 100);
        
        console.log('✅ HanziWriter 创建成功，开始动画');
        writer.animateCharacter();
        
        // 点击重播
        grid.onclick = () => {
            console.log('🔄 重播笔顺');
            writer.animateCharacter();
        };
        
        const hintElement = document.getElementById('hanzi-hint');
        if (hintElement) {
            hintElement.textContent = `"${character}" 字的笔顺 - 点击重播`;
        }
        
        window.showToast(`✅ 正在播放"${character}"的笔顺`);
        
    } catch (error) {
        console.error('❌ 显示汉字笔顺失败:', error);
        window.showToast('显示笔顺失败: ' + error.message);
    }
}

/**
 * 更新对话计数
 */
UIController.prototype.updateConversationCount = function() {
    const countElement = document.getElementById('conversation-count');
    if (countElement && window.aiAssistant) {
        const count = window.aiAssistant.getConversationCount();
        countElement.textContent = `连续对话: ${count} 轮`;
    }
};

/**
 * 清空对话历史
 */
UIController.prototype.clearConversationHistory = function() {
    if (!window.aiAssistant) return;
    
    const confirmed = confirm('确定要清空对话历史吗？AI 将不再记得之前的内容。');
    if (!confirmed) return;
    
    // 清空 AI 历史
    window.aiAssistant.clearHistory();
    
    // 清空聊天消息
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
        messagesContainer.innerHTML = `
            <div class="welcome-message">
                <p>👋 对话已重置</p>
                <p>可以开始新的话题了~</p>
            </div>
        `;
    }
    
    // 更新计数
    this.updateConversationCount();
    
    window.showToast('✅ 对话历史已清空');
};

/**
 * 全屏查看图片
 */
UIController.prototype.showImageFullscreen = function(imageBase64) {
    // 创建全屏覆盖层
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.9);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: zoom-out;
    `;
    
    // 创建图片
    const img = document.createElement('img');
    img.src = imageBase64;
    img.style.cssText = `
        max-width: 90%;
        max-height: 90%;
        object-fit: contain;
    `;
    
    overlay.appendChild(img);
    
    // 点击关闭
    overlay.onclick = () => {
        overlay.remove();
    };
    
    document.body.appendChild(overlay);
};

// 导出全局实例
try {
    window.uiController = new UIController();
    console.log('✅ UIController 实例已创建:', window.uiController);
} catch (error) {
    console.error('❌ 创建 UIController 失败:', error);
}
