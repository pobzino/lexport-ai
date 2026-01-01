"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect } from "react";
import { Send, Loader2, X, Sparkles, MessageSquare } from "lucide-react";
import ReactMarkdown from "react-markdown";

// Generative UI Components
import {
  ContractDiff,
  ClauseExplanationCard,
  RiskCarousel,
} from "@/components/chat";

// ============================================================================
// Types
// ============================================================================

interface ContractChatProps {
  contractId: string;
  onContractUpdated?: () => void;
  onJumpToClause?: (clauseId: string) => void;
  contextText?: string;
  onClearContext?: () => void;
}

// ============================================================================
// Suggestion Chips
// ============================================================================

const SUGGESTION_CHIPS = [
  { label: "Review risks", prompt: "Analyze this contract for potential risks and issues" },
  { label: "Simplify language", prompt: "Simplify the language in this contract to be more readable" },
  { label: "Explain definitions", prompt: "Explain the definitions section" },
  { label: "Check for missing clauses", prompt: "Are there any standard clauses missing from this contract?" },
];

// ============================================================================
// Loading Skeleton
// ============================================================================

function LoadingSkeleton({ type }: { type: string }) {
  if (type === "analyzeRisks") {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-24 bg-slate-200 rounded-lg" />
        <div className="h-32 bg-slate-200 rounded-lg" />
        <div className="h-32 bg-slate-200 rounded-lg" />
      </div>
    );
  }
  if (type === "modifyContract") {
    return (
      <div className="animate-pulse">
        <div className="h-32 bg-green-100 rounded-lg" />
      </div>
    );
  }
  if (type === "explainClause") {
    return (
      <div className="animate-pulse">
        <div className="h-40 bg-blue-100 rounded-lg" />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-slate-500 text-sm">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>Thinking...</span>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ContractChat({
  contractId,
  onContractUpdated,
  onJumpToClause,
  contextText,
  onClearContext,
}: ContractChatProps) {
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    id: `contract-${contractId}`,
    transport: new DefaultChatTransport({
      api: `/api/contracts/${contractId}/chat`,
    }),
    onFinish: ({ message }) => {
      // Check if contract was modified and trigger refresh
      const modifyPart = message.parts.find(
        (p) => p.type === "tool-modifyContract"
      );
      if (
        modifyPart &&
        "output" in modifyPart &&
        modifyPart.output &&
        typeof modifyPart.output === "object" &&
        "success" in modifyPart.output &&
        modifyPart.output.success
      ) {
        onContractUpdated?.();
      }
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !contextText) return;

    let messageText = input.trim();
    if (contextText) {
      messageText = `Regarding this text:\n"${contextText}"\n\n${messageText}`;
      onClearContext?.();
    }

    sendMessage({ text: messageText });
    setInput("");
  };

  // Handle suggestion click
  const handleSuggestion = (prompt: string) => {
    sendMessage({ text: prompt });
  };

  // Render a message part
  const renderPart = (part: (typeof messages)[0]["parts"][0], index: number) => {
    // Text part
    if (part.type === "text") {
      return (
        <div key={index} className="prose prose-sm prose-slate max-w-none">
          <ReactMarkdown>{part.text}</ReactMarkdown>
        </div>
      );
    }

    // Tool: modifyContract
    if (part.type === "tool-modifyContract") {
      if (part.state === "input-streaming" || part.state === "input-available") {
        return <LoadingSkeleton key={index} type="modifyContract" />;
      }
      if (part.state === "output-available" && part.output) {
        const result = part.output as {
          success: boolean;
          changes?: Array<{
            section: string;
            clauseId?: string;
            clauseTitle?: string;
            before: string;
            after: string;
          }>;
          explanation?: string;
          error?: string;
        };

        if (!result.success) {
          return (
            <div key={index} className="text-red-600 text-sm p-3 bg-red-50 rounded-lg">
              {result.error || "Failed to apply changes"}
            </div>
          );
        }

        return (
          <ContractDiff
            key={index}
            changes={result.changes || []}
            explanation={result.explanation || "Changes applied successfully"}
            onJumpToClause={onJumpToClause}
          />
        );
      }
    }

    // Tool: explainClause
    if (part.type === "tool-explainClause") {
      if (part.state === "input-streaming" || part.state === "input-available") {
        return <LoadingSkeleton key={index} type="explainClause" />;
      }
      if (part.state === "output-available" && part.output) {
        const result = part.output as {
          clauseId: string;
          clauseTitle: string;
          summary: string;
          explanation: string;
          keyPoints: string[];
          risks?: string[];
          negotiationTips?: string[];
        };

        return (
          <ClauseExplanationCard
            key={index}
            {...result}
            onJumpToClause={onJumpToClause}
          />
        );
      }
    }

    // Tool: analyzeRisks
    if (part.type === "tool-analyzeRisks") {
      if (part.state === "input-streaming" || part.state === "input-available") {
        return <LoadingSkeleton key={index} type="analyzeRisks" />;
      }
      if (part.state === "output-available" && part.output) {
        const result = part.output as {
          overallRiskLevel: "low" | "medium" | "high";
          overallSummary: string;
          clauseRisks: Array<{
            clauseId: string;
            clauseTitle: string;
            severity: "critical" | "warning" | "info";
            category: string;
            title: string;
            description: string;
            problematicText?: string;
            suggestion?: string;
            affectedParty?: "client" | "contractor" | "both";
          }>;
          missingProtections: Array<{
            severity: "critical" | "warning" | "info";
            title: string;
            description: string;
            standardFor?: string[];
            suggestion: string;
          }>;
          jurisdictionAlerts: Array<{
            severity: "critical" | "warning" | "info";
            jurisdiction: string;
            title: string;
            description: string;
            legalReference?: string;
            affectedClauseId?: string;
          }>;
          stats: {
            total: number;
            critical: number;
            warning: number;
            info: number;
          };
        };

        return (
          <RiskCarousel
            key={index}
            overallRiskLevel={result.overallRiskLevel}
            overallSummary={result.overallSummary}
            stats={result.stats}
            clauseRisks={result.clauseRisks}
            missingProtections={result.missingProtections}
            jurisdictionAlerts={result.jurisdictionAlerts}
            onJumpToClause={onJumpToClause}
            onApplyFix={(suggestion, clauseId) => {
              sendMessage({
                text: `Fix the issue in clause ${clauseId}: ${suggestion}`,
              });
            }}
            onAddClause={(suggestion) => {
              sendMessage({
                text: `Add a new clause for: ${suggestion}`,
              });
            }}
          />
        );
      }
    }

    // Tool: answerQuestion
    if (part.type === "tool-answerQuestion") {
      if (part.state === "input-streaming" || part.state === "input-available") {
        return <LoadingSkeleton key={index} type="answerQuestion" />;
      }
      if (part.state === "output-available" && part.output) {
        const result = part.output as { response: string };
        return (
          <div key={index} className="prose prose-sm prose-slate max-w-none">
            <ReactMarkdown>{result.response}</ReactMarkdown>
          </div>
        );
      }
    }

    return null;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-500" />
          <span className="font-medium text-sm">AI Assistant</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <MessageSquare className="h-3 w-3" />
          <span>{messages.length} messages</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Sparkles className="h-8 w-8 text-violet-300 mx-auto mb-3" />
            <p className="text-slate-600 text-sm mb-4">
              Ask me anything about this contract
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTION_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => handleSuggestion(chip.prompt)}
                  className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-700 transition-colors"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => {
          // Skip assistant messages with no renderable content (still streaming initial response)
          if (message.role === "assistant") {
            const hasContent = message.parts.some(part => {
              // Show if there's actual text content
              if (part.type === "text" && part.text.trim()) return true;
              // Show if there's a tool being processed (to show loading skeleton)
              if (part.type.startsWith("tool-")) return true;
              return false;
            });
            if (!hasContent) return null;
          }

          return (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[90%] rounded-lg p-3 ${
                  message.role === "user"
                    ? "bg-violet-600 text-white"
                    : "bg-white border border-slate-200 text-slate-900"
                }`}
              >
                {message.role === "user" ? (
                  <div className="text-sm whitespace-pre-wrap">
                    {message.parts
                      .map((p) => (p.type === "text" ? p.text : ""))
                      .join("")}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {message.parts.map((part, index) => renderPart(part, index))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading indicator */}
        {(status === "submitted" || status === "streaming") && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  {status === "submitted" ? "Thinking..." : "Responding..."}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex justify-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              <p className="text-red-600 text-sm mb-2">Something went wrong</p>
              <p className="text-xs text-red-500">Please try sending your message again</p>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-200 bg-white">
        {/* Context indicator */}
        {contextText && (
          <div className="mb-2 p-2 bg-violet-50 rounded-lg border border-violet-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-violet-700">
                Selected text:
              </span>
              <button
                onClick={onClearContext}
                className="text-violet-500 hover:text-violet-700"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <p className="text-sm text-slate-700 line-clamp-3 italic">
              &ldquo;{contextText}&rdquo;
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              contextText
                ? "Ask about this text..."
                : "Ask about this contract..."
            }
            disabled={status !== "ready"}
            className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:bg-slate-100"
          />
          <button
            type="submit"
            disabled={status !== "ready" || (!input.trim() && !contextText)}
            className="px-3 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>

        {/* Quick suggestions when empty */}
        {messages.length > 0 && status === "ready" && (
          <div className="flex flex-wrap gap-1 mt-2">
            {SUGGESTION_CHIPS.slice(0, 2).map((chip) => (
              <button
                key={chip.label}
                onClick={() => handleSuggestion(chip.prompt)}
                className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 transition-colors"
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
