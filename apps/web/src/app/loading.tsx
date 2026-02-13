export default function Loading() {
    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 rounded-full border-2 border-[#7C8FFF]/30 border-t-[#7C8FFF] animate-spin" />
                <p className="text-white/30 text-sm">Loading...</p>
            </div>
        </div>
    );
}
