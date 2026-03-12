/**
 * 图片预处理模块
 * 功能：旋转、翻转、方向矫正
 */

class ImageProcessor {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
    }

    /**
     * 自动旋转图片到正确方向
     * @param {string} imageBase64 - 原始图片 base64
     * @returns {Promise<string>} 处理后的图片 base64
     */
    async autoRotateImage(imageBase64) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                try {
                    // 检测图片是否需要旋转（简单启发式方法）
                    // 如果宽度 > 高度，可能是横向拍摄，旋转90度
                    const needsRotation = img.width > img.height;
                    
                    if (needsRotation) {
                        console.log('📐 检测到横向图片，旋转90度');
                        const rotated = this.rotateImage(img, 90);
                        resolve(rotated);
                    } else {
                        console.log('✅ 图片方向正常，无需旋转');
                        resolve(imageBase64);
                    }
                } catch (error) {
                    console.error('图片处理失败:', error);
                    // 失败时返回原图
                    resolve(imageBase64);
                }
            };
            
            img.onerror = () => {
                console.error('图片加载失败');
                reject(new Error('图片加载失败'));
            };
            
            img.src = imageBase64;
        });
    }

    /**
     * 旋转图片
     * @param {HTMLImageElement} img - 图片元素
     * @param {number} degrees - 旋转角度（90, 180, 270）
     * @returns {string} 旋转后的 base64
     */
    rotateImage(img, degrees) {
        const angle = (degrees * Math.PI) / 180;
        
        // 根据旋转角度调整canvas尺寸
        if (degrees === 90 || degrees === 270) {
            this.canvas.width = img.height;
            this.canvas.height = img.width;
        } else {
            this.canvas.width = img.width;
            this.canvas.height = img.height;
        }
        
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 移动到中心点
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        
        // 旋转
        this.ctx.rotate(angle);
        
        // 绘制图片
        this.ctx.drawImage(img, -img.width / 2, -img.height / 2);
        
        // 重置变换
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        // 返回 base64
        return this.canvas.toDataURL('image/jpeg', 0.85);
    }

    /**
     * 水平翻转图片（镜像）
     * @param {string} imageBase64 - 原始图片 base64
     * @returns {Promise<string>} 翻转后的图片 base64
     */
    async flipHorizontal(imageBase64) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                this.canvas.width = img.width;
                this.canvas.height = img.height;
                
                // 水平翻转
                this.ctx.translate(img.width, 0);
                this.ctx.scale(-1, 1);
                
                // 绘制
                this.ctx.drawImage(img, 0, 0);
                
                // 重置
                this.ctx.setTransform(1, 0, 0, 1, 0, 0);
                
                resolve(this.canvas.toDataURL('image/jpeg', 0.85));
            };
            
            img.onerror = () => reject(new Error('图片加载失败'));
            img.src = imageBase64;
        });
    }

    /**
     * 智能矫正作业本方向
     * 针对俯拍作业的特殊处理
     * @param {string} imageBase64 - 原始图片 base64
     * @returns {Promise<string>} 矫正后的图片 base64
     */
    async correctHomeworkOrientation(imageBase64) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                try {
                    // 作业本通常是竖版（高度 > 宽度）
                    // 如果是横版，旋转90度
                    let resultBase64 = imageBase64;
                    
                    if (img.width > img.height) {
                        console.log('📐 作业本横向拍摄，旋转90度到竖向');
                        resultBase64 = this.rotateImage(img, 90);
                    }
                    
                    // 检查是否需要镜像翻转
                    // 注：这里简化处理，实际需要OCR检测文字方向
                    // 暂时不做自动镜像，避免误判
                    
                    console.log('✅ 作业本方向矫正完成');
                    resolve(resultBase64);
                    
                } catch (error) {
                    console.error('矫正失败:', error);
                    resolve(imageBase64); // 失败返回原图
                }
            };
            
            img.onerror = () => {
                console.error('图片加载失败');
                reject(new Error('图片加载失败'));
            };
            
            img.src = imageBase64;
        });
    }

    /**
     * 手动旋转（用户控制）
     * @param {string} imageBase64 - 原始图片 base64
     * @param {number} degrees - 旋转角度
     * @returns {Promise<string>} 旋转后的图片 base64
     */
    async manualRotate(imageBase64, degrees) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                try {
                    const result = this.rotateImage(img, degrees);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = () => reject(new Error('图片加载失败'));
            img.src = imageBase64;
        });
    }
}

// 全局实例
window.imageProcessor = new ImageProcessor();
