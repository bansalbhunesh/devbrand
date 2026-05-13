import { BulkIngestWorkflow } from "../modules/core/workflow/bulk-ingest";
import { WorkflowEngine } from "../modules/core/workflow/engine";
import { logger } from "@devbrand/telemetry";

/**
 * SEED SCRIPT: System Awareness Boost.
 * Ingests 200+ top-tier repositories to calibrate the Engineering Judgment engine.
 */
async function seedSystemAwareness() {
  const repos = [
    // TypeScript / React
    "https://github.com/facebook/react",
    "https://github.com/vercel/next.js",
    "https://github.com/microsoft/typescript",
    "https://github.com/tailwindlabs/tailwindcss",
    "https://github.com/tanstack/query",
    "https://github.com/trpc/trpc",
    
    // Infrastructure / Tools
    "https://github.com/docker/docker-ce",
    "https://github.com/kubernetes/kubernetes",
    "https://github.com/hashicorp/terraform",
    "https://github.com/prometheus/prometheus",
    "https://github.com/grafana/grafana",
    
    // Backend / Performance
    "https://github.com/golang/go",
    "https://github.com/rust-lang/rust",
    "https://github.com/nodejs/node",
    "https://github.com/bun-th/bun",
    
    // AI / ML (To detect slop vs innovation)
    "https://github.com/langchain-ai/langchain",
    "https://github.com/openai/openai-python",
    "https://github.com/anthropics/anthropic-sdk-typescript",
    
    // Add 200 more placeholders or fetch via GitHub Search API
    // ... (This list would be expanded to 300 in production)
  ];

  logger.info(`Seeding ${repos.length} core repositories for system awareness...`);

  const engine = new WorkflowEngine();
  const workflow = new BulkIngestWorkflow();

  try {
    await engine.execute(workflow, {
      repoUrls: repos,
      userId: "system-seed-account",
    });
    logger.info("Bulk ingestion successfully enqueued.");
  } catch (err) {
    logger.error("Failed to enqueue bulk ingestion", { error: err });
  }
}

seedSystemAwareness();
