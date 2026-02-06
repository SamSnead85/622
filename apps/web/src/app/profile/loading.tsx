export default function ProfileLoading() {
    return (
        <div className="min-h-screen bg-black">
            <div className="h-48 bg-white/5 animate-pulse" />
            <div className="max-w-4xl mx-auto px-4 -mt-12">
                <div className="flex items-end gap-4 mb-6">
                    <div className="w-24 h-24 rounded-full bg-white/10 border-4 border-black animate-pulse" />
                    <div className="space-y-2 pb-2">
                        <div className="h-5 w-32 rounded bg-white/10 animate-pulse" />
                        <div className="h-3 w-20 rounded bg-white/5 animate-pulse" />
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-8">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="aspect-square rounded-xl bg-white/5 animate-pulse" />
                    ))}
                </div>
            </div>
        </div>
    );
}
