'use client';

import Link from 'next/link';

export default function SupportPage() {
    return (
        <div className="min-h-screen bg-[#030305] text-white">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-[#030305]" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#D4AF37]/[0.03] blur-[150px] rounded-full" />
            </div>

            {/* Nav */}
            <nav className="relative z-50 border-b border-white/5 bg-black/50 backdrop-blur-2xl">
                <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-white/90 to-white/70 flex items-center justify-center">
                            <span className="text-black font-bold text-sm">0G</span>
                        </div>
                        <span className="text-white/60 text-sm font-light tracking-widest uppercase">ZeroG</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link href="/about" className="text-white/40 hover:text-white text-sm transition-colors">About</Link>
                        <Link href="/signup" className="px-5 py-2 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-all">
                            Get Started Free
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Content */}
            <main className="relative z-10 max-w-3xl mx-auto px-6 py-20">
                <h1 className="text-4xl font-bold mb-4">Support</h1>
                <p className="text-white/60 text-lg mb-12">
                    We are a small, dedicated team that cares deeply about getting this right. Here is how to reach us.
                </p>

                {/* Contact Methods */}
                <div className="space-y-8">
                    <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.02]">
                        <h2 className="text-xl font-semibold mb-2">General Support</h2>
                        <p className="text-white/50 mb-4">
                            For account issues, feature requests, bug reports, or general questions.
                        </p>
                        <a
                            href="mailto:support@0gravity.ai"
                            className="inline-flex items-center gap-2 text-[#D4AF37] hover:text-[#E5C547] transition-colors"
                        >
                            support@0gravity.ai
                        </a>
                    </div>

                    <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.02]">
                        <h2 className="text-xl font-semibold mb-2">Privacy &amp; Data Requests</h2>
                        <p className="text-white/50 mb-4">
                            For data export requests, account deletion, or privacy-related inquiries.
                        </p>
                        <a
                            href="mailto:privacy@0gravity.ai"
                            className="inline-flex items-center gap-2 text-[#D4AF37] hover:text-[#E5C547] transition-colors"
                        >
                            privacy@0gravity.ai
                        </a>
                    </div>

                    <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.02]">
                        <h2 className="text-xl font-semibold mb-2">Report Abuse</h2>
                        <p className="text-white/50 mb-4">
                            To report harassment, abuse, or content that violates our Terms of Service.
                        </p>
                        <a
                            href="mailto:abuse@0gravity.ai"
                            className="inline-flex items-center gap-2 text-[#D4AF37] hover:text-[#E5C547] transition-colors"
                        >
                            abuse@0gravity.ai
                        </a>
                    </div>

                    <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.02]">
                        <h2 className="text-xl font-semibold mb-2">Business &amp; Partnerships</h2>
                        <p className="text-white/50 mb-4">
                            For partnership opportunities, investment inquiries, or press.
                        </p>
                        <a
                            href="mailto:hello@0gravity.ai"
                            className="inline-flex items-center gap-2 text-[#D4AF37] hover:text-[#E5C547] transition-colors"
                        >
                            hello@0gravity.ai
                        </a>
                    </div>
                </div>

                {/* FAQ */}
                <div className="mt-16">
                    <h2 className="text-2xl font-bold mb-8">Frequently Asked Questions</h2>
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-medium mb-2">How do I delete my account?</h3>
                            <p className="text-white/50">
                                Go to Settings &gt; Privacy &amp; Data &gt; Delete Account. Your data will be permanently removed within 30 days. You can also export all your data before deleting.
                            </p>
                        </div>
                        <div>
                            <h3 className="text-lg font-medium mb-2">How do I export my data?</h3>
                            <p className="text-white/50">
                                Go to Settings &gt; Privacy &amp; Data &gt; Export Data. You will receive a downloadable archive of all your content, messages, and connections.
                            </p>
                        </div>
                        <div>
                            <h3 className="text-lg font-medium mb-2">How do I report someone?</h3>
                            <p className="text-white/50">
                                Tap the three-dot menu on any post or profile and select &quot;Report.&quot; You can also email abuse@0gravity.ai directly.
                            </p>
                        </div>
                        <div>
                            <h3 className="text-lg font-medium mb-2">Is my data encrypted?</h3>
                            <p className="text-white/50">
                                Yes. All data in transit uses TLS encryption. Passwords are hashed with bcrypt. Travel Shield data is encrypted client-side with your personal passphrase and is never accessible to our servers.
                            </p>
                        </div>
                        <div>
                            <h3 className="text-lg font-medium mb-2">Do you sell my data?</h3>
                            <p className="text-white/50">
                                No. Never. We do not sell data, serve ads, or share your information with third parties. Read our full <Link href="/privacy" className="text-[#D4AF37] hover:underline">Privacy Policy</Link>.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer links */}
                <div className="mt-16 pt-8 border-t border-white/10 flex gap-6 text-sm text-white/40">
                    <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                    <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
                    <Link href="/about" className="hover:text-white transition-colors">About</Link>
                </div>
            </main>
        </div>
    );
}
