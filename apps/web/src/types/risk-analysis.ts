/**
 * AI Risk Analysis Types
 *
 * Types for the contract risk analysis feature that identifies
 * unusual clauses, missing protections, and jurisdiction-specific issues.
 */

export type RiskSeverity = 'info' | 'warning' | 'critical';

export type RiskCategory =
  | 'unusual_terms'       // Terms not standard for this contract type
  | 'missing_protection'  // Standard protections that are absent
  | 'one_sided'          // Clauses that heavily favor one party
  | 'jurisdiction_issue' // Conflicts with local law
  | 'ambiguity'          // Vague or unclear language
  | 'liability_exposure'; // Excessive liability or indemnification

/**
 * Risk identified in a specific clause
 */
export interface ClauseRisk {
  clauseId: string;
  clauseTitle: string;
  severity: RiskSeverity;
  category: RiskCategory;
  title: string;           // Brief risk title (e.g., "Unlimited Liability")
  description: string;     // Plain English explanation
  problematicText?: string; // The specific text that's concerning
  suggestion?: string;     // Recommended fix or negotiation point
  affectedParty?: 'client' | 'contractor' | 'both'; // Who this affects
}

/**
 * Standard protection that's missing from the contract
 */
export interface MissingProtection {
  severity: RiskSeverity;
  title: string;
  description: string;
  standardFor: string[];  // Contract types where this is standard
  suggestion: string;     // Recommended clause to add
}

/**
 * Jurisdiction-specific legal alert
 */
export interface JurisdictionAlert {
  severity: RiskSeverity;
  jurisdiction: string;
  title: string;
  description: string;
  legalReference?: string; // e.g., "California Business & Professions Code Section 16600"
  affectedClauseId?: string;
}

/**
 * Complete risk analysis result
 */
export interface RiskAnalysisResult {
  id: string;
  contractId: string;
  contentHash: string;
  overallRiskLevel: 'low' | 'medium' | 'high';
  overallSummary: string;
  clauseRisks: ClauseRisk[];
  missingProtections: MissingProtection[];
  jurisdictionAlerts: JurisdictionAlert[];
  analyzedAt: string;

  // Computed stats
  stats: {
    total: number;
    critical: number;
    warning: number;
    info: number;
  };
}

/**
 * API request for risk analysis
 */
export interface AnalyzeContractRequest {
  forceRefresh?: boolean;
}

/**
 * API response for risk analysis
 */
export interface AnalyzeContractResponse {
  analysis: RiskAnalysisResult;
  fromCache: boolean;
}

/**
 * Database record for cached risk analysis
 */
export interface ContractRiskAnalysisRecord {
  id: string;
  contract_id: string;
  content_hash: string;
  jurisdiction: string;
  contract_type: string;
  overall_risk_level: 'low' | 'medium' | 'high';
  overall_summary: string;
  clause_risks: ClauseRisk[];
  missing_protections: MissingProtection[];
  jurisdiction_alerts: JurisdictionAlert[];
  analyzed_at: string;
  created_at: string;
}
