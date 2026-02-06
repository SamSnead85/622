'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-[#030305] text-white">
            {/* Navigation */}
            <nav className="sticky top-0 z-50 bg-black/70 backdrop-blur-2xl border-b border-white/5 py-4">
                <div className="max-w-4xl mx-auto px-6 flex items-center gap-4">
                    <Link href="/" className="text-white/60 hover:text-white transition-colors">
                        ← Back
                    </Link>
                    <h1 className="text-lg font-semibold text-white">Terms of Service</h1>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto px-6 py-16">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <h1 className="text-4xl font-light text-white mb-2">Terms of Service</h1>
                    <p className="text-white/40 mb-12">Last updated: February 2026</p>

                    <div className="space-y-10 text-white/60 font-light leading-relaxed">
                        <section>
                            <h2 className="text-xl font-medium text-white mb-4">1. Acceptance of Terms</h2>
                            <p>
                                By accessing or using ZeroG (&quot;0G&quot;, &quot;the Platform&quot;), you agree to be bound by these Terms
                                of Service. If you do not agree, please do not use the Platform.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-medium text-white mb-4">2. Your Account</h2>
                            <p>
                                You are responsible for maintaining the security of your account and password.
                                You must be at least 13 years old to use ZeroG. You are responsible for all
                                activity that occurs under your account.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-medium text-white mb-4">3. Your Content</h2>
                            <p>
                                You retain full ownership of all content you post on ZeroG. By posting content,
                                you grant us a limited license to display and distribute your content on the
                                Platform. You can export or delete your content at any time.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-medium text-white mb-4">4. Privacy</h2>
                            <p>
                                We do not sell your data. We do not run ads. We do not track you across the web.
                                For full details on what we do and don&apos;t collect, see our{' '}
                                <Link href="/transparency" className="text-[#00D4FF] hover:underline">
                                    Privacy &amp; Transparency
                                </Link>{' '}
                                page.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-medium text-white mb-4">5. Acceptable Use</h2>
                            <p>You agree not to:</p>
                            <ul className="list-disc pl-6 mt-3 space-y-2">
                                <li>Post content that is illegal, harmful, threatening, abusive, or hateful</li>
                                <li>Impersonate others or misrepresent your identity</li>
                                <li>Spam, harass, or bully other users</li>
                                <li>Attempt to gain unauthorized access to other accounts or systems</li>
                                <li>Use the Platform for any unlawful purpose</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-medium text-white mb-4">6. Community Governance</h2>
                            <p>
                                Communities (Tribes) on ZeroG are self-governed. Community leaders set their own
                                rules and moderation policies. ZeroG provides tools for governance but does not
                                intervene in community decisions except when content violates these Terms.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-medium text-white mb-4">7. Termination</h2>
                            <p>
                                We reserve the right to suspend or terminate accounts that violate these Terms.
                                You may delete your account at any time. Upon deletion, we will remove your
                                data from our systems within 30 days.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-medium text-white mb-4">8. Changes to Terms</h2>
                            <p>
                                We may update these Terms from time to time. We will notify users of significant
                                changes. Continued use of the Platform after changes constitutes acceptance.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-medium text-white mb-4">9. Contact</h2>
                            <p>
                                Questions about these Terms? Contact us at{' '}
                                <a href="mailto:support@0g.social" className="text-[#00D4FF] hover:underline">
                                    support@0g.social
                                </a>
                            </p>
                        </section>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
