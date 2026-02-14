import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Download 0G — Privacy-First Social Platform',
    description: 'Download the 0G app for iOS and Android. Encrypted messaging, private communities, live streaming, and games — all without ads or surveillance.',
    openGraph: {
        title: 'Download 0G',
        description: 'Privacy-first social platform. No ads. No tracking. Your community.',
    },
};

const FEATURES = [
    {
        icon: '🔒',
        title: 'End-to-End Encrypted',
        description: 'Your messages and data stay private. Always.',
    },
    {
        icon: '👥',
        title: 'Private Communities',
        description: 'Create invite-only groups with governance tools.',
    },
    {
        icon: '🎮',
        title: 'Multiplayer Games',
        description: 'Play with friends — trivia, drawing, word games, and more.',
    },
    {
        icon: '📡',
        title: 'Live Streaming',
        description: 'Go live with your community in real time.',
    },
    {
        icon: '🕌',
        title: 'Cultural Tools',
        description: 'Prayer times, Qibla compass, Quran reader, and more.',
    },
    {
        icon: '🚫',
        title: 'No Ads. No Tracking.',
        description: 'We never sell your data or show you ads.',
    },
];

export default function DownloadPage() {
    return (
        <main className="min-h-screen bg-void text-gray-50">
            {/* Hero Section */}
            <section className="relative overflow-hidden">
                {/* Background glow */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-aurora-blue/10 blur-[120px]" />
                    <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full bg-aurora-cyan/5 blur-[100px]" />
                </div>

                <div className="relative max-w-4xl mx-auto px-6 pt-32 pb-20 text-center">
                    {/* Brand mark */}
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-ember/10 border border-ember/20 mb-8">
                        <span className="text-3xl font-bold font-display text-ember">0G</span>
                    </div>

                    <h1 className="text-display-xl font-display font-bold tracking-tight mb-6">
                        Social without<br />the surveillance.
                    </h1>

                    <p className="text-body-lg text-gray-400 max-w-xl mx-auto mb-12">
                        A private, invite-only social platform built for communities that value
                        privacy, authentic connection, and zero exploitation.
                    </p>

                    {/* Download buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                        <a
                            href="#"
                            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-ember text-void font-semibold text-lg transition-all hover:bg-ember-bright hover:scale-[1.02] active:scale-[0.98]"
                            aria-label="Download on the App Store"
                        >
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                            </svg>
                            App Store
                        </a>
                        <a
                            href="#"
                            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl border border-glass-border-bright text-gray-50 font-semibold text-lg transition-all hover:bg-glass-heavy hover:scale-[1.02] active:scale-[0.98]"
                            aria-label="Get it on Google Play"
                        >
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.302 2.302a1 1 0 010 1.38l-2.302 2.302L15.396 13l2.302-2.492zM5.864 2.658L16.8 8.99l-2.302 2.302L5.864 2.658z" />
                            </svg>
                            Google Play
                        </a>
                    </div>

                    <p className="text-sm text-gray-500">
                        Available on iOS and Android. Invite required.
                    </p>
                </div>
            </section>

            {/* Features Grid */}
            <section className="max-w-5xl mx-auto px-6 py-20">
                <h2 className="text-title-xl font-display font-semibold text-center mb-12">
                    Everything you need. Nothing you don&apos;t.
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {FEATURES.map((feature) => (
                        <div
                            key={feature.title}
                            className="p-6 rounded-2xl border border-glass-border bg-glass-ultra hover:bg-glass-light transition-colors"
                        >
                            <div className="text-3xl mb-4">{feature.icon}</div>
                            <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                            <p className="text-sm text-gray-400">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA Section */}
            <section className="max-w-3xl mx-auto px-6 py-20 text-center">
                <h2 className="text-title-xl font-display font-semibold mb-4">
                    Ready to join?
                </h2>
                <p className="text-gray-400 mb-8">
                    0G is invite-only. Ask a member for an invite code, or request early access.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <a
                        href="/early-access"
                        className="px-8 py-3 rounded-xl bg-ember text-void font-semibold transition-all hover:bg-ember-bright"
                    >
                        Request Early Access
                    </a>
                    <a
                        href="/about"
                        className="px-8 py-3 rounded-xl border border-glass-border-bright text-gray-300 font-semibold transition-all hover:bg-glass-heavy"
                    >
                        Learn More
                    </a>
                </div>
            </section>
        </main>
    );
}
