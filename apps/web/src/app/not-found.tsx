import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="text-center max-w-md">
                <div className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-8">
                    <span className="text-5xl">🌌</span>
                </div>
                <h1 className="text-6xl font-bold text-white mb-4">404</h1>
                <h2 className="text-xl font-semibold text-white/80 mb-2">Lost in the void</h2>
                <p className="text-white/40 text-sm mb-8">
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                    Don&apos;t worry — your data is still safe with us.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        href="/dashboard"
                        className="px-6 py-3 rounded-xl bg-[#D4AF37] text-black font-semibold text-sm hover:opacity-90 transition-opacity"
                    >
                        Go to Feed
                    </Link>
                    <Link
                        href="/"
                        className="px-6 py-3 rounded-xl bg-white/10 text-white font-medium text-sm hover:bg-white/15 transition-colors"
                    >
                        Home Page
                    </Link>
                </div>
                <p className="mt-12 text-white/20 text-xs">
                    ZeroG — Social Media Without the Weight
                </p>
            </div>
        </div>
    );
}
