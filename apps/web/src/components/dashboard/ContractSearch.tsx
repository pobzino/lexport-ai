"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  X,
  Filter,
  ChevronDown,
  FileText,
  Calendar,
  MapPin,
  Tag as TagIcon,
  Folder as FolderIcon,
  Lock,
  CheckCircle2,
  Clock,
  Shield,
  Briefcase,
  Users,
  TrendingUp,
  FileSignature,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface Contract {
  id: string;
  title: string;
  title_highlighted?: string;
  type: string;
  jurisdiction: string;
  status: string;
  created_at: string;
  updated_at: string;
  content: Record<string, unknown>;
  folders?: Array<{ folder: { id: string; name: string; color: string } }>;
  tags?: Array<{ tag: { id: string; name: string; color: string } }>;
}

interface SearchResult {
  contracts: Contract[];
  total: number;
  limit: number;
  offset: number;
}

interface Folder {
  id: string;
  name: string;
  color: string;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

const CONTRACT_TYPE_DISPLAY: Record<
  string,
  { label: string; icon: typeof FileText; color: string; bg: string }
> = {
  nda_mutual: {
    label: "Mutual NDA",
    icon: Shield,
    color: "text-[#202e46]",
    bg: "bg-[#529ec6]/10",
  },
  nda_oneway: {
    label: "One-Way NDA",
    icon: Shield,
    color: "text-[#202e46]",
    bg: "bg-[#529ec6]/10",
  },
  nda_one_way: {
    label: "One-Way NDA",
    icon: Shield,
    color: "text-[#202e46]",
    bg: "bg-[#529ec6]/10",
  },
  independent_contractor: {
    label: "Contractor Agreement",
    icon: Briefcase,
    color: "text-blue-700",
    bg: "bg-blue-100",
  },
  contractor_agreement: {
    label: "Contractor Agreement",
    icon: Briefcase,
    color: "text-blue-700",
    bg: "bg-blue-100",
  },
  consulting_agreement: {
    label: "Consulting Agreement",
    icon: Users,
    color: "text-cyan-700",
    bg: "bg-cyan-100",
  },
  safe_note: {
    label: "SAFE Note",
    icon: TrendingUp,
    color: "text-emerald-700",
    bg: "bg-emerald-100",
  },
  freelance_service: {
    label: "Service Agreement",
    icon: FileSignature,
    color: "text-indigo-700",
    bg: "bg-indigo-100",
  },
  service_agreement: {
    label: "Service Agreement",
    icon: FileSignature,
    color: "text-indigo-700",
    bg: "bg-indigo-100",
  },
  ip_assignment: {
    label: "IP Assignment",
    icon: Shield,
    color: "text-purple-700",
    bg: "bg-purple-100",
  },
  advisor_agreement: {
    label: "Advisor Agreement",
    icon: Users,
    color: "text-teal-700",
    bg: "bg-teal-100",
  },
  employment_offer: {
    label: "Employment Offer",
    icon: Briefcase,
    color: "text-orange-700",
    bg: "bg-orange-100",
  },
  sow: {
    label: "Statement of Work",
    icon: FileText,
    color: "text-slate-700",
    bg: "bg-slate-100",
  },
};

const JURISDICTION_DISPLAY: Record<string, { label: string; flag: string }> = {
  us_california: { label: "California", flag: "🇺🇸" },
  us_texas: { label: "Texas", flag: "🇺🇸" },
  us_new_york: { label: "New York", flag: "🇺🇸" },
  us_delaware: { label: "Delaware", flag: "🇺🇸" },
  us_florida: { label: "Florida", flag: "🇺🇸" },
  uk: { label: "United Kingdom", flag: "🇬🇧" },
  CA: { label: "California", flag: "🇺🇸" },
  TX: { label: "Texas", flag: "🇺🇸" },
  NY: { label: "New York", flag: "🇺🇸" },
  UK: { label: "United Kingdom", flag: "🇬🇧" },
};

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "pending_signature", label: "Awaiting Signature" },
  { value: "signed", label: "Signed" },
  { value: "completed", label: "Completed" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
];

