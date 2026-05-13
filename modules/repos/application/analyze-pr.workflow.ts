import { Workflow, WorkflowContext } from "../../core/workflow/engine";
import { runEngine } from "@devbrand/repo-intelligence";
import { mesh } from "../../core/events/mesh";
import { db } from "@infrastructure/database/db.server";
import { outputs } from "@infrastructure/database/schema.server";

/**
 * ELITE ARCHITECTURE: The Analyze PR Workflow.
 * Coordinates the full analysis pipeline from ingestion to narrative persistence.
 */

type PRState = "INITIALIZING" | "ANALYZING" | "PERSISTING" | "COMPLETED" | "FAILED";

export class AnalyzePRWorkflow extends Workflow<PRState> {
  async execute() {
    await this.transition("INITIALIZING", "ANALYZING");

    const { prUrl } = this.ctx.payload;

    await mesh.emit({
      type: "analysis.started",
      payload: { jobId: this.ctx.jobId, repoId: "unknown" },
    });

    try {
      const result = await runEngine({
        prUrl,
        userId: this.ctx.userId,
      });

      await this.transition("ANALYZING", "PERSISTING");

      // Save the output
      const [newOutput] = await db.insert(outputs).values({
        userId: this.ctx.userId,
        prUrl: prUrl,
        prTitle: result.summary.title,
        impactScore: result.summary.impactScore,
        category: result.summary.category,
        content: JSON.stringify(result),
        slug: Math.random().toString(36).substring(7),
      }).returning();

      await mesh.emit({
        type: "analysis.completed",
        payload: { jobId: this.ctx.jobId, outputId: newOutput.id },
      });

      await this.transition("PERSISTING", "COMPLETED");

    } catch (err) {
      await this.transition("ANALYZING", "FAILED");
      throw err;
    }
  }
}
