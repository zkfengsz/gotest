# Deepseek 用量与预算控制

## 应用层限制（已实现）

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `AI_MAX_QUESTIONS_PER_ITEM` | 5 | 每用户每道题最多提问次数 |
| `AI_MAX_INPUT_CHARS` | 300 | 单次问题最大字数 |
| `AI_MAX_OUTPUT_TOKENS` | 512 | AI 回复最大 token |
| Upstash 限速 | 3 秒 1 次 | 防止连点刷接口 |

配额数据存储在 **Upstash Redis**（Netlify 多实例共享）。本地未配置 Upstash 时使用内存降级（仅适合 `npm run dev`）。

## Upstash 配置步骤

1. 注册 [Upstash Console](https://console.upstash.com/)
2. 创建 Redis 数据库（选离用户最近的区域）
3. 复制 **REST URL** 和 **REST Token**
4. 写入 `.env.local` 和 Netlify 环境变量：

```env
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
```

## Deepseek 平台预算（必做）

在 [Deepseek 开放平台](https://platform.deepseek.com/) 完成以下设置：

1. **充值** → 设置合理的账户余额
2. **用量 / 账单** → 开启余额不足邮件通知
3. 如有「消费上限」或「月度预算」选项，建议设置为可接受的上限（如 ¥500/月）
4. 定期查看 API 调用量，与管理后台「今日 AI 调用」对照

## Netlify 环境变量清单

部署时除应用变量外，务必配置：

- `DEEPSEEK_API_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `AI_MAX_QUESTIONS_PER_ITEM`（可选，默认 5）

## 调参建议

- 用户较多且成本敏感：将 `AI_MAX_QUESTIONS_PER_ITEM` 设为 `3`
- 希望更详细回答：可将 `AI_MAX_OUTPUT_TOKENS` 提高到 `768`（成本相应增加）
