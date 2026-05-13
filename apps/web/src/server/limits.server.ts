import { db } from "./db.server";
import { users } from "./schema.server";
import { eq, sql } from "drizzle-orm";

/**
 * Monthly token budgets per plan. Caps are SOFT — they short-circuit new
 * engine/roast runs but don't kill an in-flight one. Cache reads are NOT
 * counted (they cost ~10% of fresh input on Anthropic).
 *
 * Override via env (TOKEN_BUDGET_FREE_INPUT etc.) without redeploying.
 */
function readBudget(envKey: string, fallback: number): number {
  const raw = process.env[envKey];
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const TOKEN_BUDGETS = {
  free: {
    input: readBudget("TOKEN_BUDGET_FREE_INPUT", 30_000),
    output: readBudget("TOKEN_BUDGET_FREE_OUTPUT", 5_000),
  },
  pro: {
    input: readBudget("TOKEN_BUDGET_PRO_INPUT", 500_000),
    output: readBudget("TOKEN_BUDGET_PRO_OUTPUT", 80_000),
  },
} as const;

export async function checkAndResetLimits(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) return null;

  const now = new Date();
  const resetAt = user.monthResetAt ? new Date(user.monthResetAt) : null;

  // If never reset or reset date is in the past month
  if (!resetAt || now.getTime() > resetAt.getTime()) {
    const nextReset = new Date();
    nextReset.setMonth(nextReset.getMonth() + 1, 1); // Set to 1st of next month
    nextReset.setHours(0, 0, 0, 0); // At midnight

    await db
      .update(users)
      .set({
        generationsThisMonth: 0,
        roastCountThisMonth: 0,
        tokensInputThisMonth: 0,
        tokensOutputThisMonth: 0,
        monthResetAt: nextReset,
      })
      .where(eq(users.id, userId));

    return {
      ...user,
      generationsThisMonth: 0,
      roastCountThisMonth: 0,
      tokensInputThisMonth: 0,
      tokensOutputThisMonth: 0,
      monthResetAt: nextReset,
    };
  }

  return user;
}

export class TokenBudgetExceededError extends Error {
  constructor(
    readonly kind: "input" | "output",
    readonly used: number,
    readonly cap: number,
  ) {
    super(
      `Monthly ${kind} token budget reached (${used}/${cap}). Upgrade for more.`,
    );
    this.name = "TokenBudgetExceededError";
  }
}

/**
 * Call BEFORE issuing LLM work for a user. Throws when either cap is met
 * on their plan; returns the remaining budget when there's room. Free users
 * with 0 caps are uncapped (interpreted as "not enforced").
 */
export async function enforceTokenBudget(userId: string): Promise<{
  remainingInput: number;
  remainingOutput: number;
}> {
  const user = await checkAndResetLimits(userId);
  if (!user) {
    return { remainingInput: Infinity, remainingOutput: Infinity };
  }

  const plan: "free" | "pro" = user.plan === "pro" ? "pro" : "free";
  const caps = TOKEN_BUDGETS[plan];
  const usedIn = user.tokensInputThisMonth ?? 0;
  const usedOut = user.tokensOutputThisMonth ?? 0;

  if (caps.input > 0 && usedIn >= caps.input) {
    throw new TokenBudgetExceededError("input", usedIn, caps.input);
  }
  if (caps.output > 0 && usedOut >= caps.output) {
    throw new TokenBudgetExceededError("output", usedOut, caps.output);
  }

  return {
    remainingInput: caps.input > 0 ? caps.input - usedIn : Infinity,
    remainingOutput: caps.output > 0 ? caps.output - usedOut : Infinity,
  };
}

/**
 * Atomically increment a user's monthly token counters. Cache reads are
 * excluded — they're cheap and we don't want to penalize the prompt-cache
 * optimization the engine pays for.
 */
export async function recordTokenUsage(
  userId: string,
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadInputTokens?: number;
    cacheCreationInputTokens?: number;
  },
) {
  const billableInput = Math.max(0, usage.inputTokens);
  const billableOutput = Math.max(0, usage.outputTokens);
  if (billableInput === 0 && billableOutput === 0) return;

  await db
    .update(users)
    .set({
      tokensInputThisMonth: sql`${users.tokensInputThisMonth} + ${billableInput}`,
      tokensOutputThisMonth: sql`${users.tokensOutputThisMonth} + ${billableOutput}`,
    })
    .where(eq(users.id, userId));
}
