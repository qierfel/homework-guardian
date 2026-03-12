/**
 * AI 接口模块 - ai.js
 * 调用 OpenRouter API 进行问答、作业分析等
 */

class AIAssistant {
    constructor() {
        this.apiKey = '';
        this.apiEndpoint = 'https://openrouter.ai/api/v1/chat/completions';
        // 统一使用 qwen-vl-plus：支持图文、在中国可用、教育风格好
        this.model = 'qwen/qwen-vl-plus';
        this.systemPrompt = `你是一个耐心友善的AI家教，正在辅导一个小学生写作业。
用简单易懂的语言解释知识点，多鼓励，不要直接给答案，而是引导孩子思考。
回答要简洁，适合语音播报，每次回答控制在100字以内。

【笔顺规则】当孩子问汉字怎么写、笔顺、笔画时：
1. 绝对不要说具体笔顺（如"第一笔横、第二笔竖"等）
2. 只能说"来看动画吧，我给你播放这个字的笔顺！"
3. 系统会自动显示标准笔顺动画，你不需要描述

【字典功能】当孩子查字典时：
1. 中文字/词：
   - 格式："【拼音】XX (yīn biāo)  【释义】简明解释  【例句】一个简单例句"
   - 例如："【拼音】飞 (fēi)  【释义】在空中移动  【例句】小鸟在天上飞"
   - 触发词："XX是什么意思"、"XX的意思"、"查字典XX"

2. 英文单词：
   - 格式："【音标】/flaɪ/  【释义】飞；飞行  【例句】Birds can fly in the sky. 鸟儿能在天空飞翔"
   - 例如问"fly是什么意思"或"fly的中文"
   - 触发词："XX是什么意思"、"XX的英文"、"XX用英语怎么说"

3. 中英互译：
   - 问"苹果的英文"→ 回答"apple /ˈæpl/"
   - 问"apple是什么意思"→ 回答"苹果"

注意：字典回答要标准、准确、简洁！`;
        
        // 对话历史（支持连续对话）
        this.conversationHistory = [];
        this.maxHistoryLength = 50; // 保留最近50轮对话（支持更长的连续对话）
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
            // 优先 localStorage，其次使用 APP_CONFIG 默认值
            this.apiKey = localStorage.getItem('openrouter_api_key') 
                || (window.APP_CONFIG && window.APP_CONFIG.openrouterKey)
                || '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';
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
     * 清空对话历史
     */
    clearHistory() {
        this.conversationHistory = [];
        console.log('✅ 对话历史已清空');
    }

    /**
     * 获取对话轮数
     */
    getConversationCount() {
        return this.conversationHistory.length / 2;
    }

    /**
     * 检测问题是否需要联网搜索
     */
    needsOnlineSearch(question) {
        // 更精确的联网关键词（避免误触发）
        const onlineKeywords = [
            '今天天气', '明天天气', '天气预报',
            '最新新闻', '新闻',
            '现在几点', '当前时间',
            '搜索一下', '查一下', '帮我搜',
            '最近发生', '刚刚发生',
            '实时数据', '当前情况'
        ];
        
        // 必须完全匹配关键词（避免误触发）
        return onlineKeywords.some(keyword => question.includes(keyword));
    }

    /**
     * 使用 Perplexity 进行联网搜索（通过 OpenRouter）
     */
    async searchWithPerplexity(question) {
        // 使用现有的 OpenRouter API Key
        const apiKey = this.getApiKey();
        
        if (!apiKey) {
            console.warn('⚠️ API Key 未设置');
            return null;
        }

        try {
            console.log('🌐 使用 Perplexity 联网搜索（via OpenRouter）...');
            
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.origin,
                    'X-Title': '作业守护者'
                },
                body: JSON.stringify({
                    model: 'perplexity/llama-3.1-sonar-small-128k-online',
                    messages: [
                        {
                            role: 'system',
                            content: '你是一个小学生的AI助教，用简单易懂的语言回答问题，控制在100字以内。'
                        },
                        {
                            role: 'user',
                            content: question
                        }
                    ]
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API 响应错误:', errorText);
                throw new Error(`Perplexity 搜索失败: ${response.status}`);
            }

            const data = await response.json();
            const answer = data.choices[0].message.content;
            
            console.log('✅ Perplexity 搜索成功');
            return answer;
            
        } catch (error) {
            console.error('❌ Perplexity 搜索失败:', error);
            return null;
        }
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
        
        // 联网搜索功能已禁用（需要时可重新启用）
        // 原因：Perplexity 模型可能不可用，影响正常回答
        /*
        if (!imageBase64 && this.needsOnlineSearch(question)) {
            window.showToast('🌐 检测到需要联网信息...');
            
            const onlineAnswer = await this.searchWithPerplexity(question);
            if (onlineAnswer) {
                window.showToast('✅ 已从网络获取最新信息');
                
                this.conversationHistory.push({
                    role: 'user',
                    content: question
                });
                this.conversationHistory.push({
                    role: 'assistant',
                    content: onlineAnswer
                });
                
                if (this.conversationHistory.length > this.maxHistoryLength * 2) {
                    this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength * 2);
                }
                
                return onlineAnswer;
            }
            
            console.log('⚠️ 联网搜索失败，降级到本地知识模式');
        }
        */

        let content;

        // 如果有图片，使用图文格式
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

        // 构建消息数组：系统提示 + 历史对话 + 当前问题
        const messages = [
            {
                role: 'system',
                content: this.systemPrompt
            },
            ...this.conversationHistory, // 添加历史对话
            {
                role: 'user',
                content: content
            }
        ];

        console.log('发送消息（含历史）:', messages.length, '条');

        try {
            const response = await this.callAPI(messages);
            
            // 保存到历史记录
            this.conversationHistory.push({
                role: 'user',
                content: imageBase64 ? question : content // 图片消息只保存文字部分（避免历史太大）
            });
            this.conversationHistory.push({
                role: 'assistant',
                content: response
            });
            
            // 限制历史长度（保留最近的对话）
            if (this.conversationHistory.length > this.maxHistoryLength * 2) {
                this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength * 2);
                console.log('历史记录已截断，保留最近', this.maxHistoryLength, '轮对话');
            }
            
            console.log('当前历史记录:', this.conversationHistory.length / 2, '轮对话');
            
            // 检测是否涉及汉字书写（更广泛的关键词）
            const writingKeywords = ['怎么写', '如何写', '笔顺', '笔画', '田字格', '写法', '写字', '怎样写'];
            
            console.log('📝 检测汉字书写关键词...');
            console.log('问题:', question);
            console.log('回答:', response.substring(0, 100));
            
            const foundKeyword = writingKeywords.find(keyword => 
                question.includes(keyword) || response.includes(keyword)
            );
            
            if (foundKeyword) {
                console.log('✅ 检测到关键词:', foundKeyword);
                
                // 提取汉字（优先从问题中提取，其次从回答中提取）
                let char = this.extractHanzi(question);
                if (!char) {
                    char = this.extractHanzi(response);
                }
                
                console.log('📝 提取到的汉字:', char);
                
                if (char) {
                    console.log('检查 HanziWriter 加载状态...');
                    console.log('typeof HanziWriter:', typeof HanziWriter);
                    console.log('typeof window.showHanziWriter:', typeof window.showHanziWriter);
                    
                    if (typeof HanziWriter !== 'undefined' && typeof window.showHanziWriter === 'function') {
                        console.log('✅ HanziWriter 可用，800ms 后显示汉字:', char);
                        setTimeout(() => {
                            console.log('🎯 现在调用 showHanziWriter:', char);
                            window.showHanziWriter(char);
                        }, 800);
                    } else {
                        console.error('❌ HanziWriter 未加载');
                        window.showToast('汉字笔顺功能未加载，请刷新页面');
                    }
                } else {
                    console.warn('⚠️ 未能提取到汉字');
                }
            } else {
                console.log('❌ 未检测到书写关键词');
            }
            
            return response;
        } catch (error) {
            console.error('AI 问答失败:', error);
            throw error;
        }
    }
    
