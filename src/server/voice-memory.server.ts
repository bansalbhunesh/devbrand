import { db } from "./db.server";
import { userPostEdits, users, outputs } from "./schema.server";
import { and, desc, eq } from "drizzle-orm";
import { loadSessionUser } from "./auth.server";
import type { VoiceExample } from "./engine/types";

const VALID_POST_KINDS = new Set([
  "linkedinPost1",
  "linkedinPost2",
  "linkedinPost3",
  "twitterThread",
  "resumeBullet",
  "interviewHook",
]);

/**
 * Returns the user's 3 most recent edits, oldest-first so the prompt reads
 * chronologically. Empty array when voice learning is disabled or no edits
 * exist — caller decides whether to inject the block.
 */
export async function getUserVoiceExamples(
  userId: string,
): Promise<VoiceExample[]> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { voiceLearningEnabled: true },
  });
  if (!user?.voiceLearningEnabled) return [];

  const rows = await db
    .select({
      postKind: userPostEdits.postKind,
      editedText: userPostEdits.editedText,
      createdAt: userPostEdits.createdAt,
    })
    .from(userPostEdits)
    .where(eq(userPostEdits.userId, userId))
    .orderBy(desc(userPostEdits.createdAt))
    .limit(3);

  return rows
    .reverse()
    .map((r) => ({ postKind: r.postKind, editedText: r.editedText }));
}

export async function saveEditedPostFn(data: {
  outputId: string;
  postKind: string;
  editedText: string;
}) {
  const user = await loadSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");

  if (!VALID_POST_KINDS.has(data.postKind)) {
    throw new Error("INVALID_POST_KIND");
  }

  // Ownership check — never let one user write edits attributed to another's
  // output. The (outputId, userId) tuple must match a real row.
  const owned = await db.query.outputs.findFirst({
    where: and(eq(outputs.id, data.outputId), eq(outputs.userId, user.id)),
    columns: { id: true },
  });
  if (!owned) throw new Error("NOT_FOUND");

  const [row] = await db
    .insert(userPostEdits)
    .values({
      userId: user.id,
      outputId: data.outputId,
      postKind: data.postKind,
      editedText: data.editedText,
    })
    .returning();

  return { id: row.id, createdAt: row.createdAt };
}
