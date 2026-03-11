/**
 * 注意力检测模块 - attention.js
 */

class AttentionDetector {
    constructor() {
        this.model = null;
        this.isRunning = false;
        this.tickIntervalId = null;
        this.detectIntervalId = null;
        this.focusDuration = 0;
        this.distractedDuration = 0;
        this.lastAlertTime = 0;
        this.ALERT_COOLDOWN = 60;
        this.DISTRACTED_THRESHOLD = 15;
        this.currentStatus = 'focused';
        this.isDetecting = false;
    }

    async init() {
        try {
            this.model = await blazeface.load();
            console.log('BlazeFace 加载完成');
            return true;
        } catch(e) {
            console.error('BlazeFace 加载失败:', e);
            return false;
        }
    }

    async startDetection(videoElement, callback) {
        const ok = await this.init();
        if (!ok) return;
        this.isRunning = true;
        this.videoElement = videoElement;

        // 计时器：每秒跑一次，纯计时，不做任何检测
        this.tickIntervalId = setInterval(() => {
            if (!this.isRunning) return;
            if (this.currentStatus === 'focused') {
                this.focusDuration++;
                this.distractedDuration = 0;
            } else {
                this.distractedDuration++;
                if (this.distractedDuration >= this.DISTRACTED_THRESHOLD) {
                    const now = Date.now() / 1000;
                    if (now - this.lastAlertTime > this.ALERT_COOLDOWN) {
                        this.lastAlertTime = now;
                        this.triggerAlert();
                    }
                }
            }
            callback({
                status: this.currentStatus,
                focusDuration: this.focusDuration,
                distractedDuration: this.distractedDuration
            });
        }, 1000);

        // 人脸检测：每5秒跑一次，但不阻塞计时器
        this.detectIntervalId = setInterval(() => {
            if (!this.isRunning || this.isDetecting) return;
            this.isDetecting = true;
            this.model.estimateFaces(videoElement, false)
                .then(faces => {
                    this.currentStatus = faces.length > 0 ? 'focused' : 'distracted';
                    if (this.currentStatus === 'focused') this.distractedDuration = 0;
                })
                .catch(e => console.error('检测错误:', e))
                .finally(() => { this.isDetecting = false; });
        }, 5000);
    }

    triggerAlert() {
        const name = localStorage.getItem('child_name') || '小朋友';
        const msg = `${name}，注意力要集中哦，认真写作业！`;
        if (window.showToast) window.showToast('⚠️ ' + msg);
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(msg);
        u.lang = 'zh-CN';
        u.volume = 1.0;
        window.speechSynthesis.speak(u);
    }

    stopDetection() {
        this.isRunning = false;
        if (this.tickIntervalId) clearInterval(this.tickIntervalId);
        if (this.detectIntervalId) clearInterval(this.detectIntervalId);
    }

    getStatus() {
        return { status: this.currentStatus, isMediaPipeAvailable: true };
    }
}

window.attentionDetector = new AttentionDetector();
