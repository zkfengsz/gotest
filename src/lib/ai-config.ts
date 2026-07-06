export const AI_MAX_QUESTIONS_PER_ITEM = Number(
  process.env.AI_MAX_QUESTIONS_PER_ITEM ?? "5"
);
export const AI_MAX_INPUT_CHARS = Number(process.env.AI_MAX_INPUT_CHARS ?? "300");
export const AI_MAX_OUTPUT_TOKENS = Number(
  process.env.AI_MAX_OUTPUT_TOKENS ?? "512"
);
export const AI_MAX_HISTORY_TURNS = 2;
export const AI_QUOTA_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
