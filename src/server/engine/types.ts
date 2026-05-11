/**
 * DevBrand Core Engine - Type Definitions
 */

export interface PRMetadata {
  owner: string;
  repo: string;
  prNumber: number;
  baseSha: string;
  headSha: string;
  title: string;
  body: string;
  author: string;
  createdAt: Date;
  mergedAt: Date | null;
  additions: number;
  deletions: number;
  changedFiles: number;
}

export interface FileDiff {
  filename: string;
  status: 'added' | 'deleted' | 'modified' | 'renamed';
  additions: number;
  deletions: number;
  patch: string;
  previousFilename?: string;
  fullContent?: string; // New field for after-state content
}


export interface ASTSymbol {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'type' | 'const' | 'variable';
  startLine: number;
  endLine: number;
  isExported: boolean;
}

export interface ASTDiff {
  filename: string;
  beforeSymbols: ASTSymbol[];
  afterSymbols: ASTSymbol[];
  addedSymbols: ASTSymbol[];
  removedSymbols: ASTSymbol[];
  changedSymbols: ASTSymbol[];
  addedImports: string[];
  removedImports: string[];
  semanticChange: 'breaking' | 'additive' | 'refactor' | 'none';
}

export interface EnrichedPR {
  metadata: PRMetadata;
  diffs: FileDiff[];
  astDiffs: ASTDiff[];
  linkedIssues: IssueReference[];
  commitHistory: CommitHistory[];
  codeOwnership: FileOwnership[];
  processedAt: Date;
}

export interface IssueReference {
  number: number;
  title: string;
  labels: string[];
  type: 'bug' | 'feature' | 'chore' | 'tech-debt' | 'unknown';
  url: string;
}

export interface CommitHistory {
  sha: string;
  author: string;
  message: string;
  date: Date;
  additions: number;
  deletions: number;
  filesTouched: string[];
}

export interface FileOwnership {
  filename: string;
  authorContributions: { author: string; linesAdded: number; percentage: number }[];
  truckFactor: number;
  entropy: number;
}

export interface StaticMetrics {
  fileMetrics: FileMetrics[];
  overallMetrics: OverallMetrics;
  changeTypeClassification: ChangeType[];
}

export interface FileMetrics {
  filename: string;
  churnScore: number;
  churnRatio: number;
  cyclomaticComplexity: number;
  halsteadVolume: number;
  halsteadDifficulty: number;
  linesAdded: number;
  linesDeleted: number;
  testToCodeRatio: number;
}

export interface OverallMetrics {
  totalChurn: number;
  avgChurnRatio: number;
  maxChurnScore: number;
  avgComplexity: number;
  totalComplexityDelta: number;
}

export type ChangeType = 
  | { type: 'api_change'; description: string; files: string[] }
  | { type: 'refactor'; description: string; files: string[] }
  | { type: 'bug_fix'; description: string; files: string[]; severity: 'low' | 'medium' | 'high' | 'critical' }
  | { type: 'feature'; description: string; files: string[] }
  | { type: 'performance'; description: string; files: string[] }
  | { type: 'documentation'; description: string; files: string[] }
  | { type: 'security'; description: string; files: string[]; severity: 'low' | 'medium' | 'high' | 'critical' }
  | { type: 'config'; description: string; files: string[] }
  | { type: 'test'; description: string; files: string[] };

export interface DependencyGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  preComputedAt: Date;
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'source' | 'test' | 'config' | 'types' | 'utilities';
  moduleId: string;
  isEntryPoint: boolean;
  language: 'typescript' | 'javascript' | 'python' | 'go' | 'rust';
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'import' | 'inheritance' | 'function_call';
  weight: number;
}

export interface GraphMetrics {
  nodeMetrics: NodeGraphMetrics[];
  globalMetrics: GlobalGraphMetrics;
  structuralChanges: StructuralChange[];
}

export interface NodeGraphMetrics {
  filename: string;
  pageRank: number;
  betweennessCentrality: number;
  inDegree: number;
  outDegree: number;
  hubScore: number;
  authorityScore: number;
  clusteringCoefficient: number;
  communityId: number;
  efferentCoupling: number;
  afferentCoupling: number;
  instability: number;
  abstractness: number;
  distanceFromMainSequence: number;
}

export interface GlobalGraphMetrics {
  avgPathLength: number;
  diameter: number;
  density: number;
  modularity: number;
  avgClusteringCoefficient: number;
  connectedComponents: number;
  cycleCount: number;
}

