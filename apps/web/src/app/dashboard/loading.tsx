export default function DashboardLoading() {
    return (
        <div className="min-h-screen bg-black p-4">
            {/* Stories skeleton */}
            <div className="flex gap-3 mb-6 overflow-hidden">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0">
                        <div className="w-16 h-16 rounded-full bg-white/5 animate-pulse" />
                        <div className="w-10 h-2 rounded bg-white/5 animate-pulse" />
                    </div>
                ))}
            </div>
            {/* Feed skeleton */}
            <div className="max-w-2xl mx-auto space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-white/5 rounded-2xl p-4 space-y-3 animate-pulse">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/10" />
                            <div className="space-y-1.5">
                                <div className="h-3 w-24 rounded bg-white/10" />
                                <div className="h-2 w-16 rounded bg-white/5" />
                            </div>
                        </div>
                        <div className="h-48 rounded-xl bg-white/10" />
                        <div className="flex gap-4">
                            <div className="h-6 w-12 rounded bg-white/5" />
                            <div className="h-6 w-12 rounded bg-white/5" />
                            <div className="h-6 w-12 rounded bg-white/5" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
