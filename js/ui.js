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
    }

    /**
     * 初始化 UI
     */
    init() {
        this.bindEvents();
        this.updateReportDate();
        console.log('UI 控制器初始化完成');
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
            photoBtn.addEventListener('click', async () => {
                await this.handlePhotoQuestion();
            });
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
    addChatMessage(text, isUser = false) {
        const messagesContainer = document.getElementById('chat-messages');
        
        // 移除欢迎消息
        const welcomeMsg = messagesContainer.querySelector('.welcome-message');
        if (welcomeMsg) {
            welcomeMsg.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user' : 'ai'}`;
        
        messageDiv.innerHTML = `
            <div class="message-avatar">${isUser ? '👦' : '🤖'}</div>
            <div class="message-bubble">${text}</div>
        `;

        messagesContainer.appendChild(messageDiv);
        
        // 滚动到底部
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    /**
     * 开始语音输入
     */
    startVoiceInput() {
        const voiceBtn = document.getElementById('voice-ask-btn');
        const voiceText = voiceBtn.querySelector('.voice-text');
        
        voiceBtn.classList.add('listening');
        voiceText.textContent = '松开发送...';

        window.voiceManager.startListening((text) => {
            this.handleUserQuestion(text);
        });
    }

    /**
     * 停止语音输入
     */
    stopVoiceInput() {
        const voiceBtn = document.getElementById('voice-ask-btn');
        const voiceText = voiceBtn.querySelector('.voice-text');
        
        voiceBtn.classList.remove('listening');
        voiceText.textContent = '按住说话';

        window.voiceManager.stopListening();
    }

    /**
     * 处理拍照提问
     */
    async handlePhotoQuestion() {
        try {
            console.log('📷 开始拍照提问');
            
            // 显示加载提示
            window.showLoading('准备拍照...');
            
            // 获取 video 和 canvas 元素
            const video = document.getElementById('camera-video');
            const canvas = document.getElementById('camera-canvas');
            
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
            window.voiceManager.speak(answer);
            
            // 更新统计
            this.questionCount++;
            this.updateReportStats();
            
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
    const container = document.getElementById('hanzi-container');
    const grid = document.getElementById('hanzi-grid');
    grid.innerHTML = '';
    container.style.display = 'block';
    
    const writer = HanziWriter.create(grid, character, {
        width: 200,
        height: 200,
        padding: 5,
        showOutline: true,
        strokeAnimationSpeed: 1,
        delayBetweenStrokes: 300,
        strokeColor: '#ffffff',
        outlineColor: '#444444',
        drawingColor: '#ff6b6b'
    });
    
    writer.animateCharacter();
    
    // 点击重播
    grid.onclick = () => writer.animateCharacter();
    document.getElementById('hanzi-hint').textContent = character + ' - 点击重播';
};

// 导出全局实例
window.uiController = new UIController();