    /**
     * 提取问题中的第一个汉字
     */
    extractHanzi(text) {
        // 优先级1: 提取引号中的单个汉字 "飞"、'飞'、「飞」
        const quotedMatch = text.match(/["""''「]([[\u4e00-\u9fa5])["""''」]/);
        if (quotedMatch) {
            return quotedMatch[1];
        }
        
        // 优先级2: 提取"字"前面的汉字，如"飞字"
        const beforeZiMatch = text.match(/([\u4e00-\u9fa5])字/);
        if (beforeZiMatch) {
            return beforeZiMatch[1];
        }
        
        // 优先级3: 提取第一个汉字
        const hanziMatch = text.match(/[\u4e00-\u9fa5]/);
        return hanziMatch ? hanziMatch[0] : null;
    }

    /**
     * 带图片提问（便捷方法）
     * @param {string} question - 问题文本
     * @param {string} imageBase64 - 图片 base64
     * @returns {Promise<string>} AI 回答
     */
    async askQuestionWithImage(question, imageBase64) {
        console.log('📸 askQuestionWithImage 被调用');
        console.log('问题:', question);
        console.log('图片大小:', (imageBase64.length / 1024).toFixed(2), 'KB');
        
        try {
            const result = await this.askQuestion(question, imageBase64);
            console.log('✅ askQuestion 返回成功');
            return result;
        } catch (error) {
            console.error('❌ askQuestion 调用失败:', error);
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
     * @param {string} model - 模型名称（可选，默认使用 this.model）
     * @param {Object} options - 可选配置
     */
    async callAPI(messages, model = null, options = {}) {
        const requestBody = {
            model: model || this.model,
            messages: messages,
            max_tokens: options.maxTokens || 1024
        };

        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getApiKey()}`,
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'Homework Guardian'
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
