import { z } from "zod";

export const WorkTypeSchema = z.enum([
  'feature', 'fix', 'reliability', 'refactor', 'performance', 
  'security', 'migration', 'maintenance', 'infra', 'docs', 'test'
]);

export interface InvisibleWorkSignal {
  workType: string;
  isInvisibleWork: boolean;
  invisibleStory: string | null;
  impactCategory: string;
}

export function classifyWork(prTitle: string, filenameList: string[], diffSize: { added: number, deleted: number }): InvisibleWorkSignal {
  const title = prTitle.toLowerCase();
  
  // Basic heuristic-based classifier for V1
  let workType: z.infer<typeof WorkTypeSchema> = 'feature';
  let isInvisibleWork = false;
  let invisibleStory = null;
  let impactCategory = 'Feature';

  if (title.includes('fix') || title.includes('bug')) {
    workType = 'fix';
    impactCategory = 'Reliability';
  } else if (title.includes('refactor') || title.includes('clean')) {
    workType = 'refactor';
    impactCategory = 'Architecture';
    if (diffSize.deleted > diffSize.added * 2) {
      isInvisibleWork = true;
      invisibleStory = "Improved codebase health by aggressively removing redundant logic.";
    }
  } else if (title.includes('perf') || title.includes('optimize')) {
    workType = 'performance';
    impactCategory = 'Performance';
  } else if (title.includes('migrat')) {
    workType = 'migration';
    impactCategory = 'Architecture';
    isInvisibleWork = true;
    invisibleStory = "Executed a critical platform migration that unblocks future scale.";
  } else if (title.includes('security') || title.includes('cve')) {
    workType = 'security';
    impactCategory = 'Security';
    isInvisibleWork = true;
  }

  return {
    workType,
    isInvisibleWork,
    invisibleStory,
    impactCategory
  };
}