const JURISDICTION_OPTIONS = [
  { value: "us_california", label: "California" },
  { value: "us_texas", label: "Texas" },
  { value: "us_new_york", label: "New York" },
  { value: "CA", label: "California (Legacy)" },
  { value: "TX", label: "Texas (Legacy)" },
  { value: "NY", label: "New York (Legacy)" },
  { value: "uk", label: "United Kingdom" },
];

const SORT_OPTIONS = [
  { value: "relevance", label: "Most Relevant" },
  { value: "date", label: "Recently Updated" },
  { value: "title", label: "Title A-Z" },
];

function getTypeDisplay(type: string) {
  return (
    CONTRACT_TYPE_DISPLAY[type] || {
      label: type
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
      icon: FileText,
      color: "text-slate-700",
      bg: "bg-slate-100",
    }
  );
}

function getJurisdictionDisplay(jurisdiction: string) {
  return (
    JURISDICTION_DISPLAY[jurisdiction] || {
      label: jurisdiction
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
      flag: "🌍",
    }
  );
}

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    { label: string; className: string; locked?: boolean }
  > = {
    draft: { label: "Draft", className: "bg-slate-100 text-slate-700" },
    pending_signature: {
      label: "Awaiting Signature",
      className: "bg-amber-100 text-amber-700",
      locked: true,
    },
    partially_signed: {
      label: "Partially Signed",
      className: "bg-blue-100 text-blue-700",
      locked: true,
    },
    signed: {
      label: "Signed",
      className: "bg-emerald-100 text-emerald-700",
      locked: true,
    },
    completed: {
      label: "Completed",
      className: "bg-emerald-100 text-emerald-700",
      locked: true,
    },
    expired: {
      label: "Expired",
      className: "bg-red-100 text-red-700",
      locked: true,
    },
    cancelled: { label: "Cancelled", className: "bg-slate-100 text-slate-500" },
  };

  const { label, className, locked } =
    config[status] || { label: status, className: "bg-slate-100 text-slate-600" };

  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${className}`}
    >
      {locked && <Lock className="w-3 h-3" />}
      {label}
    </span>
  );
}

interface ContractSearchProps {
  onResultsChange?: (hasResults: boolean) => void;
}

export function ContractSearch({ onResultsChange }: ContractSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Initialize from URL params
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [debouncedQuery, setDebouncedQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);

  // Filters - initialize from URL
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(
    searchParams.get("status")?.split(",").filter(Boolean) || []
  );
  const [selectedJurisdiction, setSelectedJurisdiction] = useState(
    searchParams.get("jurisdiction") || ""
  );
  const [selectedFolderId, setSelectedFolderId] = useState(
    searchParams.get("folderId") || ""
  );
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    searchParams.get("tagIds")?.split(",").filter(Boolean) || []
  );
  const [dateFrom, setDateFrom] = useState(searchParams.get("dateFrom") || "");
  const [dateTo, setDateTo] = useState(searchParams.get("dateTo") || "");
  const [sortBy, setSortBy] = useState<"relevance" | "date" | "title">(
    (searchParams.get("sortBy") as "relevance" | "date" | "title") || "relevance"
  );

  // Folders and tags
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  // Fetch folders and tags
  useEffect(() => {
    async function fetchFilters() {
      const [foldersRes, tagsRes] = await Promise.all([
        supabase.from("folders").select("id, name, color").order("name"),
        supabase.from("tags").select("id, name, color").order("name"),
      ]);
      if (foldersRes.data) setFolders(foldersRes.data);
      if (tagsRes.data) setTags(tagsRes.data);
    }
    fetchFilters();
  }, []);

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (selectedStatuses.length > 0) params.set("status", selectedStatuses.join(","));
    if (selectedJurisdiction) params.set("jurisdiction", selectedJurisdiction);
    if (selectedFolderId) params.set("folderId", selectedFolderId);
    if (selectedTagIds.length > 0) params.set("tagIds", selectedTagIds.join(","));
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (sortBy !== "relevance") params.set("sortBy", sortBy);

    const newUrl = params.toString() ? `?${params.toString()}` : "";
    if (newUrl !== `?${searchParams.toString()}`) {
      router.replace(newUrl || window.location.pathname, { scroll: false });
    }
  }, [
    query,
    selectedStatuses,
    selectedJurisdiction,
    selectedFolderId,
    selectedTagIds,
    dateFrom,
    dateTo,
    sortBy,
  ]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Perform search
  const performSearch = useCallback(async (offset: number = 0, append: boolean = false) => {
    // Only search if we have a query or filters active
    const hasQuery = debouncedQuery.trim().length > 0;
    const hasFilters =
      selectedStatuses.length > 0 ||
      selectedJurisdiction !== "" ||
      selectedFolderId !== "" ||
      selectedTagIds.length > 0 ||
      dateFrom !== "" ||
      dateTo !== "";

    if (!hasQuery && !hasFilters) {
      setResults(null);
      onResultsChange?.(false);
      return;
    }

    // FIX: Always hide regular list when search is active
    onResultsChange?.(true);

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const params = new URLSearchParams();
      if (debouncedQuery) params.append("q", debouncedQuery);
      if (selectedStatuses.length > 0)
        params.append("status", selectedStatuses.join(","));
      if (selectedJurisdiction)
        params.append("jurisdiction", selectedJurisdiction);
      if (selectedFolderId) params.append("folderId", selectedFolderId);
      if (selectedTagIds.length > 0)
        params.append("tagIds", selectedTagIds.join(","));
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);
      params.append("sortBy", sortBy);
      params.append("limit", "20");
      params.append("offset", offset.toString());

      const response = await fetch(`/api/contracts/search?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data: SearchResult = await response.json();
      
      if (append && results) {
        setResults({
          ...data,
          contracts: [...results.contracts, ...data.contracts],
        });
      } else {
        setResults(data);
        setCurrentOffset(0);
      }
    } catch (error) {
      console.error("Search error:", error);
      if (!append) {
        setResults(null);
        onResultsChange?.(false);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [
    debouncedQuery,
    selectedStatuses,
    selectedJurisdiction,
    selectedFolderId,
    selectedTagIds,
    dateFrom,
    dateTo,
    sortBy,
    onResultsChange,
    results,
  ]);

  // Trigger search when params change
  useEffect(() => {
    performSearch(0, false);
  }, [
    debouncedQuery,
    selectedStatuses,
    selectedJurisdiction,
    selectedFolderId,
    selectedTagIds,
    dateFrom,
    dateTo,
    sortBy,
  ]);

  // Load more results
  const loadMore = () => {
    if (results && results.contracts.length < results.total) {
      const newOffset = results.contracts.length;
      setCurrentOffset(newOffset);
      performSearch(newOffset, true);
    }
  };

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedStatuses.length > 0) count++;
    if (selectedJurisdiction) count++;
    if (selectedFolderId) count++;
    if (selectedTagIds.length > 0) count++;
    if (dateFrom || dateTo) count++;
    return count;
  }, [
    selectedStatuses,
    selectedJurisdiction,
    selectedFolderId,
    selectedTagIds,
    dateFrom,
    dateTo,
  ]);

  const handleClearFilters = () => {
    setSelectedStatuses([]);
    setSelectedJurisdiction("");
    setSelectedFolderId("");
    setSelectedTagIds([]);
    setDateFrom("");
    setDateTo("");
    setSortBy("relevance");
  };

  const handleClearSearch = () => {
    setQuery("");
    setDebouncedQuery("");
    handleClearFilters();
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search contracts by title, content, or parties..."
            className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6] focus:border-transparent"
          />
          {(query || activeFilterCount > 0) && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 border rounded-lg transition-colors",
            showFilters
              ? "bg-[#202e46] text-white border-[#202e46]"
              : "border-slate-300 text-slate-700 hover:bg-slate-50"
          )}
        >
          <Filter className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-[#529ec6] text-white text-xs px-1.5 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Status
              </label>
              <div className="space-y-2">
                {STATUS_OPTIONS.map((status) => (
                  <label key={status.value} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedStatuses.includes(status.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStatuses([...selectedStatuses, status.value]);
                        } else {
                          setSelectedStatuses(
                            selectedStatuses.filter((s) => s !== status.value)
                          );
                        }
                      }}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-700">{status.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Jurisdiction Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Jurisdiction
              </label>
              <select
                value={selectedJurisdiction}
                onChange={(e) => setSelectedJurisdiction(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6]"
              >
                <option value="">All Jurisdictions</option>
                {JURISDICTION_OPTIONS.map((j) => (
                  <option key={j.value} value={j.value}>
                    {j.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Folder Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Folder
              </label>
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6]"
              >
                <option value="">All Folders</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tags
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {tags.map((tag) => (
                  <label key={tag.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedTagIds.includes(tag.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTagIds([...selectedTagIds, tag.id]);
                        } else {
                          setSelectedTagIds(
                            selectedTagIds.filter((id) => id !== tag.id)
                          );
                        }
                      }}
                      className="rounded border-slate-300"
                    />
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="text-sm text-slate-700">{tag.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Created Date Range
              </label>
              <div className="space-y-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  placeholder="From"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  placeholder="To"
                />
              </div>
            </div>
          </div>

          {/* Clear Filters Button */}
          {activeFilterCount > 0 && (
            <div className="pt-2 border-t border-slate-200">
              <button
                onClick={handleClearFilters}
                className="text-sm text-[#529ec6] hover:text-[#202e46] font-medium"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Results Header */}
      {results && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">
            {results.total} {results.total === 1 ? "contract" : "contracts"} found
          </p>
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as "relevance" | "date" | "title")
            }
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6]"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="py-12 text-center">
          <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-[#529ec6] rounded-full animate-spin" />
          <p className="mt-4 text-slate-600">Searching contracts...</p>
        </div>
      )}

      {/* Results */}
      {!loading && results && results.contracts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.contracts.map((contract) => {
            const typeDisplay = getTypeDisplay(contract.type);
            const TypeIcon = typeDisplay.icon;
            const jurisdictionDisplay = getJurisdictionDisplay(contract.jurisdiction);

            return (
              <Link
                key={contract.id}
                href={`/contracts/${contract.id}`}
                className="block p-4 border border-slate-200 rounded-lg hover:border-[#529ec6] hover:shadow-md transition-all"
              >
                {/* Type Badge */}
                <div
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mb-3",
                    typeDisplay.bg,
                    typeDisplay.color
                  )}
                >
                  <TypeIcon className="w-3.5 h-3.5" />
                  {typeDisplay.label}
                </div>

                {/* Title with highlighting */}
                {contract.title_highlighted ? (
                  <h3
                    className="font-semibold text-slate-900 mb-2 line-clamp-2 [&_mark]:bg-yellow-200 [&_mark]:text-yellow-900 [&_mark]:px-1"
                    dangerouslySetInnerHTML={{ __html: contract.title_highlighted }}
                  />
                ) : (
                  <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2">
                    {contract.title}
                  </h3>
                )}

                {/* Metadata */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <MapPin className="w-3.5 h-3.5" />
                    {jurisdictionDisplay.flag} {jurisdictionDisplay.label}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Calendar className="w-3.5 h-3.5" />
                    Updated {formatTimeAgo(contract.updated_at)}
                  </div>
                </div>

                {/* Status */}
                <div className="mb-3">
                  <StatusBadge status={contract.status} />
                </div>

                {/* Tags */}
                {contract.tags && contract.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {contract.tags.slice(0, 3).map((tagWrapper) => (
                      <span
                        key={tagWrapper.tag.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                        style={{
                          backgroundColor: `${tagWrapper.tag.color}20`,
                          color: tagWrapper.tag.color,
                        }}
                      >
                        <TagIcon className="w-3 h-3" />
                        {tagWrapper.tag.name}
                      </span>
                    ))}
                    {contract.tags.length > 3 && (
                      <span className="text-xs text-slate-500">
                        +{contract.tags.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {/* Load More Button */}
      {!loading && results && results.contracts.length > 0 && results.contracts.length < results.total && (
        <div className="flex justify-center pt-6">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#202e46] text-white rounded-lg hover:bg-[#1a2539] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loadingMore ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                Load More
                <span className="text-sm text-slate-300">
                  ({results.contracts.length} of {results.total})
                </span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && results && results.contracts.length === 0 && (
        <div className="py-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            No contracts found
          </h3>
          <p className="text-slate-600 mb-4">
            Try adjusting your search or filters
          </p>
          {activeFilterCount > 0 && (
            <button
              onClick={handleClearFilters}
              className="text-[#529ec6] hover:text-[#202e46] font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
