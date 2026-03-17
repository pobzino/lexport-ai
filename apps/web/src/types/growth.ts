export type GrowthLLMProvider = "openai" | "anthropic" | "perplexity" | "google";
export type GrowthWinType = "mentioned" | "top_3" | "top_1" | "cited";

export interface GrowthBrand {
  id: string;
  user_id: string;
  name: string;
  domain: string | null;
  aliases: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GrowthCompetitor {
  id: string;
  brand_id: string;
  name: string;
  domain: string | null;
  aliases: string[];
  created_at: string;
}

export interface GrowthKeyword {
  id: string;
  brand_id: string;
  keyword: string;
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompetitorMention {
  mentioned: boolean;
  rank: number | null;
  cited: boolean;
}

export interface GrowthSnapshot {
  id: string;
  brand_id: string;
  keyword_id: string;
  llm_provider: GrowthLLMProvider;
  llm_model: string | null;
  prompt_used: string;
  mentioned: boolean;
  rank_position: number | null;
  cited_as_source: boolean;
  competitor_mentions: Record<string, CompetitorMention>;
  raw_response: string | null;
  response_tokens: number | null;
  checked_at: string;
  created_at: string;
}

export interface GrowthWin {
  id: string;
  snapshot_id: string;
  brand_id: string;
  keyword_id: string;
  win_type: GrowthWinType;
  llm_provider: GrowthLLMProvider;
  rank_position: number | null;
  detected_at: string;
  // Joined fields
  keyword?: GrowthKeyword;
}

export interface TrendDataPoint {
  date: string;
  score: number;
  mentions: number;
  checks: number;
}

export interface ProviderBreakdown {
  provider: GrowthLLMProvider;
  score: number;
  mentions: number;
  checks: number;
}

export interface GrowthDashboardMetrics {
  visibilityScore: number;
  totalChecks: number;
  totalMentions: number;
  totalCitations: number;
  avgRank: number | null;
  recentWins: GrowthWin[];
  trendData: TrendDataPoint[];
  providerBreakdown: ProviderBreakdown[];
}

export interface AnalysisResult {
  provider: GrowthLLMProvider;
  model: string;
  mentioned: boolean;
  rankPosition: number | null;
  citedAsSource: boolean;
  competitorMentions: Record<string, CompetitorMention>;
  rawResponse: string;
  promptUsed: string;
  responseTokens: number | null;
}
