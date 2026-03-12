/**
 * 语音模块 - voice.js
 * 处理语音识别（Web Speech API）和语音播报（TTS）
 */

class VoiceManager {
    constructor() {
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isListening = false;
        this.callback = null;
        
        // 初始化 Web Speech API
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.lang = 'zh-CN';
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            
            console.log('语音管理器已初始化 (Web Speech API)');
        } else {
            console.warn('浏览器不支持语音识别');
        }
    }

    /**
     * 开始语音识别
     * @param {Function} callback - 识别结果回调函数 (text)
     */
    async startListening(callback) {
        if (!this.recognition) {
            window.showToast('浏览器不支持语音识别');
            return false;
        }

        if (this.isListening) {
            console.warn('正在识别中');
            return false;
        }

        this.callback = callback;
        this.isListening = true;

        try {
            // 设置识别事件
            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                console.log('识别结果:', transcript);
                window.showToast('识别到: ' + transcript);
                
                if (this.callback) {
                    this.callback(transcript);
                }
            };

            this.recognition.onerror = (event) => {
                console.error('识别错误:', event.error);
                let message = '识别失败';
                
                if (event.error === 'no-speech') {
                    message = '没有听到声音';
                } else if (event.error === 'audio-capture') {
                    message = '无法访问麦克风';
                } else if (event.error === 'not-allowed') {
                    message = '请允许访问麦克风';
                }
                
                window.showToast(message);
                this.isListening = false;
            };

            this.recognition.onend = () => {
                console.log('识别结束');
                this.isListening = false;
            };

            // 开始识别
            this.recognition.start();
            console.log('开始语音识别 (Web Speech API)');
            window.showToast('🎤 正在听...');
            return true;

        } catch (error) {
            console.error('启动识别失败:', error);
            window.showToast('识别失败: ' + error.message);
            this.isListening = false;
            return false;
        }
    }

    /**
     * 停止语音识别
     */
    stopListening() {
        if (!this.isListening || !this.recognition) {
            return;
        }

        try {
            this.recognition.stop();
            console.log('停止识别');
        } catch (error) {
            console.error('停止识别失败:', error);
        }
    }

    /**
     * 语音播报
     * @param {string} text - 要播报的文字
     */
    speak(text) {
        if (!this.synthesis) {
            console.warn('浏览器不支持语音播报');
            return;
        }

        // 停止之前的播报
        this.synthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onstart = () => {
            console.log('开始播报:', text.substring(0, 20) + '...');
        };

        utterance.onend = () => {
            console.log('播报结束');
        };

        utterance.onerror = (event) => {
            console.error('播报错误:', event);
        };

        this.synthesis.speak(utterance);
    }

    /**
     * 停止语音播报
     */
    stopSpeaking() {
        if (this.synthesis) {
            this.synthesis.cancel();
        }
    }

    /**
     * 检查语音识别是否可用
     */
    isRecognitionAvailable() {
        return !!this.recognition;
    }

    /**
     * 检查语音播报是否可用
     */
    isSpeechAvailable() {
        return !!this.synthesis;
    }
}

// 导出全局实例
window.voiceManager = new VoiceManager();
