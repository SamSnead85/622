import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Terms of Service',
    description: 'ZeroG Terms of Service. Read our terms and conditions for using the ZeroG platform.',
};

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-black text-white">
            <nav className="fixed top-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-2xl border-b border-white/[0.04]">
                <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center border border-white/10">
                            <span className="font-bold text-sm text-white tracking-tight">0G</span>
                        </div>
                        <span className="font-semibold text-white/90 tracking-tight">ZeroG</span>
                    </Link>
                </div>
            </nav>

            <main className="pt-32 pb-24 px-6 max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
                <p className="text-white/40 mb-12">Last updated: February 2026</p>

                <div className="prose prose-invert prose-sm max-w-none space-y-8">
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
                        <p className="text-white/60 leading-relaxed">By accessing or using ZeroG (&quot;the Platform&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Platform. ZeroG reserves the right to modify these terms at any time, and your continued use of the Platform constitutes acceptance of any modifications.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">2. Eligibility</h2>
                        <p className="text-white/60 leading-relaxed">You must be at least 16 years of age to use the Platform. By using ZeroG, you represent that you meet this minimum age requirement. During the early access period, registration requires an access code provided by ZeroG.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">3. User Accounts</h2>
                        <p className="text-white/60 leading-relaxed">You are responsible for maintaining the confidentiality of your account credentials. You agree to notify ZeroG immediately of any unauthorized use of your account. You are responsible for all activities that occur under your account.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">4. User Content</h2>
                        <p className="text-white/60 leading-relaxed">You retain ownership of all content you create and share on ZeroG. By posting content, you grant ZeroG a limited, non-exclusive license to display and distribute your content within the Platform as necessary to provide the service. You are solely responsible for the content you share and must ensure it does not violate any laws or third-party rights.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">5. Prohibited Conduct</h2>
                        <p className="text-white/60 leading-relaxed">You agree not to: (a) harass, abuse, or harm others; (b) post illegal, defamatory, or harmful content; (c) impersonate others or misrepresent your identity; (d) attempt to gain unauthorized access to the Platform or other users&apos; accounts; (e) use the Platform for spam, phishing, or other malicious activities; (f) reverse-engineer or attempt to extract the source code of the Platform.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">6. Privacy</h2>
                        <p className="text-white/60 leading-relaxed">Your use of the Platform is also governed by our <Link href="/privacy" className="text-[#00D4FF]/70 hover:text-[#00D4FF] underline underline-offset-2">Privacy Policy</Link>. ZeroG is committed to protecting your personal information and will never sell your data to third parties.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">7. Community Guidelines</h2>
                        <p className="text-white/60 leading-relaxed">ZeroG is a platform built on respect and authentic human connection. Community administrators have sovereignty over their communities and may set their own rules within the bounds of these Terms. ZeroG reserves the right to remove content or suspend accounts that violate these Terms.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">8. Limitation of Liability</h2>
                        <p className="text-white/60 leading-relaxed">ZeroG is provided &quot;as is&quot; without warranties of any kind. ZeroG shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Platform. The Platform is in active development and features may change.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">9. Contact</h2>
                        <p className="text-white/60 leading-relaxed">For questions about these Terms, please contact us through the Platform or visit our <Link href="/about" className="text-[#00D4FF]/70 hover:text-[#00D4FF] underline underline-offset-2">About page</Link>.</p>
                    </section>
                </div>
            </main>
        </div>
    );
}
