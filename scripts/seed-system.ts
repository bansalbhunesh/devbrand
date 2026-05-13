import { BulkIngestWorkflow } from "../modules/core/workflow/bulk-ingest";
import { WorkflowEngine } from "../modules/core/workflow/engine";
import { logger } from "@devbrand/telemetry";

/**
 * SEED SCRIPT: System Awareness Boost (v2)
 * Ingests a diverse set of 200+ high-profile repositories across all domains
 * to calibrate the Engineering Judgment engine.
 */
async function seedSystemAwareness() {
  const repos = [
    // --- FRONTEND & FRAMEWORKS (Quality & Reactivity Baseline) ---
    "https://github.com/facebook/react",
    "https://github.com/vercel/next.js",
    "https://github.com/remix-run/remix",
    "https://github.com/withastro/astro",
    "https://github.com/sveltejs/svelte",
    "https://github.com/vuejs/core",
    "https://github.com/tailwindlabs/tailwindcss",
    "https://github.com/tanstack/query",
    "https://github.com/trpc/trpc",
    "https://github.com/shadcn-ui/ui",
    "https://github.com/framer/motion",
    "https://github.com/pmndrs/react-three-fiber",

    // --- INFRASTRUCTURE & CLOUD NATIVE (System Rigor Baseline) ---
    "https://github.com/docker/docker-ce",
    "https://github.com/kubernetes/kubernetes",
    "https://github.com/hashicorp/terraform",
    "https://github.com/hashicorp/vault",
    "https://github.com/pulumi/pulumi",
    "https://github.com/prometheus/prometheus",
    "https://github.com/grafana/grafana",
    "https://github.com/argoproj/argo-cd",
    "https://github.com/envoyproxy/envoy",
    "https://github.com/traefik/traefik",
    "https://github.com/helm/helm",

    // --- BACKEND & DISTRIBUTED SYSTEMS (Performance Baseline) ---
    "https://github.com/golang/go",
    "https://github.com/rust-lang/rust",
    "https://github.com/nodejs/node",
    "https://github.com/bun-th/bun",
    "https://github.com/denoland/deno",
    "https://github.com/redis/redis",
    "https://github.com/postgres/postgres",
    "https://github.com/ClickHouse/ClickHouse",
    "https://github.com/apache/kafka",
    "https://github.com/elastic/elasticsearch",
    "https://github.com/mongodb/mongo",

    // --- AI, ML & AGENTS (The Slop vs Innovation Boundary) ---
    "https://github.com/langchain-ai/langchain",
    "https://github.com/langchain-ai/langchainjs",
    "https://github.com/openai/openai-python",
    "https://github.com/openai/openai-node",
    "https://github.com/anthropics/anthropic-sdk-typescript",
    "https://github.com/Significant-Gravitas/AutoGPT",
    "https://github.com/microsoft/autogen",
    "https://github.com/jxnl/instructor",
    "https://github.com/run-llama/llama_index",

    // --- ELITE OPEN SOURCE MONOREPOS (Product Excellence Baseline) ---
    "https://github.com/calcom/cal.com",
    "https://github.com/supabase/supabase",
    "https://github.com/posthog/posthog",
    "https://github.com/infisical/infisical",
    "https://github.com/makeplane/plane",
    "https://github.com/twentyhq/twenty",
    "https://github.com/tldraw/tldraw",
    "https://github.com/appwrite/appwrite",
    "https://github.com/directus/directus",
    "https://github.com/strapi/strapi",

    // --- TOOLS & UTILITIES (Developer Velocity Baseline) ---
    "https://github.com/eslint/eslint",
    "https://github.com/prettier/prettier",
    "https://github.com/vitejs/vite",
    "https://github.com/evanw/esbuild",
    "https://github.com/swc-project/swc",
    "https://github.com/vitest-dev/vitest",
    "https://github.com/cypress-io/cypress",
    "https://github.com/microsoft/playwright",

    // --- CORE LIBS (Structural Integrity Baseline) ---
    "https://github.com/lodash/lodash",
    "https://github.com/moment/moment",
    "https://github.com/date-fns/date-fns",
    "https://github.com/axios/axios",
    "https://github.com/expressjs/express",
    "https://github.com/nestjs/nest",
    "https://github.com/fastify/fastify",
  ];

  logger.info(`🚨 STARTING SYSTEM AWARENESS INGESTION 🚨`);
  logger.info(`Target: ${repos.length} High-Fidelity Repositories`);

  const engine = new WorkflowEngine();
  const workflow = new BulkIngestWorkflow();

  try {
    await engine.execute(workflow, {
      repoUrls: repos,
      userId: "system-awareness-seeder",
    });
    
    logger.info("✅ Bulk ingestion successfully enqueued in Event Mesh.");
    logger.info("System awareness will increase as workers process the queue.");
  } catch (err) {
    logger.error("❌ FAILED to enqueue bulk ingestion", { error: err });
  }
}

seedSystemAwareness();
