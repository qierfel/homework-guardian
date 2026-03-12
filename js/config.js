/**
 * 应用配置文件
 * 优先从 localStorage 读取，如果没有则使用默认值
 */

const APP_CONFIG = {
    // OpenRouter API Key（用于 AI 问答）
    get openrouterKey() {
        return localStorage.getItem('openrouter_api_key') || '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';
    },
    
    // 阿里云百炼 API Key（用于语音识别）
    get bailianKey() {
        return localStorage.getItem('bailian_api_key') || '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';
    },
    
    // 孩子名字
    get childName() {
        return localStorage.getItem('child_name') || '小朋友';
    },
    
    // 设置 API Keys（可选，用于临时设置）
    setKeys(openrouter = '', bailian = '') {
        if (openrouter) localStorage.setItem('openrouter_api_key', openrouter);
        if (bailian) localStorage.setItem('bailian_api_key', bailian);
    }
};

// 导出到全局
window.APP_CONFIG = APP_CONFIG;
