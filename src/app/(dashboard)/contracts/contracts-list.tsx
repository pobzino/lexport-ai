"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
    FileText,
    Plus,
    ArrowRight,
    DollarSign,
    Clock,
    CheckCircle2,
    XCircle,
    Search,
    Filter,
    X,
    Shield,
    Briefcase,
    TrendingUp,
    Users,
    FileSignature,
    Globe,
    MoreHorizontal,
    Copy,
    Trash2,
    Send,
    Edit,
    Eye,
} from "lucide-react";

interface Contract {
    id: string;
    title: string;
    type: string;
    jurisdiction: string;
    status: string;
    updated_at: string;
    created_at: string;
    payment_required: boolean;
    payment_amount: number | null;
    payment_currency: string | null;
    payment_status: string;
    payment_structure: string | null;
    deposit_percentage: number | null;
    deposit_paid?: boolean;
    balance_remaining?: number;
    amount_paid?: number;
}

// Contract type display info
const CONTRACT_TYPE_DISPLAY: Record<string, { label: string; icon: typeof FileText; color: string; bg: string }> = {
    nda_mutual: { label: "Mutual NDA", icon: Shield, color: "text-violet-700", bg: "bg-violet-100" },
    nda_oneway: { label: "One-Way NDA", icon: Shield, color: "text-violet-700", bg: "bg-violet-100" },
    nda_one_way: { label: "One-Way NDA", icon: Shield, color: "text-violet-700", bg: "bg-violet-100" },
    independent_contractor: { label: "Contractor Agreement", icon: Briefcase, color: "text-blue-700", bg: "bg-blue-100" },
    contractor_agreement: { label: "Contractor Agreement", icon: Briefcase, color: "text-blue-700", bg: "bg-blue-100" },
    consulting_agreement: { label: "Consulting Agreement", icon: Users, color: "text-cyan-700", bg: "bg-cyan-100" },
    safe_note: { label: "SAFE Note", icon: TrendingUp, color: "text-emerald-700", bg: "bg-emerald-100" },
    freelance_service: { label: "Service Agreement", icon: FileSignature, color: "text-indigo-700", bg: "bg-indigo-100" },
    service_agreement: { label: "Service Agreement", icon: FileSignature, color: "text-indigo-700", bg: "bg-indigo-100" },
    ip_assignment: { label: "IP Assignment", icon: Shield, color: "text-purple-700", bg: "bg-purple-100" },
    advisor_agreement: { label: "Advisor Agreement", icon: Users, color: "text-teal-700", bg: "bg-teal-100" },
    employment_offer: { label: "Employment Offer", icon: Briefcase, color: "text-orange-700", bg: "bg-orange-100" },
    sow: { label: "Statement of Work", icon: FileText, color: "text-slate-700", bg: "bg-slate-100" },
};

// Jurisdiction display info
const JURISDICTION_DISPLAY: Record<string, { label: string; flag: string }> = {
    // New format (us_california, uk, etc.)
    us_california: { label: "California", flag: "🇺🇸" },
    us_texas: { label: "Texas", flag: "🇺🇸" },
    us_new_york: { label: "New York", flag: "🇺🇸" },
    us_delaware: { label: "Delaware", flag: "🇺🇸" },
    us_florida: { label: "Florida", flag: "🇺🇸" },
    uk: { label: "United Kingdom", flag: "🇬🇧" },
    // Old format (CA, TX, NY, UK)
    CA: { label: "California", flag: "🇺🇸" },
    TX: { label: "Texas", flag: "🇺🇸" },
    NY: { label: "New York", flag: "🇺🇸" },
    UK: { label: "United Kingdom", flag: "🇬🇧" },
    other: { label: "Other", flag: "🌍" },
};

// Get display info for contract type
function getTypeDisplay(type: string) {
    return CONTRACT_TYPE_DISPLAY[type] || {
        label: type.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
        icon: FileText,
        color: "text-slate-700",
        bg: "bg-slate-100"
    };
}

