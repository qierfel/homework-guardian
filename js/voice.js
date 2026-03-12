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
        
        // iOS/Safari 需要预加载语音列表
        if (this.synthesis) {
            // 触发语音列表加载
            this.synthesis.getVoices();
            
            // iOS 需要在 voiceschanged 事件后才能获取语音
            if (this.synthesis.onvoiceschanged !== undefined) {
                this.synthesis.onvoiceschanged = () => {
                    const voices = this.synthesis.getVoices();
                    console.log('可用语音数量:', voices.length);
                    const chineseVoices = voices.filter(v => 
                        v.lang.includes('zh') || v.lang.includes('CN')
                    );
                    console.log('中文语音:', chineseVoices.map(v => v.name).join(', '));
                };
            }
        }
        
        // 初始化 Web Speech API
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.lang = 'zh-CN';
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.maxAlternatives = 1;
            
            console.log('✅ 语音管理器已初始化 (Web Speech API)');
            console.log('浏览器:', navigator.userAgent);
            console.log('语音识别对象:', this.recognition);
        } else {
            console.warn('❌ 浏览器不支持语音识别');
            console.log('User Agent:', navigator.userAgent);
            console.log('webkitSpeechRecognition 存在?', 'webkitSpeechRecognition' in window);
            console.log('SpeechRecognition 存在?', 'SpeechRecognition' in window);
            
            // 显示提示
            setTimeout(() => {
                window.showToast('当前浏览器不支持语音识别，建议：\n1. 使用Chrome浏览器\n2. 或使用文字输入\n3. 或使用拍照功能');
            }, 2000);
        }
    }

    /**
     * 开始语音识别
     * @param {Function} callback - 识别结果回调函数 (text)
     */
    async startListening(callback) {
        console.log('📍 startListening 被调用，回调类型:', typeof callback);
        
        if (!this.recognition) {
            console.error('❌ recognition 不存在');
            window.showToast('浏览器不支持语音识别');
            return false;
        }

        if (this.isListening) {
            console.warn('⚠️ 正在识别中，忽略重复调用');
            return false;
        }

        console.log('✅ 准备开始识别');
        this.callback = callback;
        this.isListening = true;

        try {
            // 设置识别事件
            this.recognition.onresult = (event) => {
                console.log('✅ onresult 事件触发');
                console.log('event.results:', event.results);
                
                const transcript = event.results[0][0].transcript;
                console.log('✅ 识别结果:', transcript);
                window.showToast('识别到: ' + transcript);
                
                if (this.callback && typeof this.callback === 'function') {
                    console.log('✅ 调用回调函数');
                    this.callback(transcript);
                } else {
                    console.error('❌ 回调函数不可用，类型:', typeof this.callback);
                }
            };

            this.recognition.onerror = (event) => {
                console.error('❌ 识别错误:', event);
                console.error('错误类型:', event.error);
                console.error('错误消息:', event.message);
                
                let message = '识别失败';
                
                if (event.error === 'no-speech') {
                    message = '没有听到声音，请靠近麦克风说话';
                } else if (event.error === 'audio-capture') {
                    message = '无法访问麦克风，请检查设备';
                } else if (event.error === 'not-allowed') {
                    message = '请允许访问麦克风权限';
                } else if (event.error === 'network') {
                    message = '网络错误，请检查网络连接';
                } else if (event.error === 'service-not-allowed') {
                    message = '语音服务不可用（可能需要翻墙）';
                } else {
                    message = '识别失败: ' + event.error;
                }
                
                window.showToast(message);
                this.isListening = false;
            };

            this.recognition.onend = () => {
                console.log('✅ onend 事件触发 - 识别结束');
                this.isListening = false;
            };
            
            this.recognition.onstart = () => {
                console.log('✅ onstart 事件触发 - 识别已启动');
            };

            // 开始识别
            console.log('📍 调用 recognition.start()...');
            this.recognition.start();
            console.log('✅ recognition.start() 调用成功');
            console.log('✅ 开始语音识别 (Web Speech API)');
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
        console.log('📍 stopListening 被调用');
        console.log('isListening:', this.isListening);
        console.log('recognition:', !!this.recognition);
        
        if (!this.isListening || !this.recognition) {
            console.log('⚠️ 未在识别状态或 recognition 不存在，跳过');
            return;
        }

        try {
            console.log('📍 调用 recognition.stop()...');
            this.recognition.stop();
            console.log('✅ 停止识别调用成功');
        } catch (error) {
            console.error('❌ 停止识别失败:', error);
        }
    }

    /**
     * 语音播报
     * @param {string} text - 要播报的文字
     */
    speak(text) {
        if (!this.synthesis) {
            console.warn('❌ 浏览器不支持语音播报');
            window.showToast('您的浏览器不支持语音播报');
            return;
        }

        if (!text || text.trim().length === 0) {
            console.warn('播报内容为空');
            return;
        }

        console.log('🔊 准备播报:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));

        // 停止之前的播报
        this.synthesis.cancel();
        
        // iOS/Safari 需要等待一下
        setTimeout(() => {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'zh-CN';
            utterance.rate = 0.9;  // 稍慢一点，更清晰
            utterance.pitch = 1.0;
            utterance.volume = 1.0;

            utterance.onstart = () => {
                console.log('✅ 开始播报');
            };

            utterance.onend = () => {
                console.log('✅ 播报结束');
            };

            utterance.onerror = (event) => {
                console.error('❌ 播报错误:', event);
                console.error('错误类型:', event.error);
                
                // 如果是 iOS 首次播放失败，提示用户
                if (event.error === 'not-allowed' || event.error === 'interrupted') {
                    window.showToast('语音播报失败，可能需要点击屏幕激活');
                }
            };

            // 获取中文语音（如果有）
            const voices = this.synthesis.getVoices();
            const chineseVoice = voices.find(voice => 
                voice.lang.includes('zh') || voice.lang.includes('CN')
            );
            
            if (chineseVoice) {
                utterance.voice = chineseVoice;
                console.log('使用中文语音:', chineseVoice.name);
            } else {
                console.log('未找到中文语音，使用默认');
            }

            this.synthesis.speak(utterance);
            
            // 显示播报提示
            window.showToast('🔊 正在播报...');
        }, 100);
    }

    /**
     * 停止语音播报
     */
    stopSpeaking() {
        if (this.synthesis) {
            console.log('🔇 停止语音播报');
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
