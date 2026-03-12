-- 作业守护者 - Supabase 数据库结构
-- 创建时间: 2026-03-12

-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    child_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 用户表索引
CREATE INDEX idx_users_email ON users(email);

-- 2. 学习会话表（记录每次专注学习的数据）
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    focus_duration INTEGER DEFAULT 0,  -- 专注时长（秒）
    distracted_count INTEGER DEFAULT 0,  -- 走神次数
    total_duration INTEGER DEFAULT 0,  -- 总时长（秒）
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 会话表索引
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_date ON sessions(date);
CREATE INDEX idx_sessions_user_date ON sessions(user_id, date);

-- 3. 提问记录表
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT,
    has_image BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 提问表索引
CREATE INDEX idx_questions_user_id ON questions(user_id);
CREATE INDEX idx_questions_created_at ON questions(created_at);

-- 4. 用户设置表（扩展用户配置）
CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    openrouter_key TEXT,
    bailian_key TEXT,
    theme VARCHAR(20) DEFAULT 'dark',
    notification_enabled BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 启用 RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- 6. RLS 策略

-- Users 表策略
CREATE POLICY "Users can view own profile"
    ON users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (auth.uid() = id);

-- Sessions 表策略
CREATE POLICY "Users can view own sessions"
    ON sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
    ON sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
    ON sessions FOR UPDATE
    USING (auth.uid() = user_id);

-- Questions 表策略
CREATE POLICY "Users can view own questions"
    ON questions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own questions"
    ON questions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own questions"
    ON questions FOR DELETE
    USING (auth.uid() = user_id);

-- User Settings 表策略
CREATE POLICY "Users can view own settings"
    ON user_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
    ON user_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
    ON user_settings FOR UPDATE
    USING (auth.uid() = user_id);

-- 7. 触发器：自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. 视图：用户统计数据
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    u.id AS user_id,
    u.email,
    u.child_name,
    COUNT(DISTINCT s.id) AS total_sessions,
    COALESCE(SUM(s.focus_duration), 0) AS total_focus_time,
    COALESCE(SUM(s.distracted_count), 0) AS total_distractions,
    COUNT(DISTINCT q.id) AS total_questions,
    MAX(s.date) AS last_session_date
FROM users u
LEFT JOIN sessions s ON u.id = s.user_id
LEFT JOIN questions q ON u.id = q.user_id
GROUP BY u.id, u.email, u.child_name;

-- 9. 函数：获取用户今日统计
CREATE OR REPLACE FUNCTION get_today_stats(user_uuid UUID)
RETURNS TABLE (
    focus_duration INTEGER,
    distracted_count INTEGER,
    questions_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(s.focus_duration), 0)::INTEGER AS focus_duration,
        COALESCE(SUM(s.distracted_count), 0)::INTEGER AS distracted_count,
        COUNT(q.id) AS questions_count
    FROM users u
    LEFT JOIN sessions s ON u.id = s.user_id AND s.date = CURRENT_DATE
    LEFT JOIN questions q ON u.id = q.user_id AND DATE(q.created_at) = CURRENT_DATE
    WHERE u.id = user_uuid
    GROUP BY u.id;
END;
$$ LANGUAGE plpgsql;
