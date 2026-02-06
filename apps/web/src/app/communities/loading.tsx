export default function CommunitiesLoading() {
    return (
        <div className="min-h-screen bg-black p-4 sm:p-8 max-w-6xl mx-auto">
            <div className="h-8 w-48 rounded bg-white/5 animate-pulse mb-8" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white/5 rounded-2xl p-4 animate-pulse space-y-3">
                        <div className="h-32 rounded-xl bg-white/10" />
                        <div className="h-4 w-32 rounded bg-white/10" />
                        <div className="h-3 w-48 rounded bg-white/5" />
                        <div className="h-3 w-20 rounded bg-white/5" />
                    </div>
                ))}
            </div>
        </div>
    );
}