// Get display info for jurisdiction
function getJurisdictionDisplay(jurisdiction: string) {
    return JURISDICTION_DISPLAY[jurisdiction] || {
        label: jurisdiction.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
        flag: "🌍"
    };
}

// Format relative time
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

// Payment status badge component
function PaymentBadge({ contract }: { contract: Contract }) {
    if (!contract.payment_required) {
        return null;
    }

    const formatCurrency = (amount: number, currency: string = "usd") => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: currency.toUpperCase(),
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const currency = contract.payment_currency || "usd";
    const totalAmount = contract.payment_amount || 0;
    const amountPaid = contract.amount_paid || 0;
    const balanceRemaining = contract.balance_remaining || 0;
    const isDepositBalance = contract.payment_structure === "deposit_balance";

    // Fully paid
    if (contract.payment_status === "succeeded" || (amountPaid > 0 && balanceRemaining === 0)) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <CheckCircle2 className="w-3 h-3" />
                {formatCurrency(totalAmount, currency)} Paid
            </span>
        );
    }

    // Deposit paid, balance remaining
    if (isDepositBalance && contract.deposit_paid && balanceRemaining > 0) {
        return (
            <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle2 className="w-3 h-3" />
                    {formatCurrency(amountPaid, currency)}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    <Clock className="w-3 h-3" />
                    {formatCurrency(balanceRemaining, currency)} due
                </span>
            </div>
        );
    }

    // Processing
    if (contract.payment_status === "processing") {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <DollarSign className="w-3 h-3" />
                Processing
            </span>
        );
    }

    // Failed
    if (contract.payment_status === "failed") {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <XCircle className="w-3 h-3" />
                Failed
            </span>
        );
    }

    // Pending or no payment yet
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            <Clock className="w-3 h-3" />
            {formatCurrency(totalAmount, currency)} due
        </span>
    );
}

