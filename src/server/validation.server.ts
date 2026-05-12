export interface Citation {
  claim: string;
  ref: string;
  sha: string;
  evidenceType: string;
}

export interface AIOutput {
  citations: Citation[];
  [key: string]: any;
}

/**
 * Validates AI output to ensure citations are grounded in the provided context.
 */
export async function validateAIOutput(output: AIOutput, originalPayload?: any): Promise<{
  isValid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  
  if (!output.citations || output.citations.length === 0) {
    errors.push("No citations found in AI output.");
  }

  for (const citation of output.citations || []) {
    if (!citation.ref || !citation.claim) {
      errors.push(`Malformed citation: ${JSON.stringify(citation)}`);
    }
    
    // Basic verification: SHA should be a hex string of 40 chars or a short 7-char SHA
    if (!/^[a-f0-9]{7,40}$/i.test(citation.sha)) {
      errors.push(`Invalid SHA in citation: ${citation.sha}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
