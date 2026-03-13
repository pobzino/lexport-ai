"use client";

import { useState, useMemo, useEffect, useCallback, useRef, memo } from "react";
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
    Lock,
    Folder,
    FolderPlus,
    Tag,
    ChevronRight,
    ChevronDown,
    Upload,
    Download,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

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
    folder_id?: string | null;
    tags?: { id: string; name: string; color: string }[];
    source_type?: "generated" | "uploaded";
}

interface FolderType {
    id: string;
    name: string;
    color: string;
    icon: string;
    contracts: { count: number }[];
}

interface TagType {
    id: string;
    name: string;
    color: string;
    contract_tags: { count: number }[];
}

const TAG_COLORS = [
    "#202e46", "#529ec6", "#10b981", "#f59e0b", "#ef4444",
    "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#f97316"
];

// Contract type display info
const CONTRACT_TYPE_DISPLAY: Record<string, { label: string; icon: typeof FileText; color: string; bg: string }> = {
    nda_mutual: { label: "Mutual NDA", icon: Shield, color: "text-[#202e46]", bg: "bg-[#529ec6]/10" },
    nda_oneway: { label: "One-Way NDA", icon: Shield, color: "text-[#202e46]", bg: "bg-[#529ec6]/10" },
    nda_one_way: { label: "One-Way NDA", icon: Shield, color: "text-[#202e46]", bg: "bg-[#529ec6]/10" },
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
    const config: Record<string, { label: string; className: string; locked?: boolean }> = {
        draft: { label: "Draft", className: "bg-slate-100 text-slate-700" },
        pending_signature: { label: "Awaiting Signature", className: "bg-amber-100 text-amber-700", locked: true },
        partially_signed: { label: "Partially Signed", className: "bg-blue-100 text-blue-700", locked: true },
        signed: { label: "Signed", className: "bg-emerald-100 text-emerald-700", locked: true },
        completed: { label: "Completed", className: "bg-emerald-100 text-emerald-700", locked: true },
        expired: { label: "Expired", className: "bg-red-100 text-red-700", locked: true },
        cancelled: { label: "Cancelled", className: "bg-slate-100 text-slate-500" },
    };

    const { label, className, locked } = config[status] || { label: status, className: "bg-slate-100 text-slate-600" };

    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${className}`}>
            {locked && <Lock className="w-3 h-3" />}
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

// Sort options
const SORT_OPTIONS = [
    { value: "updated_desc", label: "Recently Updated" },
    { value: "updated_asc", label: "Oldest Updated" },
    { value: "created_desc", label: "Recently Created" },
    { value: "created_asc", label: "Oldest Created" },
    { value: "title_asc", label: "Title A-Z" },
    { value: "title_desc", label: "Title Z-A" },
];

// Memoized contract row to prevent re-renders when filters change
interface ContractRowProps {
    contract: Contract;
    folders: FolderType[];
    openDropdown: string | null;
    setOpenDropdown: (id: string | null) => void;
    onMoveToFolder: (contractId: string, folderId: string | null) => void;
    onDelete: (contractId: string) => void;
    onDuplicate: (contractId: string) => void;
}

const ContractRow = memo(function ContractRow({
    contract,
    folders,
    openDropdown,
    setOpenDropdown,
    onMoveToFolder,
    onDelete,
    onDuplicate,
}: ContractRowProps) {
    const typeDisplay = getTypeDisplay(contract.type);
    const jurisdictionDisplay = getJurisdictionDisplay(contract.jurisdiction);
    const TypeIcon = typeDisplay.icon;

    return (
        <div className="flex items-center justify-between p-3 sm:p-4 hover:bg-slate-50 transition-colors group">
            <Link
                href={`/contracts/${contract.id}/edit`}
                className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0"
            >
                <div className={`w-9 h-9 sm:w-10 sm:h-10 ${typeDisplay.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <TypeIcon className={`w-4 h-4 sm:w-5 sm:h-5 ${typeDisplay.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900 truncate text-sm sm:text-base">{contract.title}</p>
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-0.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${typeDisplay.bg} ${typeDisplay.color}`}>
                            {typeDisplay.label}
                        </span>
                        {contract.source_type === "uploaded" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-violet-100 text-violet-700">
                                <Upload className="w-3 h-3" />
                                Uploaded
                            </span>
                        )}
                        <span className="hidden sm:inline-flex items-center gap-1 text-xs text-slate-500">
                            <span>{jurisdictionDisplay.flag}</span>
                            <span>{jurisdictionDisplay.label}</span>
                        </span>
                    </div>
                </div>
            </Link>

            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-2">
                <div className="hidden sm:block">
                    <PaymentBadge contract={contract} />
                </div>
                <div className="hidden sm:block">
                    <StatusBadge status={contract.status} />
                </div>
                {/* Mobile: compact status */}
                <div className="sm:hidden">
                    <StatusBadge status={contract.status} />
                </div>
                <span className="text-sm text-slate-500 hidden md:block min-w-[80px] text-right">
                    {formatTimeAgo(contract.updated_at)}
                </span>
                <div className="relative">
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setOpenDropdown(openDropdown === contract.id ? null : contract.id);
                        }}
                        className="p-2.5 hover:bg-slate-100 rounded-lg transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 min-h-[36px] min-w-[36px] flex items-center justify-center"
                        aria-label="More actions"
                    >
                        <MoreHorizontal className="w-4 h-4 text-slate-500" />
                    </button>
                    {openDropdown === contract.id && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
                            <div className="absolute right-0 bottom-full mb-1 w-52 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
                                <Link
                                    href={`/contracts/${contract.id}/edit`}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                    onClick={() => setOpenDropdown(null)}
                                >
                                    {["pending_signature", "signed", "completed", "expired"].includes(contract.status) ? (
                                        <><Eye className="w-4 h-4" />View Contract</>
                                    ) : (
                                        <><Edit className="w-4 h-4" />Edit Contract</>
                                    )}
                                </Link>
                                {contract.status === "draft" && (
                                    <Link
                                        href={`/contracts/${contract.id}/sign`}
                                        className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                        onClick={() => setOpenDropdown(null)}
                                    >
                                        <Send className="w-4 h-4" />
                                        Send for Signature
                                    </Link>
                                )}
                                <button
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left"
                                    onClick={() => onDuplicate(contract.id)}
                                >
                                    <Copy className="w-4 h-4" />
                                    Duplicate
                                </button>
                                <Link
                                    href={`/my-templates/create?from=${contract.id}`}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                    onClick={() => setOpenDropdown(null)}
                                >
                                    <FileSignature className="w-4 h-4" />
                                    Save as Template
                                </Link>
                                <a
                                    href={`/api/contracts/${contract.id}/pdf`}
                                    download
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                    onClick={() => setOpenDropdown(null)}
                                >
                                    <Download className="w-4 h-4" />
                                    Download PDF
                                </a>
                                <div className="relative group">
                                    <button className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left">
                                        <Folder className="w-4 h-4" />
                                        Move to Folder
                                        <ChevronRight className="w-3 h-3 ml-auto" />
                                    </button>
                                    <div className="absolute right-full top-0 mr-1 w-44 bg-white rounded-lg shadow-lg border border-slate-200 py-1 hidden group-hover:block">
                                        <button
                                            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left"
                                            onClick={() => onMoveToFolder(contract.id, null)}
                                        >
                                            <X className="w-4 h-4" />
                                            No Folder
                                        </button>
                                        {folders.length > 0 && <div className="border-t border-slate-100 my-1" />}
                                        {folders.map((folder) => (
                                            <button
                                                key={folder.id}
                                                className={cn(
                                                    "flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 w-full text-left",
                                                    contract.folder_id === folder.id ? "text-[#529ec6] bg-[#529ec6]/5" : "text-slate-700"
                                                )}
                                                onClick={() => onMoveToFolder(contract.id, folder.id)}
                                            >
                                                <Folder className="w-4 h-4" style={{ color: folder.color }} />
                                                <span className="truncate">{folder.name}</span>
                                                {contract.folder_id === folder.id && <CheckCircle2 className="w-3 h-3 ml-auto flex-shrink-0" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {["draft", "cancelled"].includes(contract.status) && (
                                    <>
                                        <div className="border-t border-slate-100 my-1" />
                                        <button
                                            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                                            onClick={() => onDelete(contract.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Delete
                                        </button>
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </div>
                <Link href={`/contracts/${contract.id}/edit`}>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                </Link>
            </div>
        </div>
    );
});

interface ContractsListProps {
    contracts: Contract[];
}

export function ContractsList({ contracts }: ContractsListProps) {
    const toast = useToast();
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [jurisdictionFilter, setJurisdictionFilter] = useState("");
    const [paymentFilter, setPaymentFilter] = useState("");
    const [sortBy, setSortBy] = useState("updated_desc");
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    // Debounce search input (300ms)
    useEffect(() => {
        searchTimerRef.current = setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => clearTimeout(searchTimerRef.current);
    }, [searchQuery]);

    // Folders & Tags state
    const [folders, setFolders] = useState<FolderType[]>([]);
    const [tags, setTags] = useState<TagType[]>([]);
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
    const [foldersExpanded, setFoldersExpanded] = useState(true);
    const [tagsExpanded, setTagsExpanded] = useState(true);
    const [isAddingFolder, setIsAddingFolder] = useState(false);
    const [isAddingTag, setIsAddingTag] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [newTagName, setNewTagName] = useState("");
    const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
    const [sidebarLoading, setSidebarLoading] = useState(true);

    const supabase = createClient();

    // Fetch folders and tags
    useEffect(() => {
        async function fetchFoldersAndTags() {
            try {
                const [foldersRes, tagsRes] = await Promise.all([
                    // Use !folder_id to disambiguate the relationship (direct FK vs junction table)
                    supabase.from("folders").select("*, contracts!folder_id(count)").order("name"),
                    supabase.from("tags").select("*, contract_tags(count)").order("name"),
                ]);
                if (foldersRes.data) setFolders(foldersRes.data);
                if (tagsRes.data) setTags(tagsRes.data);
            } catch (error) {
                console.error("Error fetching folders/tags:", error);
            } finally {
                setSidebarLoading(false);
            }
        }
        fetchFoldersAndTags();
    }, []);

    // Create folder
    async function createFolder() {
        if (!newFolderName.trim()) return;
        try {
            const res = await fetch("/api/folders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newFolderName }),
            });
            if (res.ok) {
                const { folder } = await res.json();
                setFolders(prev => [...prev, { ...folder, contracts: [{ count: 0 }] }]);
                setNewFolderName("");
                setIsAddingFolder(false);
                toast.success(`Folder "${folder.name}" created`);
            } else {
                toast.error("Failed to create folder");
            }
        } catch (error) {
            console.error("Error creating folder:", error);
            toast.error("Failed to create folder");
        }
    }

    // Create tag
    async function createTag() {
        if (!newTagName.trim()) return;
        try {
            const res = await fetch("/api/tags", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newTagName, color: newTagColor }),
            });
            if (res.ok) {
                const { tag } = await res.json();
                setTags(prev => [...prev, { ...tag, contract_tags: [{ count: 0 }] }]);
                setNewTagName("");
                setIsAddingTag(false);
                toast.success(`Tag "${tag.name}" created`);
            } else {
                toast.error("Failed to create tag");
            }
        } catch (error) {
            console.error("Error creating tag:", error);
            toast.error("Failed to create tag");
        }
    }

    // Delete folder
    async function deleteFolder(folderId: string) {
        const folder = folders.find(f => f.id === folderId);
        try {
            await fetch(`/api/folders/${folderId}`, { method: "DELETE" });
            setFolders(prev => prev.filter(f => f.id !== folderId));
            if (selectedFolderId === folderId) setSelectedFolderId(null);
            toast.success(`Folder "${folder?.name}" deleted`);
        } catch (error) {
            console.error("Error deleting folder:", error);
            toast.error("Failed to delete folder");
        }
    }

    // Delete tag
    async function deleteTag(tagId: string) {
        const tag = tags.find(t => t.id === tagId);
        try {
            await fetch(`/api/tags/${tagId}`, { method: "DELETE" });
            setTags(prev => prev.filter(t => t.id !== tagId));
            if (selectedTagId === tagId) setSelectedTagId(null);
            toast.success(`Tag "${tag?.name}" deleted`);
        } catch (error) {
            console.error("Error deleting tag:", error);
            toast.error("Failed to delete tag");
        }
    }

    // Local contracts state for mutations
    const [localContracts, setLocalContracts] = useState<Contract[]>(contracts);

    // Sync with props
    useEffect(() => {
        setLocalContracts(contracts);
    }, [contracts]);

    // Move contract to folder (memoized)
    const moveToFolder = useCallback(async function moveToFolder(contractId: string, folderId: string | null) {
        try {
            const { error } = await supabase
                .from("contracts")
                .update({ folder_id: folderId })
                .eq("id", contractId);

            if (!error) {
                setLocalContracts(prev =>
                    prev.map(c => c.id === contractId ? { ...c, folder_id: folderId } : c)
                );
                // Refresh folder counts
                const foldersRes = await supabase.from("folders").select("*, contracts!folder_id(count)").order("name");
                if (foldersRes.data) setFolders(foldersRes.data);
            }
        } catch (error) {
            console.error("Error moving contract:", error);
        }
        setOpenDropdown(null);
    }, [supabase]);

    // Delete contract (memoized)
    const deleteContract = useCallback(async function deleteContract(contractId: string) {
        if (!confirm("Are you sure you want to delete this contract? This cannot be undone.")) return;
        try {
            const { error } = await supabase
                .from("contracts")
                .delete()
                .eq("id", contractId);

            if (!error) {
                setLocalContracts(prev => prev.filter(c => c.id !== contractId));
            }
        } catch (error) {
            console.error("Error deleting contract:", error);
        }
        setOpenDropdown(null);
    }, [supabase]);

    // Duplicate contract (memoized)
    const duplicateContract = useCallback(async function duplicateContract(contractId: string) {
        try {
            const res = await fetch(`/api/contracts/${contractId}/duplicate`, { method: "POST" });
            if (res.ok) {
                const { contract } = await res.json();
                setLocalContracts(prev => [contract, ...prev]);
            }
        } catch (error) {
            console.error("Error duplicating contract:", error);
        }
        setOpenDropdown(null);
    }, []);

    // Filter and sort contracts
    const filteredContracts = useMemo(() => {
        // First filter
        const filtered = localContracts.filter((contract) => {
            // Search filter (search in title and formatted type) — uses debounced value
            const typeDisplay = getTypeDisplay(contract.type);
            const matchesSearch = debouncedSearch.trim() === "" ||
                contract.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                typeDisplay.label.toLowerCase().includes(debouncedSearch.toLowerCase());

            // Status filter
            const matchesStatus = statusFilter === "" || contract.status === statusFilter;

            // Type filter
            const matchesType = typeFilter === "" || contract.type === typeFilter;

            // Jurisdiction filter
            const matchesJurisdiction = jurisdictionFilter === "" || contract.jurisdiction === jurisdictionFilter;

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

            // Folder filter
            const matchesFolder = !selectedFolderId || contract.folder_id === selectedFolderId;

            // Tag filter (would need to fetch contract tags separately for this to work)
            const matchesTag = !selectedTagId || contract.tags?.some(t => t.id === selectedTagId);

            return matchesSearch && matchesStatus && matchesType && matchesJurisdiction && matchesPayment && matchesFolder && matchesTag;
        });

        // Then sort
        return filtered.sort((a, b) => {
            switch (sortBy) {
                case "updated_desc":
                    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
                case "updated_asc":
                    return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
                case "created_desc":
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                case "created_asc":
                    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                case "title_asc":
                    return a.title.localeCompare(b.title);
                case "title_desc":
                    return b.title.localeCompare(a.title);
                default:
                    return 0;
            }
        });
    }, [localContracts, debouncedSearch, statusFilter, typeFilter, jurisdictionFilter, paymentFilter, sortBy, selectedFolderId, selectedTagId]);

    const hasActiveFilters = useMemo(() =>
        !!(searchQuery || statusFilter || typeFilter || jurisdictionFilter || paymentFilter || selectedFolderId || selectedTagId),
        [searchQuery, statusFilter, typeFilter, jurisdictionFilter, paymentFilter, selectedFolderId, selectedTagId]
    );

    const clearFilters = useCallback(() => {
        setSearchQuery("");
        setStatusFilter("");
        setTypeFilter("");
        setJurisdictionFilter("");
        setPaymentFilter("");
        setSortBy("updated_desc");
        setSelectedFolderId(null);
        setSelectedTagId(null);
    }, []);

    // Get unique types from contracts for dynamic filter options
    const uniqueTypes = useMemo(() => {
        const types = new Set(contracts.map(c => c.type));
        return Array.from(types).map(type => ({
            value: type,
            label: getTypeDisplay(type).label
        }));
    }, [contracts]);

    // Get unique jurisdictions from contracts
    const uniqueJurisdictions = useMemo(() => {
        const jurisdictions = new Set(contracts.map(c => c.jurisdiction));
        return Array.from(jurisdictions).map(jurisdiction => ({
            value: jurisdiction,
            label: getJurisdictionDisplay(jurisdiction).label,
            flag: getJurisdictionDisplay(jurisdiction).flag
        }));
    }, [contracts]);

    const [showMobileSidebar, setShowMobileSidebar] = useState(false);
    const [showMobileFilters, setShowMobileFilters] = useState(false);

    return (
        <div className="flex gap-6 min-w-0 overflow-hidden">
            {/* Mobile Sidebar Overlay */}
            {showMobileSidebar && (
                <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setShowMobileSidebar(false)}>
                    <div className="absolute inset-0 bg-black/50" />
                    <div
                        className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-white shadow-xl overflow-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                            <span className="font-semibold text-slate-900">Filters</span>
                            <button onClick={() => setShowMobileSidebar(false)} className="p-1 hover:bg-slate-100 rounded">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>
                        {/* All Contracts - Mobile */}
                        <button
                            onClick={() => { setSelectedFolderId(null); setSelectedTagId(null); setShowMobileSidebar(false); }}
                            className={cn(
                                "flex items-center gap-2 w-full px-4 py-3 text-sm font-medium transition-colors",
                                !selectedFolderId && !selectedTagId
                                    ? "bg-[#529ec6]/10 text-[#202e46]"
                                    : "text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            <Folder className="h-4 w-4" />
                            All Contracts
                            <span className="ml-auto text-xs text-slate-400">{contracts.length}</span>
                        </button>
                        {/* Folders Section - Mobile */}
                        <div className="border-t border-slate-100 px-4 py-3">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Folders</p>
                            {folders.length === 0 ? (
                                <p className="text-xs text-slate-400">No folders yet</p>
                            ) : folders.map((folder) => (
                                <button
                                    key={folder.id}
                                    className={cn(
                                        "flex items-center gap-2 w-full py-2 text-sm transition-colors",
                                        selectedFolderId === folder.id
                                            ? "text-[#202e46] font-medium"
                                            : "text-slate-600"
                                    )}
                                    onClick={() => { setSelectedFolderId(folder.id); setSelectedTagId(null); setShowMobileSidebar(false); }}
                                >
                                    <Folder className="h-4 w-4" style={{ color: folder.color }} />
                                    <span className="truncate">{folder.name}</span>
                                    <span className="ml-auto text-xs text-slate-400">{folder.contracts?.[0]?.count || 0}</span>
                                </button>
                            ))}
                        </div>
                        {/* Tags Section - Mobile */}
                        <div className="border-t border-slate-100 px-4 py-3">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Tags</p>
                            {tags.length === 0 ? (
                                <p className="text-xs text-slate-400">No tags yet</p>
                            ) : tags.map((tag) => (
                                <button
                                    key={tag.id}
                                    className={cn(
                                        "flex items-center gap-2 w-full py-2 text-sm transition-colors",
                                        selectedTagId === tag.id
                                            ? "text-[#202e46] font-medium"
                                            : "text-slate-600"
                                    )}
                                    onClick={() => { setSelectedTagId(tag.id); setSelectedFolderId(null); setShowMobileSidebar(false); }}
                                >
                                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: tag.color }} />
                                    <span className="truncate">{tag.name}</span>
                                    <span className="ml-auto text-xs text-slate-400">{tag.contract_tags?.[0]?.count || 0}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Folders & Tags Sidebar - Desktop */}
            <div className="hidden lg:block w-56 flex-shrink-0 bg-white rounded-xl border border-slate-200 h-fit sticky top-24">
                {/* All Contracts */}
                <button
                    onClick={() => { setSelectedFolderId(null); setSelectedTagId(null); }}
                    className={cn(
                        "flex items-center gap-2 w-full px-4 py-3 text-sm font-medium transition-colors rounded-t-xl",
                        !selectedFolderId && !selectedTagId
                            ? "bg-[#529ec6]/10 text-[#202e46]"
                            : "text-slate-600 hover:bg-slate-50"
                    )}
                >
                    <Folder className="h-4 w-4" />
                    All Contracts
                    <span className="ml-auto text-xs text-slate-400">{contracts.length}</span>
                </button>

                {/* Folders Section */}
                <div className="border-t border-slate-100">
                    <button
                        onClick={() => setFoldersExpanded(!foldersExpanded)}
                        className="flex items-center justify-between w-full px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-600"
                    >
                        <span>Folders</span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsAddingFolder(true); }}
                                className="p-0.5 hover:bg-slate-100 rounded"
                            >
                                <FolderPlus className="h-3.5 w-3.5" />
                            </button>
                            {foldersExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </div>
                    </button>

                    {foldersExpanded && (
                        <div className="pb-2">
                            {isAddingFolder && (
                                <div className="px-3 py-1.5">
                                    <input
                                        type="text"
                                        value={newFolderName}
                                        onChange={(e) => setNewFolderName(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && createFolder()}
                                        placeholder="Folder name..."
                                        className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-[#529ec6]/50"
                                        autoFocus
                                    />
                                    <div className="flex gap-2 mt-1.5">
                                        <button onClick={createFolder} className="text-xs text-[#529ec6] hover:underline">Save</button>
                                        <button onClick={() => setIsAddingFolder(false)} className="text-xs text-slate-400 hover:underline">Cancel</button>
                                    </div>
                                </div>
                            )}

                            {folders.length === 0 && !isAddingFolder && (
                                <p className="px-4 py-2 text-xs text-slate-400">No folders yet</p>
                            )}

                            {folders.map((folder) => (
                                <div
                                    key={folder.id}
                                    className={cn(
                                        "group flex items-center justify-between px-4 py-2 text-sm cursor-pointer transition-colors",
                                        selectedFolderId === folder.id
                                            ? "bg-[#529ec6]/10 text-[#202e46]"
                                            : "text-slate-600 hover:bg-slate-50"
                                    )}
                                    onClick={() => { setSelectedFolderId(folder.id); setSelectedTagId(null); }}
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Folder className="h-4 w-4 flex-shrink-0" style={{ color: folder.color }} />
                                        <span className="truncate">{folder.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs text-slate-400">
                                            {folder.contracts?.[0]?.count || 0}
                                        </span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id); }}
                                            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-500"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Tags Section */}
                <div className="border-t border-slate-100">
                    <button
                        onClick={() => setTagsExpanded(!tagsExpanded)}
                        className="flex items-center justify-between w-full px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-600"
                    >
                        <span>Tags</span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsAddingTag(true); }}
                                className="p-0.5 hover:bg-slate-100 rounded"
                            >
                                <Tag className="h-3.5 w-3.5" />
                            </button>
                            {tagsExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </div>
                    </button>

                    {tagsExpanded && (
                        <div className="pb-2">
                            {isAddingTag && (
                                <div className="px-3 py-1.5">
                                    <input
                                        type="text"
                                        value={newTagName}
                                        onChange={(e) => setNewTagName(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && createTag()}
                                        placeholder="Tag name..."
                                        className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-[#529ec6]/50"
                                        autoFocus
                                    />
                                    <div className="flex gap-1 mt-2 flex-wrap">
                                        {TAG_COLORS.map((color) => (
                                            <button
                                                key={color}
                                                onClick={() => setNewTagColor(color)}
                                                className={cn(
                                                    "h-5 w-5 rounded-full border-2",
                                                    newTagColor === color ? "border-slate-400" : "border-transparent"
                                                )}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex gap-2 mt-1.5">
                                        <button onClick={createTag} className="text-xs text-[#529ec6] hover:underline">Save</button>
                                        <button onClick={() => setIsAddingTag(false)} className="text-xs text-slate-400 hover:underline">Cancel</button>
                                    </div>
                                </div>
                            )}

                            {tags.length === 0 && !isAddingTag && (
                                <p className="px-4 py-2 text-xs text-slate-400">No tags yet</p>
                            )}

                            {tags.map((tag) => (
                                <div
                                    key={tag.id}
                                    className={cn(
                                        "group flex items-center justify-between px-4 py-2 text-sm cursor-pointer transition-colors",
                                        selectedTagId === tag.id
                                            ? "bg-[#529ec6]/10 text-[#202e46]"
                                            : "text-slate-600 hover:bg-slate-50"
                                    )}
                                    onClick={() => { setSelectedTagId(tag.id); setSelectedFolderId(null); }}
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div
                                            className="h-3 w-3 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: tag.color }}
                                        />
                                        <span className="truncate">{tag.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs text-slate-400">
                                            {tag.contract_tags?.[0]?.count || 0}
                                        </span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); deleteTag(tag.id); }}
                                            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-500"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0 space-y-4">
                {/* Search and Filter Bar */}
                <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4">
                    {/* Top row: always visible — search + mobile toggle buttons */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* Mobile Folders Button */}
                        <button
                            onClick={() => setShowMobileSidebar(true)}
                            className="lg:hidden flex items-center gap-2 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 flex-shrink-0"
                        >
                            <Folder className="w-4 h-4" />
                            <span className="hidden sm:inline">Folders & Tags</span>
                            {(selectedFolderId || selectedTagId) && (
                                <span className="w-2 h-2 bg-[#529ec6] rounded-full" />
                            )}
                        </button>
                        {/* Search Input */}
                        <div className="relative flex-1 min-w-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search contracts by title..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
                            />
                        </div>
                        {/* Mobile Filters Toggle */}
                        <button
                            onClick={() => setShowMobileFilters(!showMobileFilters)}
                            className={cn(
                                "sm:hidden flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg flex-shrink-0 min-h-[36px]",
                                showMobileFilters || hasActiveFilters
                                    ? "border-[#529ec6] text-[#529ec6] bg-[#529ec6]/5"
                                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            <Filter className="w-4 h-4" />
                            {hasActiveFilters && (
                                <span className="w-2 h-2 bg-[#529ec6] rounded-full" />
                            )}
                        </button>
                    </div>

                    {/* Filter dropdowns — always visible on sm+, collapsible on mobile */}
                    <div className={cn(
                        "flex flex-col sm:flex-row gap-3 mt-3 pt-3 border-t border-slate-100",
                        showMobileFilters ? "flex" : "hidden sm:flex"
                    )}>
                        {/* Status Filter */}
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm appearance-none bg-white cursor-pointer sm:min-w-[140px]"
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
                            className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm appearance-none bg-white cursor-pointer sm:min-w-[140px]"
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
                            className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm appearance-none bg-white cursor-pointer sm:min-w-[140px]"
                        >
                            {PAYMENT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>

                        {/* Jurisdiction Filter (if contracts have multiple) */}
                        {uniqueJurisdictions.length > 1 && (
                            <select
                                value={jurisdictionFilter}
                                onChange={(e) => setJurisdictionFilter(e.target.value)}
                                className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm appearance-none bg-white cursor-pointer sm:min-w-[140px]"
                            >
                                <option value="">All Jurisdictions</option>
                                {uniqueJurisdictions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.flag} {option.label}
                                    </option>
                                ))}
                            </select>
                        )}

                        {/* Sort */}
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm appearance-none bg-white cursor-pointer sm:min-w-[160px] sm:ml-auto"
                        >
                            {SORT_OPTIONS.map((option) => (
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
                <div className="bg-white rounded-xl border border-slate-200">
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
                            {filteredContracts.map((contract) => (
                                <ContractRow
                                    key={contract.id}
                                    contract={contract}
                                    folders={folders}
                                    openDropdown={openDropdown}
                                    setOpenDropdown={setOpenDropdown}
                                    onMoveToFolder={moveToFolder}
                                    onDelete={deleteContract}
                                    onDuplicate={duplicateContract}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
