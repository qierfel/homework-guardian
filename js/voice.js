/**
 * 语音模块 - voice.js
 * 处理语音识别（MediaRecorder + OpenRouter Whisper）和语音播报（TTS）
 */

class VoiceManager {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.stream = null;
        this.synthesis = window.speechSynthesis;
        this.isRecording = false;
        this.callback = null;
        
        console.log('语音管理器已初始化 (MediaRecorder + OpenRouter Whisper)');
    }

    /**
     * 开始录音
     * @param {Function} callback - 识别结果回调函数 (text)
     */
    async startListening(callback) {
        if (this.isRecording) {
            console.warn('正在录音中');
            return false;
        }

        this.callback = callback;
        this.audioChunks = [];

        try {
            // 获取麦克风权限
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });

            // 创建 MediaRecorder
            const mimeType = this.getSupportedMimeType();
            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: mimeType
            });

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = async () => {
                console.log('录音停止，开始转录...');
                window.showToast('正在识别...');
                await this.transcribeAudio();
            };

            this.mediaRecorder.onerror = (event) => {
                console.error('MediaRecorder 错误:', event.error);
                window.showToast('录音失败');
                this.cleanup();
            };

            this.mediaRecorder.start();
            this.isRecording = true;
            console.log('开始录音 (MediaRecorder)');
            window.showToast('🎤 正在听...');
            return true;

        } catch (error) {
            console.error('启动录音失败:', error);
            
            let message = '录音失败';
            if (error.name === 'NotAllowedError') {
                message = '请允许访问麦克风';
            } else if (error.name === 'NotFoundError') {
                message = '未找到麦克风设备';
            }
            
            window.showToast(message);
            this.cleanup();
            return false;
        }
    }

    /**
     * 停止录音
     */
    stopListening() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            console.log('停止录音');
        }
    }

    /**
     * 获取支持的 MIME 类型
     */
    getSupportedMimeType() {
        const types = [
            'audio/webm',
            'audio/mp4'
        ];

        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                console.log('使用 MIME 类型:', type);
                return type;
            }
        }

        console.warn('没有找到支持的音频格式，使用默认');
        return 'audio/webm';
    }

    /**
     * 转录音频（调用 OpenRouter Whisper API）
     */
    async transcribeAudio() {
        if (this.audioChunks.length === 0) {
            console.warn('没有录音数据');
            window.showToast('录音太短');
            this.cleanup();
            return;
        }

        try {
            // 获取录音类型
            const mimeType = this.getSupportedMimeType();
            const audioBlob = new Blob(this.audioChunks, { type: mimeType });
            console.log('录音大小:', (audioBlob.size / 1024).toFixed(2), 'KB');

            // 获取 OpenRouter API Key
            const openrouterKey = APP_CONFIG.openrouterKey;
            if (!openrouterKey) {
                window.showToast('请先设置 OpenRouter API Key');
                this.cleanup();
                return;
            }

            window.showToast('正在识别...');

            // 调用 OpenRouter Whisper API
            const transcription = await this.callOpenRouterWhisper(audioBlob, openrouterKey);

            if (transcription) {
                console.log('转录结果:', transcription);
                window.showToast('识别到: ' + transcription);
                if (this.callback) {
                    this.callback(transcription);
                }
            } else {
                window.showToast('识别失败');
            }

        } catch (error) {
            console.error('转录失败:', error);
            window.showToast('识别失败: ' + error.message);
        } finally {
            this.cleanup();
        }
    }

    /**
     * 调用 OpenRouter Whisper API
     */
    async callOpenRouterWhisper(audioBlob, apiKey) {
        try {
            // 创建 FormData
            const formData = new FormData();
            
            // 转换为 File 对象
            const audioFile = new File([audioBlob], 'audio.webm', { 
                type: audioBlob.type 
            });
            
            formData.append('file', audioFile);
            formData.append('model', 'openai/whisper-large-v3-turbo');
            formData.append('language', 'zh');

            const response = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'Homework Guardian'
                },
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                console.log('OpenRouter Whisper 返回:', data);
                return data.text || null;
            } else {
                const errorText = await response.text();
                console.error('OpenRouter Whisper 错误:', response.status, errorText);
                window.showToast('识别错误: ' + response.status);
                return null;
            }

        } catch(e) {
            console.error('OpenRouter Whisper 异常:', e);
            window.showToast('请求异常: ' + e.message);
            return null;
        }
    }

    /**
     * Blob 转 Base64
     */
    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                // 移除 data URL 前缀
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    /**
     * 清理资源
     */
    cleanup() {
        this.audioChunks = [];
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        this.mediaRecorder = null;
        this.isRecording = false;
    }

    /**
     * 语音播报（TTS）
     * @param {string} text - 要播报的文字
     * @param {Object} options - 播报选项
     */
    speak(text, options = {}) {
        if (!this.synthesis) {
            console.warn('浏览器不支持语音合成');
            return false;
        }

        // 停止当前播报
        this.synthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        
        // 设置参数
        utterance.lang = options.lang || 'zh-CN';
        utterance.rate = options.rate || 1.0; // 语速
        utterance.pitch = options.pitch || 1.0; // 音调
        utterance.volume = options.volume || 1.0; // 音量

        // 选择中文女声
        const voices = this.synthesis.getVoices();
        const chineseVoice = voices.find(voice => 
            voice.lang.includes('zh') && voice.name.includes('Female')
        ) || voices.find(voice => voice.lang.includes('zh'));
        
        if (chineseVoice) {
            utterance.voice = chineseVoice;
        }

        // 事件监听
        utterance.onstart = () => {
            console.log('开始播报:', text.substring(0, 50));
        };

        utterance.onend = () => {
            console.log('播报结束');
        };

        utterance.onerror = (event) => {
            console.error('播报错误:', event.error);
        };

        this.synthesis.speak(utterance);
        return true;
    }

    /**
     * 停止播报
     */
    stopSpeaking() {
        if (this.synthesis) {
            this.synthesis.cancel();
            console.log('停止播报');
        }
    }

    /**
     * 检查是否正在播报
     */
    isSpeaking() {
        return this.synthesis && this.synthesis.speaking;
    }

    /**
     * 检查是否正在录音
     */
    getListeningStatus() {
        return this.isRecording;
    }

    /**
     * 检查浏览器支持情况
     */
    static checkSupport() {
        const mediaRecorder = !!navigator.mediaDevices?.getUserMedia;
        const synthesis = !!window.speechSynthesis;

        return {
            recognition: mediaRecorder,
            synthesis: synthesis,
            message: !mediaRecorder ? '不支持录音' : 
                     !synthesis ? '不支持语音播报' : '全部支持'
        };
    }
}

// 导出全局实例
window.voiceManager = new VoiceManager();
