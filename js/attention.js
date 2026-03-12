/**
 * 注意力检测模块 - attention.js
 * 使用 MediaPipe Pose 检测姿态（低头 = 专注）
 */

class AttentionDetector {
    constructor() {
        this.pose = null;
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
        this.stablePoseCount = 0; // 稳定姿态计数
    }

    async init() {
        try {
            // 加载 MediaPipe Pose
            this.pose = new Pose({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
                }
            });
            
            this.pose.setOptions({
                modelComplexity: 0, // 0=Lite, 1=Full, 2=Heavy（用最轻量级）
                smoothLandmarks: true,
                enableSegmentation: false,
                smoothSegmentation: false,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });
            
            console.log('✅ MediaPipe Pose 初始化完成');
            return true;
        } catch(e) {
            console.error('❌ MediaPipe Pose 加载失败:', e);
            return false;
        }
    }

    async startDetection(videoElement, callback) {
        const ok = await this.init();
        if (!ok) return;
        this.isRunning = true;
        this.videoElement = videoElement;

        // 计时器：每秒跑一次，纯计时
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

        // 姿态检测：每3秒跑一次
        this.detectIntervalId = setInterval(async () => {
            if (!this.isRunning || this.isDetecting) return;
            this.isDetecting = true;
            
            try {
                await this.detectPose(videoElement);
            } catch (e) {
                console.error('姿态检测错误:', e);
            } finally {
                this.isDetecting = false;
            }
        }, 3000);
    }
    
    /**
     * 检测姿态并判断是否专注
     */
    async detectPose(videoElement) {
        return new Promise((resolve) => {
            this.pose.onResults((results) => {
                if (!results.poseLandmarks) {
                    // 没检测到人 → 不专注
                    this.currentStatus = 'distracted';
                    this.stablePoseCount = 0;
                    resolve();
                    return;
                }
                
                const landmarks = results.poseLandmarks;
                
                // 关键点：0=鼻子, 7=左耳, 8=右耳, 11=左肩, 12=右肩
                const nose = landmarks[0];
                const leftEar = landmarks[7];
                const rightEar = landmarks[8];
                const leftShoulder = landmarks[11];
                const rightShoulder = landmarks[12];
                
                if (!nose || !leftShoulder || !rightShoulder) {
                    this.currentStatus = 'distracted';
                    this.stablePoseCount = 0;
                    resolve();
                    return;
                }
                
                // 1. 检测低头（垂直方向）
                const noseY = nose.y;
                const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
                const isHeadDown = noseY > shoulderY - 0.05;
                
                // 2. 检测转头（水平方向）
                const noseX = nose.x;
                const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;
                const headOffset = Math.abs(noseX - shoulderCenterX);
                const isFacingForward = headOffset < 0.15; // 头部偏移不超过15%
                
                // 3. 检测耳朵可见性（判断是否转头）
                let earVisibility = 'both';
                if (leftEar && rightEar) {
                    const leftVisible = leftEar.visibility > 0.5;
                    const rightVisible = rightEar.visibility > 0.5;
                    if (!leftVisible && rightVisible) earVisibility = 'right-only';
                    if (leftVisible && !rightVisible) earVisibility = 'left-only';
                }
                
                const isTurningHead = earVisibility !== 'both';
                
                // 综合判断：低头 + 不转头 = 专注
                const isFocused = isHeadDown && isFacingForward && !isTurningHead;
                
                if (isFocused) {
                    this.stablePoseCount++;
                    if (this.stablePoseCount >= 2) {
                        this.currentStatus = 'focused';
                    }
                } else {
                    this.stablePoseCount = 0;
                    this.currentStatus = 'distracted';
                }
                
                console.log('姿态检测:', {
                    isHeadDown,
                    isFacingForward,
                    isTurningHead,
                    earVisibility,
                    status: this.currentStatus
                });
                
                resolve();
            });
            
            // 发送视频帧
            this.pose.send({image: videoElement});
        });
    }
    
    /**
     * 暂停提醒（不停止检测，只是不发警告）
     */
    pauseAlert() {
        this.lastAlertTime = Date.now() / 1000 + 3600; // 1小时内不提醒
        console.log('✅ 已暂停提醒');
    }
    
    /**
     * 恢复提醒
     */
    resumeAlert() {
        this.lastAlertTime = 0;
        console.log('✅ 已恢复提醒');
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
