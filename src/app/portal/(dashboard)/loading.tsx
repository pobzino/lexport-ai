import { Skeleton } from "@/components/ui/skeleton";

export default function PortalLoading() {
    return (
        <div className="space-y-8">
            {/* Welcome Header Skeleton */}
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-6 sm:p-8">
                <div className="space-y-3">
                    <div className="h-8 w-64 bg-white/20 rounded animate-pulse" />
                    <div className="h-5 w-48 bg-white/10 rounded animate-pulse" />
                </div>
            </div>

            {/* Stats Cards Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
                        <div className="flex items-center gap-3">
                            <Skeleton className="w-10 h-10 rounded-lg" />
                            <div className="space-y-2">
                                <Skeleton className="h-6 w-8" />
                                <Skeleton className="h-4 w-32" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Contract Section Skeleton */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Skeleton className="w-5 h-5" />
                    <Skeleton className="h-5 w-32" />
                </div>
                <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-4">
                                <Skeleton className="w-10 h-10 rounded-lg" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-48" />
                                    <Skeleton className="h-3 w-32" />
                                </div>
                            </div>
                            <Skeleton className="h-9 w-28 rounded-lg" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
