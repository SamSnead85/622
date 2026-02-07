import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Privacy Policy',
    description: 'ZeroG Privacy Policy. Learn how we protect your data, what we collect, and our commitment to never selling your information.',
};

export default function PrivacyPage() {
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
                <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
                <p className="text-white/40 mb-12">Last updated: February 2026</p>

                <div className="prose prose-invert prose-sm max-w-none space-y-8">
                    <section className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 mb-8">
                        <h2 className="text-lg font-semibold text-white mb-2">Our Core Privacy Promise</h2>
                        <p className="text-white/60 leading-relaxed">ZeroG will <strong className="text-white">never</strong> sell your data. We will <strong className="text-white">never</strong> serve you targeted advertising. We will <strong className="text-white">never</strong> share your personal information with third parties without your explicit consent. Your data belongs to you.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">1. Information We Collect</h2>
                        <p className="text-white/60 leading-relaxed mb-3">We collect information you provide directly:</p>
                        <ul className="space-y-2 text-white/60">
                            <li className="flex gap-2"><span className="text-white/30">--</span> Account information (email, username, display name)</li>
                            <li className="flex gap-2"><span className="text-white/30">--</span> Profile information (bio, avatar, cover image)</li>
                            <li className="flex gap-2"><span className="text-white/30">--</span> Content you create (posts, messages, photos, polls)</li>
                            <li className="flex gap-2"><span className="text-white/30">--</span> Community membership and interactions</li>
                        </ul>
                        <p className="text-white/60 leading-relaxed mt-3">We automatically collect minimal technical data necessary to operate the service (session tokens, basic device info for security).</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">2. How We Use Your Information</h2>
                        <ul className="space-y-2 text-white/60">
                            <li className="flex gap-2"><span className="text-white/30">--</span> To provide and maintain the Platform</li>
                            <li className="flex gap-2"><span className="text-white/30">--</span> To authenticate your identity and secure your account</li>
                            <li className="flex gap-2"><span className="text-white/30">--</span> To deliver your content to the people you choose to share it with</li>
                            <li className="flex gap-2"><span className="text-white/30">--</span> To enable real-time communication features (messaging, calling)</li>
                            <li className="flex gap-2"><span className="text-white/30">--</span> To prevent abuse and enforce our Terms of Service</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">3. Travel Shield & Identity Protection</h2>
                        <p className="text-white/60 leading-relaxed">ZeroG includes a Travel Shield feature that allows users to activate a decoy profile for identity protection. Travel Shield data is encrypted client-side using cryptographic passphrases and is never accessible to ZeroG servers in its decrypted form. We cannot access, read, or share your Travel Shield configurations.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">4. Data Encryption & Security</h2>
                        <p className="text-white/60 leading-relaxed">All data in transit is encrypted via TLS. Passwords are hashed using bcrypt with a cost factor of 12. Session tokens are cryptographically generated. We implement rate limiting, CSRF protection, and regular security reviews. WebRTC calls are peer-to-peer and do not pass through our servers.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">5. Data Sharing</h2>
                        <p className="text-white/60 leading-relaxed">We do not share your personal data with third parties except: (a) when you explicitly authorize it through our Developer API with OAuth consent; (b) if required by law with valid legal process; (c) to protect the safety of our users in emergency situations.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">6. Data Portability & Deletion</h2>
                        <p className="text-white/60 leading-relaxed">You have the right to export all your data at any time. You may also request complete deletion of your account and associated data. Deletion requests are processed within 30 days. We provide data import tools to bring your content from other platforms.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">7. Cookies & Tracking</h2>
                        <p className="text-white/60 leading-relaxed">ZeroG does not use third-party tracking cookies or analytics. We use minimal, essential cookies for session management and authentication only. We do not track your behavior for advertising purposes.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">8. Your Rights</h2>
                        <p className="text-white/60 leading-relaxed">Under GDPR, CCPA, and similar regulations, you have the right to: access your data, correct inaccurate data, delete your data, restrict processing, data portability, and withdraw consent. To exercise any of these rights, contact us through the Platform.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">9. Changes to This Policy</h2>
                        <p className="text-white/60 leading-relaxed">We will notify you of any material changes to this Privacy Policy through the Platform. Continued use of ZeroG after changes constitutes acceptance of the updated policy.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">10. Contact</h2>
                        <p className="text-white/60 leading-relaxed">For privacy inquiries, please contact us through the Platform or visit our <Link href="/about" className="text-[#00D4FF]/70 hover:text-[#00D4FF] underline underline-offset-2">About page</Link>.</p>
                    </section>
                </div>
            </main>
        </div>
    );
}
