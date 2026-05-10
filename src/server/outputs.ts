import { createServerFn } from "@tanstack/react-start";
import { db } from "./db";
import { outputs } from "./schema";
import { desc } from "drizzle-orm";

export const getDemoOutputs = createServerFn({ method: "GET" }).handler(async () => {
  return await db.query.outputs.findMany({
    limit: 3,
    orderBy: [desc(outputs.createdAt)],
  });
});