export interface StructuralChange {
  changeType: 'added_edge' | 'removed_edge' | 'added_cycle' | 'broken_cycle' | 'community_shift';
  sourceFile: string;
  targetFile?: string;
  affectedFiles: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export interface GraphImpactReport {
  preGraphMetrics: GraphMetrics;
  postGraphMetrics: GraphMetrics;
  changedNodes: NodeGraphMetrics[];
  propagationReach: PropagationReach[];
  graphEditDistance: number;
  cycleChanges: { introduced: number; broken: number };
}

export interface ImpactProfile {
  dimensions: ImpactDimensions;
  archScore: number;
  archScoreBreakdown: ScoreBreakdown[];
  confidence: number;
  rawSignals: RawSignal[];
  perFileContributions: FileContribution[];
  riskFactors: RiskFactor[];
}

export interface ImpactDimensions {
  architecturalDisruption: number;
  riskAndHotspot: number;
  crossCuttingIndex: number;
  knowledgeDispersion: number;
  couplingModification: number;
  testSurfaceArea: number;
  complexityLoad: number;
  semanticSignificance: number;
}

export interface ScoreBreakdown {
  dimension: string;
  rawValue: number;
  normalizedValue: number;
  weight: number;
  contribution: number;
  explanation: string;
}

export interface RawSignal {
  signalType: string;
  value: number;
  source: 'graph' | 'static' | 'history' | 'user' | 'multi_layer';
  weight: number;
}

export interface FileContribution {
  filename: string;
  archScoreContribution: number;
  primaryReason: string;
  changeType: ChangeType['type'];
}

export interface RiskFactor {
  factor: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  mitigatable: boolean;
}

export interface PropagationReach {
  filename: string;
  affectedFiles: string[];
  propagationDepth: number;
  weightByPageRank: number;
  blastRadius: number;
}

export interface InvisibleWorkReport {
  categories: InvisibleWorkCategory[];
  totalInvisibleEffort: number;
  invisibleWorkScore: number;
  effortBreakdown: EffortBreakdown;
  overlookedIndicators: OverlookedIndicator[];
  detectionConfidence: number;
}

export interface InvisibleWorkCategory {
  category: 'refactoring' | 'dependency_upgrade' | 'performance_improvement' | 
             'code_quality' | 'ci_cd_fix' | 'documentation' | 'security_hardening' | 'tech_debt';
  confidence: number;
  effortEstimate: number;
  files: string[];
  evidence: string[];
  description: string;
  valueProvided: string;
}

export interface EffortBreakdown {
  visibleEffort: number;
  invisibleEffort: number;
  ratio: number;
  estimatedTotalHours: number;
}

export interface OverlookedIndicator {
  indicator: string;
  evidence: string;
  impact: string;
  category: InvisibleWorkCategory['category'];
}

export interface UserPreference {
  conciseness: number;
  technicalDepth: number;
  tone: 'aggressive' | 'professional' | 'humble';
  frequentKeywords: string[];
}

export interface NarrativeRequest {
  impactProfile: ImpactProfile;
  invisibleWorkReport: InvisibleWorkReport;
  enrichedPR: EnrichedPR;
  staticMetrics: StaticMetrics;
  graphImpactReport: GraphImpactReport;
  userContext: UserContext;
  userPreferences?: UserPreference;
}

export interface UserContext {
  seniority: 'junior' | 'mid' | 'senior' | 'staff';
  tone: 'direct' | 'storytelling' | 'technical';
  targetAudience: 'recruiter' | 'hiring_manager' | 'peer' | 'executive';
}

export interface NarrativeDraft {
  version: number;
  linkedinPost1: string;
  linkedinPost2: string;
  linkedinPost3: string;
  resumeBullet: string;
  interviewHook: string;
  commitMessageSummary: string;
  citations: Citation[];
  category: string;
  impactScore: number;
  complexityLevel: 'junior' | 'mid' | 'senior' | 'staff';
  hypeScore: number;
  selfConsistencyScore: number;
  evidenceDensityScore: number;
  userPreferences?: UserPreference;
}

export interface Citation {
  claim: string;
  ref: string;
  sha: string;
  evidenceType: 'metric' | 'structural' | 'behavioral';
  verified: boolean;
  verificationDetails?: string;
  confidenceScore: number;
}
