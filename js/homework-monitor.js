/**
 * 作业书写实时监控模块
 */

class HomeworkMonitor {
    constructor() {
        this.isMonitoring = false;
        this.intervalId = null;
        this.lastAnalysisTime = 0;
        this.ANALYSIS_INTERVAL = 30; // 每30秒分析一次
    }

    /**
     * 开始实时监控
     */
    async startMonitoring(videoElement) {
        if (this.isMonitoring) {
            console.log('监控已在运行');
            return;
        }

        this.isMonitoring = true;
        this.videoElement = videoElement;
        
        window.showToast('✍️ 作业监控已启动（每30秒分析一次）');
        console.log('✅ 开始实时监控书写质量（间隔30秒）');

        // 每30秒分析一次
        this.intervalId = setInterval(async () => {
            if (!this.isMonitoring) return;
            
            await this.analyzeCurrentFrame();
        }, this.ANALYSIS_INTERVAL * 1000);

        // 立即分析一次
        await this.analyzeCurrentFrame();
    }

    /**
     * 停止监控
     */
    stopMonitoring() {
        if (!this.isMonitoring) return;

        this.isMonitoring = false;
        
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        window.showToast('⏹️ 作业监控已停止');
        console.log('✅ 监控已停止');
    }

    /**
     * 分析当前视频帧
     */
    async analyzeCurrentFrame() {
        try {
            const now = Date.now() / 1000;
            if (now - this.lastAnalysisTime < this.ANALYSIS_INTERVAL) {
                return; // 避免过于频繁
            }
            this.lastAnalysisTime = now;

            console.log('📷 捕获当前画面进行分析...');

            // 从视频捕获当前帧
            const canvas = document.getElementById('camera-canvas');
            if (!canvas || !this.videoElement) {
                console.error('Canvas 或视频元素不存在');
                return;
            }

            canvas.width = this.videoElement.videoWidth;
            canvas.height = this.videoElement.videoHeight;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);

            const imageBase64 = canvas.toDataURL('image/jpeg', 0.7); // 压缩质量

            // 发送给 AI 分析
            const prompt = `请快速分析这张作业书写照片：
1. 能看到孩子在写字吗？写的是什么字？
2. 字写得怎么样？（笔画、结构、整洁度）
3. 如果有明显问题，给1-2句简短建议

要求：
- 如果看不清或没有字，说"继续加油，认真写哦"
- 如果写得好，给予鼓励
- 如果有问题，温和指出，不超过30字
- 用语音播报的语气`;

            console.log('发送给 AI 分析...');
            const answer = await window.aiAssistant.askQuestionWithImage(prompt, imageBase64);

            if (answer && answer.trim()) {
                console.log('✅ AI 分析:', answer);
                
                // 播放语音反馈
                if (window.voiceManager && typeof window.voiceManager.speak === 'function') {
                    window.voiceManager.speak(answer);
                }

                // 显示提示
                window.showToast('💡 ' + answer.substring(0, 30) + '...');
            }

        } catch (error) {
            console.error('❌ 分析失败:', error);
        }
    }

    /**
     * 获取监控状态
     */
    getStatus() {
        return {
            isMonitoring: this.isMonitoring,
            lastAnalysisTime: this.lastAnalysisTime
        };
    }
}

// 全局实例
window.homeworkMonitor = new HomeworkMonitor();
