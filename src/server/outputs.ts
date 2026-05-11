import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "./db";
import { outputs } from "./schema";
import { eq, desc } from "drizzle-orm";

export const getDemoOutputs = createServerFn({ method: "GET" }).handler(
  async () => {
    return db.query.outputs.findMany({
      limit: 3,
      orderBy: [desc(outputs.createdAt)],
      where: eq(outputs.isPublic, true),
    });
  },
);

export const getOutputBySlug = createServerFn({ method: "GET" })
  .inputValidator(z.string())
  .handler(async ({ data: slug }) => {
    return db.query.outputs.findFirst({
      where: eq(outputs.slug, slug),
      with: { user: true },
    });
  });
