export default function MessagesLoading() {
    return (
        <div className="min-h-screen bg-black flex">
            {/* Sidebar skeleton */}
            <div className="w-80 border-r border-white/10 p-4 space-y-3">
                <div className="h-10 rounded-xl bg-white/5 animate-pulse mb-4" />
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                        <div className="w-12 h-12 rounded-full bg-white/10" />
                        <div className="flex-1 space-y-1.5">
                            <div className="h-3 w-24 rounded bg-white/10" />
                            <div className="h-2 w-32 rounded bg-white/5" />
                        </div>
                    </div>
                ))}
            </div>
            {/* Chat area skeleton */}
            <div className="flex-1 flex items-center justify-center">
                <p className="text-white/20 text-sm">Select a conversation</p>
            </div>
        </div>
    );
}
