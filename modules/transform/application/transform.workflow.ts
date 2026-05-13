import { Workflow, WorkflowContext } from "@/modules/core/workflow/workflow.base";
import { EngineWorkflow } from "@/modules/ai/application/engine.workflow";
import { EventBus } from "@/modules/core/events/event-bus";
import { TransformRepository } from "../contracts/transform.repository";

export interface TransformInput {
  prUrl: string;
}

export interface TransformOutput {
  outputId: string;
  slug: string;
}

export class TransformWorkflow extends Workflow<TransformInput, TransformOutput> {
  protected name = "TransformPR";

  constructor(
    eventBus: EventBus,
    private engineWorkflow: EngineWorkflow,
    private transformRepo: TransformRepository
  ) {
    super(eventBus);
  }

  private generateSlug(prUrl: string, userId: string): string {
    const ts = Date.now().toString(36);
    const hash = userId.replace(/-/g, "").slice(0, 4);
    const prPart = prUrl.split("/pull/")[1]?.slice(0, 4) ?? "0000";
    return `${prPart}-${hash}-${ts}`;
  }

  protected async execute(input: TransformInput, context: WorkflowContext): Promise<TransformOutput> {
    await this.eventBus.emit({
      type: "TRANSFORM_STARTED",
      payload: { userId: context.userId, prUrl: input.prUrl, jobId: context.jobId }
    });

    // 1. Get user context (This should ideally be a Domain Service 'UserService.getProfile')
    const { users } = await import("@infrastructure/database/schema.server");
    const { db } = await import("@infrastructure/database/db.server");
    const { eq } = await import("drizzle-orm");
    const dbUser = await db.query.users.findFirst({ where: eq(users.id, context.userId) });
    if (!dbUser) throw new Error("USER_NOT_FOUND");

    const engineContext = {
      seniority: dbUser.seniority as any,
      tone: dbUser.tone as any,
      targetAudience: dbUser.targetAudience as any,
    };

    // 2. Delegate to AI Engine (Cross-Domain Orchestration)
    const { narrative: output, usage } = await this.engineWorkflow.run(
      { prUrl: input.prUrl, context: engineContext },
      context
    );

    // 3. Domain Logic: Result Generation
    const slug = this.generateSlug(input.prUrl, context.userId);
    
    // 4. Persistence Delegation
    const { id: outputId } = await this.transformRepo.saveResult({
      userId: context.userId,
      prUrl: input.prUrl,
      output,
      usage,
      slug
    });

    await this.transformRepo.incrementGenerationCount(context.userId);

    // 5. Emit Event for Observability
    await this.eventBus.emit({
      type: "TRANSFORM_COMPLETED",
      payload: { userId: context.userId, outputId, slug }
    });

    return { outputId, slug };
  }
}
