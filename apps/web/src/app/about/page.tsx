'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-[#030305] text-white">
            {/* Navigation */}
            <nav className="sticky top-0 z-50 bg-black/70 backdrop-blur-2xl border-b border-white/5 py-4">
                <div className="max-w-4xl mx-auto px-6 flex items-center gap-4">
                    <Link href="/" className="text-white/60 hover:text-white transition-colors">
                        ← Back
                    </Link>
                    <h1 className="text-lg font-semibold text-white">About ZeroG</h1>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto px-6 py-16">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <h1 className="text-4xl md:text-5xl font-light text-white mb-8">
                        Social media
                        <br />
                        <span className="text-white/50">without the weight.</span>
                    </h1>

                    <div className="prose prose-invert prose-sm max-w-none space-y-8 text-white/60 font-light leading-relaxed">
                        <section>
                            <h2 className="text-xl font-medium text-white mb-4">Our Mission</h2>
                            <p>
                                ZeroG (0G) is building a social platform where truth-tellers share their stories,
                                communities decide what matters, and you own everything you create. No ads. No
                                algorithmic manipulation. No data exploitation.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-medium text-white mb-4">What Makes Us Different</h2>
                            <ul className="space-y-3 list-none pl-0">
                                <li className="flex items-start gap-3">
                                    <span className="text-emerald-400 mt-0.5">✓</span>
                                    <span><strong className="text-white">Zero ads, forever.</strong> We will never run advertisements or sell your attention.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="text-emerald-400 mt-0.5">✓</span>
                                    <span><strong className="text-white">Community-driven feed.</strong> You vote on what you want to see. The algorithm serves you, not advertisers.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="text-emerald-400 mt-0.5">✓</span>
                                    <span><strong className="text-white">No lock-in.</strong> Export all your data anytime. Your content belongs to you.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="text-emerald-400 mt-0.5">✓</span>
                                    <span><strong className="text-white">Privacy first.</strong> We don&apos;t track you. We don&apos;t sell your data. Period.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="text-emerald-400 mt-0.5">✓</span>
                                    <span><strong className="text-white">&lt;1s live latency.</strong> Real-time connection when it matters most.</span>
                                </li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-medium text-white mb-4">Our Values</h2>
                            <p>
                                We believe social media should be a force for genuine human connection, not a machine
                                for harvesting attention. Every decision we make is guided by transparency, privacy,
                                and respect for the communities we serve.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-medium text-white mb-4">Contact</h2>
                            <p>
                                Have questions or feedback? We&apos;d love to hear from you.
                            </p>
                            <p>
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
