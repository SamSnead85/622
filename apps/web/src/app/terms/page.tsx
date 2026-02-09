import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Terms of Service',
    description: 'ZeroG Terms of Service. Simple, clear, and human-first. You own your data. You own your connections. Your privacy is our top priority.',
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
                    <div className="flex items-center gap-4">
                        <Link href="/privacy" className="text-sm text-white/40 hover:text-white/60 transition-colors">Privacy</Link>
                        <Link href="/about" className="text-sm text-white/40 hover:text-white/60 transition-colors">About</Link>
                    </div>
                </div>
            </nav>

            <main className="pt-32 pb-24 px-6 max-w-3xl mx-auto">
                {/* Hero */}
                <div className="mb-16">
                    <h1 className="text-4xl md:text-5xl font-bold mb-5 tracking-tight">Terms of Service</h1>
                    <p className="text-white/35 text-sm mb-8">Last updated: February 2026</p>

                    <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                        <h2 className="text-lg font-semibold text-white mb-3">The short version</h2>
                        <p className="text-white/60 leading-relaxed mb-4">
                            We built ZeroG to be the opposite of every social platform that came before. Here is what that means:
                        </p>
                        <div className="space-y-2.5">
                            {[
                                'You own your data. All of it. Always.',
                                'You own your contacts and connections.',
                                'Your privacy is the top priority of this platform.',
                                'We will never sell your data. We will never show you ads.',
                                'The only rules: Be a human. Be a good human.',
                            ].map((rule, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <div className="w-5 h-5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center shrink-0 mt-0.5">
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M20 6L9 17l-5-5" />
                                        </svg>
                                    </div>
                                    <p className="text-white/80 text-[15px] font-medium">{rule}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Full terms */}
                <div className="space-y-10">
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">1. Be a Human</h2>
                        <p className="text-white/55 leading-relaxed">
                            ZeroG is a platform for real people. No bots. No fake accounts. No automation that pretends to be a person. 
                            When you join, you are joining as yourself, under whatever name or identity you choose to share. 
                            You are free to be anonymous, but you must be a real human being behind the account.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">2. Be a Good Human</h2>
                        <p className="text-white/55 leading-relaxed mb-3">
                            No hate. No bullying. No harassment. This does not need an exhaustive legal definition. 
                            Any reasonable person can distinguish between disagreement and hate, between critique and cruelty. 
                            We trust our members to know the difference.
                        </p>
                        <p className="text-white/55 leading-relaxed">
                            If you would not say it to someone&apos;s face in a room full of people who care about them, 
                            do not say it here.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">3. Your Data, Your Property</h2>
                        <p className="text-white/55 leading-relaxed mb-3">
                            Everything you create on ZeroG belongs to you. Your photos, your posts, your messages, your connections. 
                            We do not claim ownership of any content you share. We store it only to provide you the service.
                        </p>
                        <p className="text-white/55 leading-relaxed">
                            You can export your data at any time. You can delete your account and all associated data at any time. 
                            When you say delete, we mean delete. Not &quot;hidden for 30 days&quot; or &quot;archived indefinitely.&quot; Gone.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">4. Your Connections are Yours</h2>
                        <p className="text-white/55 leading-relaxed">
                            Your follower list, your community memberships, your contacts, the people you have connected with — 
                            all of it belongs to you. We will never use your social graph to sell advertising, 
                            suggest products, or manipulate your behavior. Your relationships are not our business model.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">5. Privacy is Not a Feature, It is a Right</h2>
                        <p className="text-white/55 leading-relaxed mb-3">
                            We do not track you across the web. We do not build advertising profiles. 
                            We do not sell your data to anyone, ever. We do not read your encrypted messages. 
                            We do not analyze your private conversations.
                        </p>
                        <p className="text-white/55 leading-relaxed">
                            Read our full <Link href="/privacy" className="text-[#D4AF37]/70 hover:text-[#D4AF37] underline underline-offset-2 transition-colors">Privacy Policy</Link> for 
                            the complete details, but the summary is: your privacy comes first. Always.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">6. Communities Govern Themselves</h2>
                        <p className="text-white/55 leading-relaxed mb-3">
                            Each community on ZeroG is managed by its own admins, who set the rules, 
                            define the culture, and moderate content within their space. Community admins can:
                        </p>
                        <ul className="space-y-1.5 text-white/55 list-disc list-inside ml-2">
                            <li>Set and update their own terms of membership</li>
                            <li>Adjust their community&apos;s content moderation level</li>
                            <li>Customize their algorithm preferences</li>
                            <li>Remove members who violate community rules</li>
                        </ul>
                        <p className="text-white/55 leading-relaxed mt-3">
                            ZeroG provides the tools. Communities provide the governance. 
                            The only limits are the platform-wide rules above: be a human, be a good human.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">7. Strikes and Moderation</h2>
                        <p className="text-white/55 leading-relaxed">
                            If you violate these terms, you may receive a strike. Three strikes result in a temporary suspension. 
                            Severe violations (threats of violence, CSAM, doxxing) result in immediate permanent removal. 
                            All moderation actions are logged and can be appealed. We believe in due process, not arbitrary power.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">8. Eligibility</h2>
                        <p className="text-white/55 leading-relaxed">
                            You must be at least 16 years of age to use ZeroG. During the early access period, 
                            registration requires an access code. We keep the door thoughtfully open, not recklessly wide.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">9. The Platform</h2>
                        <p className="text-white/55 leading-relaxed">
                            ZeroG is provided as-is. We are actively building, improving, and evolving the platform. 
                            Features may change, but our commitment to privacy, data ownership, and community sovereignty will not. 
                            Those are not features. They are principles.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">10. Changes to These Terms</h2>
                        <p className="text-white/55 leading-relaxed">
                            If we update these terms, we will notify you directly within the platform. 
                            No buried emails, no silent policy changes. You will always have the opportunity to review 
                            and accept or reject any changes.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">11. Contact</h2>
                        <p className="text-white/55 leading-relaxed">
                            Questions? Concerns? Ideas? Reach us through the platform or visit our{' '}
                            <Link href="/about" className="text-[#D4AF37]/70 hover:text-[#D4AF37] underline underline-offset-2 transition-colors">About page</Link>.
                            We read everything. We are a small, dedicated team that cares deeply about getting this right.
                        </p>
                    </section>
                </div>

                {/* Footer note */}
                <div className="mt-16 pt-8 border-t border-white/[0.06]">
                    <p className="text-white/25 text-sm leading-relaxed text-center">
                        ZeroG is 100% Palestinian-built. This platform exists because we believe social media 
                        should serve people, not exploit them. These terms reflect that belief.
                    </p>
                </div>
            </main>
        </div>
    );
}