// Contract status badge
function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { label: string; className: string }> = {
        draft: { label: "Draft", className: "bg-slate-100 text-slate-700" },
        pending_signature: { label: "Awaiting Signature", className: "bg-amber-100 text-amber-700" },
        partially_signed: { label: "Partially Signed", className: "bg-blue-100 text-blue-700" },
        signed: { label: "Signed", className: "bg-emerald-100 text-emerald-700" },
        completed: { label: "Completed", className: "bg-emerald-100 text-emerald-700" },
        expired: { label: "Expired", className: "bg-red-100 text-red-700" },
        cancelled: { label: "Cancelled", className: "bg-slate-100 text-slate-500" },
    };

    const { label, className } = config[status] || { label: status, className: "bg-slate-100 text-slate-600" };

    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${className}`}>
            {label}
        </span>
    );
}

// Status options for filter
const STATUS_OPTIONS = [
    { value: "", label: "All Statuses" },
    { value: "draft", label: "Draft" },
    { value: "pending_signature", label: "Awaiting Signature" },
    { value: "signed", label: "Signed" },
    { value: "completed", label: "Completed" },
];

// Contract type options for filter (all types)
const TYPE_OPTIONS = [
    { value: "", label: "All Types" },
    { value: "nda_mutual", label: "Mutual NDA" },
    { value: "nda_oneway", label: "One-Way NDA" },
    { value: "nda_one_way", label: "One-Way NDA" },
    { value: "contractor_agreement", label: "Contractor Agreement" },
    { value: "independent_contractor", label: "Contractor Agreement" },
    { value: "consulting_agreement", label: "Consulting Agreement" },
    { value: "safe_note", label: "SAFE Note" },
    { value: "freelance_service", label: "Service Agreement" },
    { value: "service_agreement", label: "Service Agreement" },
    { value: "ip_assignment", label: "IP Assignment" },
    { value: "advisor_agreement", label: "Advisor Agreement" },
    { value: "employment_offer", label: "Employment Offer" },
    { value: "sow", label: "Statement of Work" },
];

// Payment status options
const PAYMENT_OPTIONS = [
    { value: "", label: "All Payments" },
    { value: "paid", label: "Fully Paid" },
    { value: "partial", label: "Balance Due" },
    { value: "pending", label: "Pending Payment" },
    { value: "no_payment", label: "No Payment Required" },
];

interface ContractsListProps {
    contracts: Contract[];
}

export function ContractsList({ contracts }: ContractsListProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [paymentFilter, setPaymentFilter] = useState("");
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    // Filter contracts based on search and filters
    const filteredContracts = useMemo(() => {
        return contracts.filter((contract) => {
            // Search filter (search in title and formatted type)
            const typeDisplay = getTypeDisplay(contract.type);
            const matchesSearch = searchQuery.trim() === "" ||
                contract.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                typeDisplay.label.toLowerCase().includes(searchQuery.toLowerCase());

            // Status filter
            const matchesStatus = statusFilter === "" || contract.status === statusFilter;

            // Type filter
            const matchesType = typeFilter === "" || contract.type === typeFilter;

            // Payment filter
            let matchesPayment = true;
            if (paymentFilter) {
                const isPaid = (contract.amount_paid || 0) > 0 && (contract.balance_remaining || 0) === 0;
                const isPartial = contract.payment_required && !!contract.deposit_paid && (contract.balance_remaining || 0) > 0;
                const isPending = contract.payment_required && !contract.deposit_paid && (contract.amount_paid || 0) === 0;
                const noPayment = !contract.payment_required;

                if (paymentFilter === "paid") matchesPayment = isPaid;
                else if (paymentFilter === "partial") matchesPayment = isPartial;
                else if (paymentFilter === "pending") matchesPayment = isPending;
                else if (paymentFilter === "no_payment") matchesPayment = noPayment;
            }

            return matchesSearch && matchesStatus && matchesType && matchesPayment;
        });
    }, [contracts, searchQuery, statusFilter, typeFilter, paymentFilter]);

    const hasActiveFilters = searchQuery || statusFilter || typeFilter || paymentFilter;

    const clearFilters = () => {
        setSearchQuery("");
        setStatusFilter("");
        setTypeFilter("");
        setPaymentFilter("");
    };

    // Get unique types from contracts for dynamic filter options
    const uniqueTypes = useMemo(() => {
        const types = new Set(contracts.map(c => c.type));
        return Array.from(types).map(type => ({
            value: type,
            label: getTypeDisplay(type).label
        }));
    }, [contracts]);

    return (
        <>
            {/* Search and Filter Bar */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search Input */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search contracts..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm appearance-none bg-white cursor-pointer min-w-[160px]"
                    >
                        {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>

                    {/* Type Filter (dynamic based on contracts) */}
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm appearance-none bg-white cursor-pointer min-w-[180px]"
                    >
                        <option value="">All Types</option>
                        {uniqueTypes.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>

                    {/* Payment Filter */}
                    <select
                        value={paymentFilter}
                        onChange={(e) => setPaymentFilter(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm appearance-none bg-white cursor-pointer min-w-[170px]"
                    >
                        {PAYMENT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>

                    {/* Clear Filters */}
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center gap-1 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <X className="w-4 h-4" />
                            Clear
                        </button>
                    )}
                </div>

                {/* Active filter count */}
                {hasActiveFilters && (
                    <div className="mt-3 text-sm text-slate-500">
                        Showing {filteredContracts.length} of {contracts.length} contracts
                    </div>
                )}
            </div>

            {/* Contracts List */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {filteredContracts.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText className="w-8 h-8 text-slate-400" />
                        </div>
                        {contracts.length === 0 ? (
                            <>
                                <h3 className="text-lg font-medium text-slate-900 mb-2">
                                    No contracts yet
                                </h3>
                                <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                                    Create your first contract using our AI-powered generator.
                                </p>
                                <Link
                                    href="/contracts/new"
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#202e46] text-white rounded-lg hover:bg-[#1a2539] transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    Create Your First Contract
                                </Link>
                            </>
                        ) : (
                            <>
                                <h3 className="text-lg font-medium text-slate-900 mb-2">
                                    No matching contracts
                                </h3>
                                <p className="text-slate-500 mb-4">
                                    Try adjusting your search or filters
                                </p>
                                <button
                                    onClick={clearFilters}
                                    className="text-brand-600 hover:text-brand-700 font-medium"
                                >
                                    Clear all filters
                                </button>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filteredContracts.map((contract) => {
                            const typeDisplay = getTypeDisplay(contract.type);
                            const jurisdictionDisplay = getJurisdictionDisplay(contract.jurisdiction);
                            const TypeIcon = typeDisplay.icon;

                            return (
                                <div
                                    key={contract.id}
                                    className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group"
                                >
                                    <Link
                                        href={`/contracts/${contract.id}/edit`}
                                        className="flex items-center gap-4 flex-1 min-w-0"
                                    >
                                        {/* Type Icon */}
                                        <div className={`w-10 h-10 ${typeDisplay.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                                            <TypeIcon className={`w-5 h-5 ${typeDisplay.color}`} />
                                        </div>

                                        {/* Contract Info */}
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium text-slate-900 truncate">
                                                {contract.title}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                {/* Type Badge */}
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${typeDisplay.bg} ${typeDisplay.color}`}>
                                                    {typeDisplay.label}
                                                </span>
                                                {/* Jurisdiction */}
                                                <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                                                    <span>{jurisdictionDisplay.flag}</span>
                                                    <span>{jurisdictionDisplay.label}</span>
                                                </span>
                                            </div>
                                        </div>
                                    </Link>

                                    {/* Right side: Payment, Status, Date, Actions */}
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        {/* Payment Badge */}
                                        <div className="hidden sm:block">
                                            <PaymentBadge contract={contract} />
                                        </div>

                                        {/* Status Badge */}
                                        <StatusBadge status={contract.status} />

                                        {/* Last Updated */}
                                        <span className="text-sm text-slate-500 hidden md:block min-w-[80px] text-right">
                                            {formatTimeAgo(contract.updated_at)}
                                        </span>

                                        {/* Actions Dropdown */}
                                        <div className="relative">
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setOpenDropdown(openDropdown === contract.id ? null : contract.id);
                                                }}
                                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <MoreHorizontal className="w-4 h-4 text-slate-500" />
                                            </button>

                                            {openDropdown === contract.id && (
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-10"
                                                        onClick={() => setOpenDropdown(null)}
                                                    />
                                                    <div className="absolute right-0 bottom-full mb-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
                                                        <Link
                                                            href={`/contracts/${contract.id}/edit`}
                                                            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                                            onClick={() => setOpenDropdown(null)}
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                            Edit Contract
                                                        </Link>
                                                        <Link
                                                            href={`/contracts/${contract.id}/preview`}
                                                            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                                            onClick={() => setOpenDropdown(null)}
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                            Preview
                                                        </Link>
                                                        {contract.status === "draft" && (
                                                            <button
                                                                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left"
                                                                onClick={() => setOpenDropdown(null)}
                                                            >
                                                                <Send className="w-4 h-4" />
                                                                Send for Signature
                                                            </button>
                                                        )}
                                                        <button
                                                            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left"
                                                            onClick={() => setOpenDropdown(null)}
                                                        >
                                                            <Copy className="w-4 h-4" />
                                                            Duplicate
                                                        </button>
                                                        <div className="border-t border-slate-100 my-1" />
                                                        <button
                                                            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                                                            onClick={() => setOpenDropdown(null)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                            Delete
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Arrow */}
                                        <Link href={`/contracts/${contract.id}/edit`}>
                                            <ArrowRight className="w-4 h-4 text-slate-400" />
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}
