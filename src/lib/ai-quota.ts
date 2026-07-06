import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { AI_MAX_QUESTIONS_PER_ITEM, AI_QUOTA_TTL_SECONDS } from "@/lib/ai-config";

export interface QuotaResult {
  allowed: boolean;
  remaining: number;
  limit: number;
}

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const redis = getRedis();

// In-memory fallback for local dev when Upstash is not configured
const memoryQuota = new Map<string, number>();
const memoryRateLimit = new Map<string, number>();

let ratelimit: Ratelimit | null = null;
if (redis) {
  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(1, "3 s"),
    prefix: "ai:ratelimit",
  });
}

function questionQuotaKey(userId: string, questionId: string) {
  return `ai:q:${userId}:${questionId}`;
}

function dailyStatsKey() {
  const date = new Date().toISOString().slice(0, 10);
  return `ai:stats:daily:${date}`;
}

export async function getQuestionQuota(
  userId: string,
  questionId: string
): Promise<QuotaResult> {
  const limit = AI_MAX_QUESTIONS_PER_ITEM;
  const key = questionQuotaKey(userId, questionId);

  if (redis) {
    const count = Number((await redis.get(key)) ?? 0);
    const remaining = Math.max(0, limit - count);
    return { allowed: count < limit, remaining, limit };
  }

  const count = memoryQuota.get(key) ?? 0;
  const remaining = Math.max(0, limit - count);
  return { allowed: count < limit, remaining, limit };
}

export async function checkAndConsumeQuestionQuota(
  userId: string,
  questionId: string
): Promise<QuotaResult> {
  const limit = AI_MAX_QUESTIONS_PER_ITEM;
  const key = questionQuotaKey(userId, questionId);

  if (redis) {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, AI_QUOTA_TTL_SECONDS);
    }
    const remaining = Math.max(0, limit - count);
    if (count > limit) {
      return { allowed: false, remaining: 0, limit };
    }
    return { allowed: true, remaining, limit };
  }

  const count = (memoryQuota.get(key) ?? 0) + 1;
  memoryQuota.set(key, count);
  const remaining = Math.max(0, limit - count);
  if (count > limit) {
    return { allowed: false, remaining: 0, limit };
  }
  return { allowed: true, remaining, limit };
}

export async function checkRateLimit(userId: string): Promise<boolean> {
  if (ratelimit) {
    const { success } = await ratelimit.limit(userId);
    return success;
  }

  const now = Date.now();
  const last = memoryRateLimit.get(userId) ?? 0;
  if (now - last < 3000) return false;
  memoryRateLimit.set(userId, now);
  return true;
}

export async function incrementDailyStats() {
  if (!redis) return;
  const key = dailyStatsKey();
  await redis.incr(key);
  await redis.expire(key, 60 * 60 * 24 * 2);
}

export async function getDailyAiCallCount(): Promise<number> {
  if (!redis) return 0;
  const count = await redis.get(dailyStatsKey());
  return Number(count ?? 0);
}

export function isRedisConfigured(): boolean {
  return redis !== null;
}
