# D&B AI 学习平台

企业内部 AI 基础知识学习与考试 Web 应用（当前默认使用本地用户名/密码架构，无需 Supabase）。

## 技术栈

- **前端**: Next.js (App Router), React, Tailwind CSS, shadcn/ui
- **后端**: 本地 JSON 数据库（可后续切换为 Supabase）
- **部署**: Netlify

## 快速开始

### 1. 本地账号架构（默认）

系统首次启动时会自动初始化 `data/local-db.json`，并创建一个默认管理员账号（可通过环境变量覆盖）：

- `LOCAL_ADMIN_USERNAME`（默认 `admin`）
- `LOCAL_ADMIN_PASSWORD`（默认 `admin123456`）

### 2. 本地开发

```bash
cp .env.local.example .env.local
# 可选：修改 LOCAL_ADMIN_USERNAME / LOCAL_ADMIN_PASSWORD

npm install
npm run dev
```

### 3. 部署到 Netlify

1. 连接 Git 仓库到 Netlify
2. 安装 `@netlify/plugin-nextjs`（Netlify 会自动识别 `netlify.toml`）
3. 设置环境变量：
   - `LOCAL_ADMIN_USERNAME`
   - `LOCAL_ADMIN_PASSWORD`
   - `NEXT_PUBLIC_SITE_URL`（生产域名，如 `https://your-app.netlify.app`）
   - `DEEPSEEK_API_KEY`
   - `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`（AI 配额，生产必配）
   - `AI_MAX_QUESTIONS_PER_ITEM`（可选，默认 5）

详见 [docs/AI_TOKEN_CONTROL.md](docs/AI_TOKEN_CONTROL.md)

## 功能概览

| 模块 | 功能 |
|------|------|
| 认证 | 管理员配置用户名/密码登录（本地） |
| 学习 | 3 阶段递进，每阶段 100 题学习模式 + AI 助手（每题次数限制） |
| 考试 | 随机 60 题，90% 通关，含单选/多选/拖拽题 |
| 证书 | 三阶段全部通过后生成可下载证书 |
| 管理 | 用户管理、题库 CRUD、JSON/Markdown 导入 |

## 题库导入

支持 JSON（见 `data/sample-questions.json`）和 Markdown 格式，在管理后台 → 题库管理 → 导入题库 使用。

Markdown 示例：

```markdown
stage: 1
type: single
order: 0
## 题目内容
### 选项
- [A] 选项A
- [B] 选项B
answer: B
### 解析
解析内容...
---
```
# gotest
