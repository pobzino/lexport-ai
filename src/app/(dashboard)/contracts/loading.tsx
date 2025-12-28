import { ContractListSkeleton } from "@/components/ui/skeleton";

export default function ContractsLoading() {
    return (
        <div className="space-y-6">
            {/* Header skeleton */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="h-7 w-32 bg-slate-200 rounded animate-pulse" />
                    <div className="h-5 w-64 bg-slate-200 rounded animate-pulse mt-2" />
                </div>
                <div className="h-10 w-32 bg-slate-200 rounded-lg animate-pulse" />
            </div>

            {/* Search and filter skeleton */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex gap-4">
                    <div className="flex-1 h-10 bg-slate-200 rounded-lg animate-pulse" />
                    <div className="w-32 h-10 bg-slate-200 rounded-lg animate-pulse" />
                    <div className="w-32 h-10 bg-slate-200 rounded-lg animate-pulse" />
                </div>
            </div>

            {/* Contracts list */}
            <ContractListSkeleton count={8} />
        </div>
    );
}
