/**
 * API Helper for making authenticated requests to the web API
 */
import { supabase } from "./supabase";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "https://lexport.ai";

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, headers = {} } = options;

  // Get the current session for auth
  const { data: { session } } = await supabase.auth.getSession();

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (session?.access_token) {
    requestHeaders["Authorization"] = `Bearer ${session.access_token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || error.message || "Request failed");
  }

  return response.json();
}

// Contract generation
export interface GenerateContractParams {
  contractType: string;
  metadata: Record<string, unknown>;
  paymentConfig?: {
    paymentRequired: boolean;
    paymentAmount?: number;
    paymentCurrency: string;
    paymentStructure: string;
    depositPercentage?: number;
  };
}

export interface GeneratedContract {
  id: string;
  title: string;
  preamble: string;
  recitals: string;
  clauses: Array<{
    id: string;
    title: string;
    content: string;
    type: string;
    order: number;
  }>;
  signatureBlock: string;
}

export async function generateContract(
  params: GenerateContractParams
): Promise<{ success: boolean; contract: GeneratedContract }> {
  return apiRequest("/api/contracts/generate", {
    method: "POST",
    body: params,
  });
}

// Send contract for signature
export async function sendContractForSignature(
  contractId: string,
  signers: Array<{
    name: string;
    email: string;
    role: string;
  }>
): Promise<{ success: boolean }> {
  return apiRequest(`/api/contracts/${contractId}/send`, {
    method: "POST",
    body: { signers },
  });
}

// Send reminder
export async function sendReminder(
  contractId: string,
  signatureRequestId: string
): Promise<{ success: boolean }> {
  return apiRequest(`/api/contracts/${contractId}/remind`, {
    method: "POST",
    body: { signatureRequestId },
  });
}

// Risk analysis
export async function analyzeContractRisk(contractId: string): Promise<{
  risks: Array<{
    severity: "critical" | "warning" | "info";
    title: string;
    description: string;
    clause?: string;
  }>;
}> {
  return apiRequest(`/api/contracts/${contractId}/risk-analysis`, {
    method: "POST",
  });
}

// Export PDF
export async function getContractPdfUrl(contractId: string): Promise<string> {
  return `${API_BASE}/api/contracts/${contractId}/pdf`;
}

// Delete contract
export async function deleteContract(contractId: string): Promise<{ success: boolean }> {
  return apiRequest(`/api/contracts/${contractId}`, {
    method: "DELETE",
  });
}

// Duplicate contract
export async function duplicateContract(contractId: string): Promise<{ success: boolean; contractId: string }> {
  return apiRequest(`/api/contracts/${contractId}/duplicate`, {
    method: "POST",
  });
}

// Get certificate of completion
export async function getCertificateUrl(contractId: string): Promise<string> {
  return `${API_BASE}/api/contracts/${contractId}/certificate`;
}

// Comments/Review
export interface ContractComment {
  id: string;
  contract_id: string;
  user_id: string;
  clause_id?: string;
  selection_text?: string;
  content: string;
  status: "open" | "resolved";
  created_at: string;
  updated_at: string;
  user?: {
    email: string;
    name?: string;
  };
  replies?: ContractComment[];
}

export async function getContractComments(contractId: string): Promise<{ comments: ContractComment[] }> {
  return apiRequest(`/api/contracts/${contractId}/reviews`);
}

export async function addContractComment(
  contractId: string,
  comment: {
    clauseId?: string;
    selectionText?: string;
    content: string;
  }
): Promise<{ comment: ContractComment }> {
  return apiRequest(`/api/contracts/${contractId}/reviews`, {
    method: "POST",
    body: comment,
  });
}

export async function resolveComment(
  contractId: string,
  commentId: string
): Promise<{ success: boolean }> {
  return apiRequest(`/api/contracts/${contractId}/reviews/${commentId}/resolve`, {
    method: "POST",
  });
}

export async function deleteComment(
  contractId: string,
  commentId: string
): Promise<{ success: boolean }> {
  return apiRequest(`/api/contracts/${contractId}/reviews/${commentId}`, {
    method: "DELETE",
  });
}
