/**
 * 摄像头模块 - camera.js
 * 处理摄像头访问、切换和拍照功能
 */

class CameraManager {
    constructor() {
        this.stream = null;
        this.videoElement = null;
        this.canvasElement = null;
        this.facingMode = 'user'; // 'user' 前置, 'environment' 后置
        this.isActive = false;
    }

    /**
     * 初始化摄像头
     * @param {HTMLVideoElement} videoElement - video 元素
     * @param {HTMLCanvasElement} canvasElement - canvas 元素（用于拍照）
     */
    async init(videoElement, canvasElement) {
        this.videoElement = videoElement;
        this.canvasElement = canvasElement;
        
        try {
            await this.startCamera();
            this.isActive = true;
            console.log('摄像头初始化成功');
            return true;
        } catch (error) {
            console.error('摄像头初始化失败:', error);
            this.handleError(error);
            return false;
        }
    }

    /**
     * 启动摄像头
     */
    async startCamera() {
        // 如果已有流，先停止
        if (this.stream) {
            this.stopCamera();
        }

        const constraints = {
            video: {
                facingMode: this.facingMode,
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        };

        try {
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.videoElement.srcObject = this.stream;
            
            // 等待视频元数据加载完成
            await new Promise((resolve) => {
                this.videoElement.onloadedmetadata = () => {
                    this.videoElement.play();
                    resolve();
                };
            });
            
            console.log('摄像头已启动，模式:', this.facingMode);
        } catch (error) {
            throw error;
        }
    }

    /**
     * 停止摄像头
     */
    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
            this.videoElement.srcObject = null;
            this.isActive = false;
            console.log('摄像头已停止');
        }
    }

    /**
     * 切换前后摄像头
     */
    async toggleCamera() {
        this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
        
        try {
            await this.startCamera();
            window.showToast(`已切换到${this.facingMode === 'user' ? '前置' : '后置'}摄像头`);
            return true;
        } catch (error) {
            console.error('切换摄像头失败:', error);
            // 切换失败，恢复原模式
            this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
            window.showToast('切换失败，可能设备不支持');
            return false;
        }
    }

    /**
     * 拍照 - 返回 base64 图片
     * @returns {string} base64 格式的图片数据
     */
    capturePhoto() {
        if (!this.isActive || !this.videoElement) {
            throw new Error('摄像头未启动');
        }

        const video = this.videoElement;
        const canvas = this.canvasElement;
        
        // 设置 canvas 尺寸为视频尺寸
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // 绘制当前帧
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // 转换为 base64
        const base64Image = canvas.toDataURL('image/jpeg', 0.85);
        console.log('拍照成功，图片大小:', (base64Image.length / 1024).toFixed(2), 'KB');
        
        return base64Image;
    }

    /**
     * 获取视频元素（供其他模块使用，如注意力检测）
     */
    getVideoElement() {
        return this.videoElement;
    }

    /**
     * 错误处理
     */
    handleError(error) {
        let message = '摄像头访问失败';
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            message = '请允许访问摄像头';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            message = '未找到摄像头设备';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            message = '摄像头被其他应用占用';
        } else if (error.name === 'OverconstrainedError') {
            message = '摄像头不支持请求的配置';
        } else if (error.name === 'NotSupportedError') {
            message = '浏览器不支持摄像头访问（请使用 HTTPS）';
        }
        
        window.showToast(message);
        console.error('摄像头错误详情:', error);
    }

    /**
     * 检查摄像头是否可用
     */
    static async checkAvailability() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            return {
                available: false,
                message: '浏览器不支持摄像头访问'
            };
        }

        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const cameras = devices.filter(device => device.kind === 'videoinput');
            
            if (cameras.length === 0) {
                return {
                    available: false,
                    message: '未检测到摄像头设备'
                };
            }
            
            return {
                available: true,
                count: cameras.length,
                devices: cameras
            };
        } catch (error) {
            return {
                available: false,
                message: '无法枚举设备: ' + error.message
            };
        }
    }
}

// 导出全局实例
window.cameraManager = new CameraManager();
