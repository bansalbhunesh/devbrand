export interface ASTSymbol {
  name: string;
  kind: "function" | "class" | "interface" | "variable";
  startLine: number;
  endLine: number;
  isExported: boolean;
}

export interface FileMetrics {
  cyclomaticComplexity: number;
  loc: number;
  maintainabilityIndex: number;
}

export interface LanguageAdapter {
  language: string;
  parseAST(code: string): ASTSymbol[];
  computeMetrics(ast: ASTSymbol[]): FileMetrics;
  detectImports(code: string): string[];
  extractTestFiles(filePath: string): boolean;
}

// Typescript adapter (existing logic stubbed out)
export const tsAdapter: LanguageAdapter = {
  language: "typescript",
  parseAST(code: string) { return []; },
  computeMetrics() { return { cyclomaticComplexity: 1, loc: 10, maintainabilityIndex: 100 }; },
  detectImports() { return []; },
  extractTestFiles(fp) { return fp.includes(".test.ts") || fp.includes(".spec.ts"); }
};

// Python adapter
export const pythonAdapter: LanguageAdapter = {
  language: "python",
  parseAST(code: string) {
    // Stub: Would use `@ts-python/ast`
    return [];
  },
  computeMetrics(ast: ASTSymbol[]) {
    return {
      cyclomaticComplexity: 5,
      loc: 100,
      maintainabilityIndex: 85
    };
  },
  detectImports(code: string) {
    const importRegex = /^(?:from|import)\s+(.+?)(?:\s|$)/gm;
    return [...code.matchAll(importRegex)].map(m => m[1]);
  },
  extractTestFiles(filePath: string) {
    return filePath.includes("test_") || filePath.includes("_test.py");
  },
};

// Go adapter
export const goAdapter: LanguageAdapter = {
  language: "go",
  parseAST(code: string) {
    // Stub: Would use `tree-sitter` WASM
    return [];
  },
  computeMetrics(ast: ASTSymbol[]) {
    return { cyclomaticComplexity: 3, loc: 50, maintainabilityIndex: 90 };
  },
  detectImports(code: string) {
    const importRegex = /import\s+(?:\(\s+)?((?:"[^"]+"\s*)+)(?:\s*\))?/g;
    return [];
  },
  extractTestFiles(filePath: string) {
    return filePath.endsWith("_test.go");
  },
};

// Java adapter
export const javaAdapter: LanguageAdapter = {
  language: "java",
  parseAST(code: string) { return []; },
  computeMetrics() { return { cyclomaticComplexity: 8, loc: 200, maintainabilityIndex: 70 }; },
  detectImports(code: string) { return []; },
  extractTestFiles(filePath: string) { return filePath.includes("Test.java"); }
};
