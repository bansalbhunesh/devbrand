import { aiRouter } from "../../packages/ai-sdk/router.server";

export interface ComplianceIssue {
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  type: "GDPR" | "HIPAA" | "PCI-DSS" | "SECRETS";
  description: string;
  line?: number;
  file?: string;
}

export class ComplianceModule {
  async scanCodebase(files: { path: string; content: string }[]): Promise<ComplianceIssue[]> {
    const issues: ComplianceIssue[] = [];

    for (const file of files) {
      // Fast static analysis for secrets
      if (file.content.match(/(password|secret|api[_-]?key|token)\s*=\s*['"][a-zA-Z0-9_-]{10,}['"]/i)) {
        issues.push({
          severity: "CRITICAL",
          type: "SECRETS",
          description: "Potential hardcoded secret or API key detected.",
          file: file.path
        });
      }

      // If file contains user data patterns, route to AI for GDPR analysis
      if (file.content.includes("email") || file.content.includes("ssn") || file.content.includes("credit_card")) {
        const prompt = `Analyze this code for GDPR/PCI-DSS compliance issues regarding PII and financial data:\n\n${file.content}`;
        const analysis = await aiRouter.generateText({ prompt, taskType: "compliance" });
        
        if (analysis.includes("VIOLATION")) {
          issues.push({
            severity: "HIGH",
            type: "GDPR",
            description: "AI detected improper handling of PII data.",
            file: file.path
          });
        }
      }
    }

    return issues;
  }
}

export const complianceScanner = new ComplianceModule();
