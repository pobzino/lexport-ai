import { DashboardStatsSkeleton, ContractListSkeleton, QuickActionsSkeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
    return (
        <div className="space-y-8">
            {/* Welcome skeleton */}
            <div>
                <div className="h-7 w-48 bg-slate-200 rounded animate-pulse" />
                <div className="h-5 w-64 bg-slate-200 rounded animate-pulse mt-2" />
            </div>

            {/* Stats */}
            <DashboardStatsSkeleton />

            {/* Quick Actions */}
            <QuickActionsSkeleton />

            {/* Recent Contracts */}
            <ContractListSkeleton count={5} />
        </div>
    );
}
