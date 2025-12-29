"use client";

import { useState, useEffect } from "react";
import { X, BookOpen, Loader2, ChevronDown, ChevronRight } from "lucide-react";

interface ClauseExplanation {
    title: string;
    summary: string;
    keyPoints?: string[];
}

interface SectionExplainerProps {
    contractId: string;
    clauses: { id: string; title: string; content: string }[];
    activeClauseId: string | null;
    onClose: () => void;
    onJumpToClause: (clauseId: string) => void;
}

export function SectionExplainer({
    contractId,
    clauses,
    activeClauseId,
    onClose,
    onJumpToClause,
}: SectionExplainerProps) {
    const [explanations, setExplanations] = useState<Record<string, ClauseExplanation>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedClauses, setExpandedClauses] = useState<Set<string>>(new Set());

    // Fetch explanations on mount - only once
    useEffect(() => {
        const fetchExplanations = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await fetch(`/api/contracts/${contractId}/explain-sections`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        clauses: clauses.map(c => ({ id: c.id, title: c.title, content: c.content.substring(0, 500) }))
                    }),
                });

                if (!response.ok) throw new Error("Failed to generate explanations");

                const data = await response.json();
                setExplanations(data.explanations);
            } catch (err) {
                setError("Couldn't load explanations");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (clauses.length > 0 && Object.keys(explanations).length === 0) {
            fetchExplanations();
        }
    }, [contractId, clauses, explanations]);

    // Auto-expand active clause
    useEffect(() => {
        if (activeClauseId) {
            setExpandedClauses(prev => new Set([...prev, activeClauseId]));
        }
    }, [activeClauseId]);

    const toggleExpand = (clauseId: string) => {
        setExpandedClauses(prev => {
            const next = new Set(prev);
            if (next.has(clauseId)) {
                next.delete(clauseId);
            } else {
                next.add(clauseId);
            }
            return next;
        });
    };

    return (
        <div className="w-80 bg-white border-l border-slate-200 flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-[#529ec6]" />
                        <h3 className="font-medium text-slate-900">Section Guide</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4 text-slate-400" />
                    </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                    Plain English explanations for each section
                </p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-5 h-5 animate-spin text-[#529ec6]" />
                        <span className="ml-2 text-sm text-slate-500">Generating explanations...</span>
                    </div>
                ) : error ? (
                    <div className="p-4 text-center text-sm text-slate-500">
                        {error}
                    </div>
                ) : (
                    <div className="py-2">
                        {clauses.map((clause) => {
                            const explanation = explanations[clause.id];
                            const isExpanded = expandedClauses.has(clause.id);
                            const isActive = activeClauseId === clause.id;

                            return (
                                <div
                                    key={clause.id}
                                    className={`border-b border-slate-100 last:border-b-0 ${isActive ? "bg-[#529ec6]/5" : ""
                                        }`}
                                >
                                    {/* Clause header */}
                                    <button
                                        onClick={() => toggleExpand(clause.id)}
                                        className="w-full flex items-start gap-2 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                                    >
                                        {isExpanded ? (
                                            <ChevronDown className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <span className="text-sm font-medium text-slate-800 line-clamp-1">
                                                {clause.title}
                                            </span>
                                            {!isExpanded && explanation && (
                                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                                                    {explanation.summary}
                                                </p>
                                            )}
                                        </div>
                                    </button>

                                    {/* Expanded content */}
                                    {isExpanded && (
                                        <div className="px-4 pb-3 pl-10">
                                            {explanation ? (
                                                <>
                                                    <p className="text-sm text-slate-600 leading-relaxed">
                                                        {explanation.summary}
                                                    </p>
                                                    {explanation.keyPoints && explanation.keyPoints.length > 0 && (
                                                        <ul className="mt-2 space-y-1">
                                                            {explanation.keyPoints.map((point, i) => (
                                                                <li key={i} className="text-xs text-slate-500 flex items-start gap-1.5">
                                                                    <span className="text-[#529ec6] mt-1">•</span>
                                                                    {point}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                    <button
                                                        onClick={() => onJumpToClause(clause.id)}
                                                        className="mt-2 text-xs text-[#529ec6] hover:underline"
                                                    >
                                                        Jump to section →
                                                    </button>
                                                </>
                                            ) : (
                                                <p className="text-xs text-slate-400 italic">
                                                    No explanation available
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
