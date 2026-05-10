import { db } from "./db";
import { users, outputs } from "./schema";

async function seed() {
  console.log("Seeding database...");

  // Create a dummy user for demo purposes
  const [user] = await db.insert(users).values({
    githubId: "0",
    githubLogin: "devbrand-demo",
    name: "DevBrand Demo",
    seniority: "senior",
    tone: "technical",
  }).onConflictDoNothing().returning();

  const userId = user?.id ?? "00000000-0000-0000-0000-000000000000"; // Fallback if user already exists

  await db.insert(outputs).values([
    {
      userId,
      prTitle: "async retry handling",
      prUrl: "https://github.com/org/payments-svc/pull/1428",
      prSignals: ["reliability", "async"],
      stack: ["TypeScript", "Node.js"],
      linkedinPost1: "Redesigned async retry handling to improve backend reliability under concurrent transaction loads.",
      linkedinPost2: "Improved system uptime by implementing robust retry strategies for payment processing.",
      linkedinPost3: "Detailed look into how we handled transaction spikes with a new retry pipeline.",
      resumeBullet: "Redesigned async retry handling in payments-svc, improving reliability for concurrent loads.",
      interviewHook: "Ask me about how I redesigned retry handling for a payment service under load.",
      category: "Reliability",
      impactScore: 85,
      complexityLevel: "Senior",
    },
    {
      userId,
      prTitle: "stateless JWT pipeline",
      prUrl: "https://github.com/org/edge-gateway/pull/812",
      prSignals: ["architecture", "auth"],
      stack: ["Go", "JWT"],
      linkedinPost1: "Migrated session handling from cookie-bound state to a stateless JWT pipeline, cutting auth latency p95 by 38%.",
      linkedinPost2: "Optimized gateway performance by moving to a stateless authentication model.",
      linkedinPost3: "Scaling auth to 1M+ sessions with a JWT-based stateless architecture.",
      resumeBullet: "Migrated edge-gateway to stateless JWT auth, reducing p95 latency by 38%.",
      interviewHook: "I can share the details of our migration from stateful to stateless session management.",
      category: "Architecture",
      impactScore: 92,
      complexityLevel: "Staff",
    },
    {
      userId,
      prTitle: "N+1 hotspot resolution",
      prUrl: "https://github.com/org/orders-api/pull/377",
      prSignals: ["performance", "db"],
      stack: ["GraphQL", "Postgres"],
      linkedinPost1: "Rewrote N+1 hotspots in the orders service with batched loaders, removing 70% of query volume during peak.",
      linkedinPost2: "Scaled our orders API by optimizing database query patterns and implementing batching.",
      linkedinPost3: "How we saved our database from 70% of redundant query traffic during sales peak.",
      resumeBullet: "Resolved critical N+1 query hotspots, reducing database load by 70% during peak traffic.",
      interviewHook: "Let's talk about how I solved a massive scaling issue by fixing N+1 database queries.",
      category: "Performance",
      impactScore: 88,
      complexityLevel: "Senior",
    },
  ]);

  console.log("Seeding complete.");
}

seed().catch(console.error);
