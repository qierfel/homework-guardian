/**
 * AI 接口模块 - ai.js
 * 调用 OpenRouter API 进行问答、作业分析等
 */

class AIAssistant {
    constructor() {
        this.apiKey = '';
        this.apiEndpoint = 'https://openrouter.ai/api/v1/chat/completions';
        this.model = 'qwen/qwen-turbo';
        this.systemPrompt = `你是一个耐心友善的AI家教，正在辅导一个小学生写作业。
用简单易懂的语言解释知识点，多鼓励，不要直接给答案，而是引导孩子思考。
回答要简洁，适合语音播报，每次回答控制在50字以内。`;
    }

    /**
     * 设置 API Key
     */
    setApiKey(key) {
        this.apiKey = key;
        localStorage.setItem('openrouter_api_key', key);
        console.log('API Key 已保存');
    }

    /**
     * 获取 API Key
     */
    getApiKey() {
        if (!this.apiKey) {
            this.apiKey = localStorage.getItem('openrouter_api_key') || '';
        }
        return this.apiKey;
    }

    /**
     * 检查 API Key 是否已设置
     */
    hasApiKey() {
        return !!this.getApiKey();
    }

    /**
     * 问答接口
     * @param {string} question - 用户问题
     * @param {string} imageBase64 - 可选的图片（base64）
     * @returns {Promise<string>} AI 回答
     */
    async askQuestion(question, imageBase64 = null) {
        if (!this.hasApiKey()) {
            throw new Error('请先设置 API Key');
        }

        let content;

        // 如果有图片，使用 OpenAI vision 格式
        if (imageBase64) {
            content = [
                {
                    type: 'text',
                    text: question
                },
                {
                    type: 'image_url',
                    image_url: {
                        url: imageBase64
                    }
                }
            ];
        } else {
            // 纯文本
            content = question;
        }

        const messages = [
            {
                role: 'system',
                content: this.systemPrompt
            },
            {
                role: 'user',
                content: content
            }
        ];

        try {
            const response = await this.callAPI(messages);
            return response;
        } catch (error) {
            console.error('AI 问答失败:', error);
            throw error;
        }
    }

    /**
     * 分析作业质量
     * @param {string} imageBase64 - 作业图片
     * @returns {Promise<Object>} 分析结果 { score, feedback }
     */
    async analyzeHomework(imageBase64) {
        if (!this.hasApiKey()) {
            throw new Error('请先设置 API Key');
        }

        const messages = [
            {
                role: 'system',
                content: this.systemPrompt + '\n你现在要评价一份作业，请给出具体的建议。'
            },
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: `请分析这份作业：
1. 书写是否工整
2. 答案是否正确
3. 有哪些需要改进的地方
4. 给出鼓励性评价

请用简洁的语言回答，适合小学生理解。`
                    },
                    {
                        type: 'image_url',
                        image_url: {
                            url: imageBase64
                        }
                    }
                ]
            }
        ];

        try {
            const response = await this.callAPI(messages);
            
            return {
                score: this.extractScore(response),
                feedback: response
            };
        } catch (error) {
            console.error('作业分析失败:', error);
            throw error;
        }
    }

    /**
     * 生成图文讲解
     * @param {string} question - 问题
     * @returns {Promise<string>} 讲解内容
     */
    async generateExplanation(question) {
        if (!this.hasApiKey()) {
            throw new Error('请先设置 API Key');
        }

        const messages = [
            {
                role: 'system',
                content: this.systemPrompt + '\n你现在要详细讲解一个知识点，可以用较长的篇幅。'
            },
            {
                role: 'user',
                content: `请详细讲解这个知识点：${question}\n\n要求：
1. 从基础概念开始
2. 举具体的例子
3. 用小学生能理解的语言
4. 分步骤说明`
            }
        ];

        try {
            const response = await this.callAPI(messages);
            return response;
        } catch (error) {
            console.error('生成讲解失败:', error);
            throw error;
        }
    }

    /**
     * 调用 OpenRouter API
     * @param {Array} messages - 消息数组（OpenAI 格式）
     * @param {Object} options - 可选配置
     */
    async callAPI(messages, options = {}) {
        const requestBody = {
            model: this.model,
            messages: messages,
            max_tokens: options.maxTokens || 1024
        };

        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getApiKey()}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `API 请求失败: ${response.status}`);
            }

            const data = await response.json();
            
            // 提取回复内容（OpenAI 格式）
            if (data.choices && data.choices.length > 0) {
                return data.choices[0].message.content;
            } else {
                throw new Error('API 返回格式错误');
            }
        } catch (error) {
            console.error('API 调用失败:', error);
            
            if (error.message.includes('401') || error.message.includes('authentication')) {
                throw new Error('API Key 无效，请检查');
            } else if (error.message.includes('429')) {
                throw new Error('请求过于频繁，请稍后再试');
            } else if (error.message.includes('network') || error instanceof TypeError) {
                throw new Error('网络错误，请检查连接');
            } else {
                throw error;
            }
        }
    }

    /**
     * 从回复中提取分数（简单实现）
     */
    extractScore(text) {
        // 尝试匹配常见分数表述
        const scorePatterns = [
            /(\d+)分/,
            /(\d+)\/100/,
            /(\d+)%/
        ];

        for (const pattern of scorePatterns) {
            const match = text.match(pattern);
            if (match) {
                return parseInt(match[1]);
            }
        }

        // 根据关键词推测
        if (text.includes('优秀') || text.includes('很好')) {
            return 90;
        } else if (text.includes('良好') || text.includes('不错')) {
            return 80;
        } else if (text.includes('一般') || text.includes('还可以')) {
            return 70;
        } else if (text.includes('需要改进')) {
            return 60;
        }

        return null; // 无法提取
    }

    /**
     * 测试 API 连接
     */
    async testConnection() {
        try {
            const response = await this.askQuestion('你好');
            return {
                success: true,
                message: 'API 连接正常',
                response: response
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }
}

// 导出全局实例
window.aiAssistant = new AIAssistant();
