'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useCommunities, type Community } from '@/hooks';
import { NavigationSidebar } from '@/components/dashboard/NavigationSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { API_URL } from '@/lib/api';

// ============================================
// ASSETS & ICONS
// ============================================
const Icons = {
    newspaper: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
        </svg>
    ),
    briefcase: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.67.38m-4.5-8.006c-2.115-.274-4.321-.294-6.423 0m0 0a48.11 48.11 0 00-3.417.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v2.818m0 0a48.1 48.1 0 00-3.417.387m4.5 8.006a2.18 2.18 0 01-.67.38m0 0c-.25.085-.526.13-.807.13m0 0H7.5" />
        </svg>
    ),
    megaphone: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.996.946 1.828 1.878 2.254a2.25 2.25 0 01-1.878-2.254zm0-9.18c.253-.996.946-1.828 1.878-2.255a2.25 2.25 0 00-1.878 2.255zm2.392 2.392c.67-.3 1.254-.78 1.706-1.373a9.492 9.492 0 010 6.51c-.452-.593-1.036-1.073-1.706-1.373a4.492 4.492 0 000-3.764z" />
        </svg>
    ),
    plus: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
    ),
    lock: (<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>),
    globe: (<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" /></svg>),
    cog: (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>),
    users: (<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>),
    home: (<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>),
    search: (<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>),
    user: (<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>),
    sliders: (<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" /></svg>),
};

const DEFAULT_COVERS = [
    'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=400&h=200&fit=crop',
    'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&h=200&fit=crop',
    'https://images.unsplash.com/photo-1536640712-4d4c36ff0e4e?w=400&h=200&fit=crop',
];

// ============================================
// TYPES
// ============================================
interface BulletinItem {
    id: number | string;
    type: string;
    title: string;
    desc: string;
    author: string;
    tags: string[];
    date: string;
}

interface NewsItem {
    id: number | string;
    title: string;
    source: string;
    time: string;
    isLive: boolean;
}

// ============================================
// COMPONENTS
// ============================================

// Navigation is now imported from '@/components/Navigation'

// 2. Pulse Ticker
function PulseTicker({ news }: { news: NewsItem[] }) {
    if (news.length === 0) return null;

    return (
        <div className="relative w-full overflow-hidden bg-gradient-to-r from-red-900/20 to-black border-y border-white/5 py-2">
            <div className="flex animate-marquee whitespace-nowrap gap-12 text-sm font-medium">
                {news.concat(news).map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                        {item.isLive && (
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgb(239,68,68)]" />
                        )}
                        <span className="text-red-400 uppercase tracking-widest text-xs font-bold">{item.source}</span>
                        <span className="text-white/90">{item.title}</span>
                        <span className="text-white/30 text-xs">{item.time}</span>
                    </div>
                ))}
            </div>
            {/* Fade Gradients */}
            <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[#050508] to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#050508] to-transparent z-10" />
        </div>
    );
}

// 3. Bulletin Item
function BulletinCard({ item }: { item: BulletinItem }) {
    const getTypeColor = (type: string) => {
        switch (type) {
            case 'JOB': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'EVENT': return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
            case 'ANNOUNCEMENT': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
            default: return 'bg-white/10 text-white';
        }
    };

    return (
        <motion.div
            className="bg-white/[0.03] rounded-xl border border-white/10 p-5 hover:bg-white/[0.05] hover:border-white/20 transition-all cursor-pointer group"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{ y: -2 }}
        >
            <div className={`inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border mb-3 ${getTypeColor(item.type)}`}>
                {item.type}
            </div>
            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#00D4FF] transition-colors">{item.title}</h3>
            <p className="text-sm text-white/60 mb-4 line-clamp-2">{item.desc}</p>

            <div className="flex items-center justify-between text-xs text-white/40">
                <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[8px] font-bold">
                        {item.author.slice(0, 1)}
                    </span>
                    <span>{item.author}</span>
                </div>
                <span>{item.date}</span>
            </div>
        </motion.div>
    );
}

// 4. Tribe Card (Existing, slightly refined)
function CommunityCard({ community, index }: { community: Community; index: number }) {
    const coverImage = community.coverUrl || DEFAULT_COVERS[index % DEFAULT_COVERS.length];
    return (
        <motion.div
            className="bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.06] rounded-2xl overflow-hidden hover:border-[#00D4FF]/20 hover:shadow-[0_8px_32px_rgba(0,212,255,0.06)] transition-all duration-300 group relative h-64 cursor-pointer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.05 }}
        >
            <Image
                src={coverImage}
                alt={community.name}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

            <div className="absolute bottom-0 left-0 right-0 p-5">
                <div className="flex items-center gap-2 mb-2">
                    {community.isPrivate ? (
                        <span className="p-1 rounded bg-black/60 backdrop-blur text-gray-300">{Icons.lock}</span>
                    ) : (
                        <span className="p-1 rounded bg-black/60 backdrop-blur text-[#00D4FF]">{Icons.globe}</span>
                    )}
                    <span className="text-xs font-bold uppercase tracking-wider text-white/70">{community.role}</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-1 group-hover:text-[#00D4FF] transition-colors">{community.name}</h3>
                <p className="text-sm text-white/50 line-clamp-1">{community.description}</p>
                <div className="flex items-center gap-1 mt-2">
                    {Icons.users}
                    <span className="text-white/40 text-xs">Members</span>
                </div>
            </div>

            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link href={`/communities/${community.slug || community.id}`}>
                    <button className="bg-[#00D4FF] text-black font-semibold text-sm px-5 py-2 rounded-xl hover:shadow-[0_0_16px_rgba(0,212,255,0.3)] transition-all duration-200">
                        Enter
                    </button>
                </Link>
            </div>
        </motion.div>
    );
}

// ============================================
// MAIN PAGE: THE AGORA
// ============================================
export default function CommunityHub() {
    const [mounted, setMounted] = useState(false);
    const { communities, isLoading } = useCommunities();
    const [bulletins, setBulletins] = useState<BulletinItem[]>([]);
    const [news, setNews] = useState<NewsItem[]>([]);

    useEffect(() => { setMounted(true); }, []);

    const { user } = useAuth();

    // Fetch bulletins from API
    useEffect(() => {
        const fetchBulletins = async () => {
            try {
                const token = typeof window !== 'undefined' ? localStorage.getItem('0g_token') : null;
                const res = await fetch(`${API_URL}/api/v1/community/bulletins`, {
                    headers: {
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                    },
                    credentials: 'include',
                });
                if (res.ok) {
                    const data = await res.json();
                    // Populate bulletins and news from API response
                    if (data.bulletins) setBulletins(data.bulletins);
                    if (data.news) setNews(data.news);
                }
            } catch (err) {
                console.error('Failed to fetch bulletins:', err);
            }
        };
        fetchBulletins();
    }, []);

    if (!mounted) return <div className="min-h-screen bg-[#050508]" />;

    return (
        <div className="min-h-screen bg-[#050508] text-white selection:bg-[#00D4FF]/30">
            <NavigationSidebar />

            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-blue-900/10 blur-[150px]" />
                <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-violet-900/10 blur-[150px]" />
            </div>

            <main className="relative z-10 lg:ml-20 xl:ml-64 pb-20 lg:pb-0">
                {/* 1. The Pulse (News Ticker) */}
                <PulseTicker news={news} />

                <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 lg:py-8 space-y-6 lg:space-y-12">

                    {/* 2. Hero Header — compact on mobile */}
                    <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4 lg:pb-8">
                        <div className="min-w-0">
                            <h1 className="text-2xl lg:text-5xl font-bold text-white tracking-tight">The Nexus</h1>
                            <p className="text-sm lg:text-lg text-white/50 max-w-xl hidden lg:block">
                                The central connection point. Discover tribes, find opportunities, and connect with the sovereign network.
                            </p>
                        </div>

                        <Link href="/communities/create" className="flex-shrink-0">
                            <button className="bg-[#00D4FF] text-black font-semibold text-xs lg:text-sm px-3 lg:px-5 py-2 rounded-xl hover:shadow-[0_0_16px_rgba(0,212,255,0.3)] transition-all duration-200 flex items-center gap-1.5 lg:gap-2">
                                {Icons.plus}
                                <span className="hidden sm:inline">Establish Tribe</span>
                                <span className="sm:hidden">New</span>
                            </button>
                        </Link>
                    </div>

                    {/* 3. The Exchange (Bulletin Board) */}
                    <section>
                        <div className="flex items-center gap-2 mb-3 lg:mb-6">
                            <span className="text-[#00D4FF]">{Icons.megaphone}</span>
                            <h2 className="text-base lg:text-xl font-bold uppercase tracking-widest text-white/80">Bulletin</h2>
                        </div>
                        {bulletins.length === 0 ? (
                            <div className="bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.06] rounded-2xl overflow-hidden p-6 lg:p-12 text-center">
                                <p className="text-white/50 text-sm lg:text-base">No bulletins yet. Check back soon.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {bulletins.map((item) => (
                                    <BulletinCard key={item.id} item={item} />
                                ))}
                            </div>
                        )}
                    </section>

                    {/* 4. My Sovereign Circles (User's Tribes) */}
                    <section>
                        <div className="flex items-center justify-between mb-3 lg:mb-6">
                            <div className="flex items-center gap-2">
                                <span className="text-[#8B5CF6]">{Icons.users}</span>
                                <h2 className="text-base lg:text-xl font-bold uppercase tracking-widest text-white/80">Your Circles</h2>
                            </div>
                            <span className="text-xs lg:text-sm text-white/40">{communities.length} Active</span>
                        </div>

                        {isLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <div key={i} className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="skeleton w-12 h-12 rounded-xl" />
                                            <div className="flex-1 space-y-1.5">
                                                <div className="skeleton skeleton-text w-32" />
                                                <div className="skeleton skeleton-text-sm w-20" />
                                            </div>
                                        </div>
                                        <div className="skeleton skeleton-text w-full" />
                                        <div className="skeleton skeleton-text w-2/3" />
                                        <div className="skeleton skeleton-button w-full" />
                                    </div>
                                ))}
                            </div>
                        ) : communities.length === 0 ? (
                            <div className="bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.06] rounded-2xl overflow-hidden p-12 text-center">
                                <p className="text-white/50 mb-4">You have not joined any tribes yet.</p>
                                <Link href="/communities/create">
                                    <button className="text-[#00D4FF] hover:underline font-medium">Create your first circle</button>
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {communities.map((community, i) => (
                                    <CommunityCard key={community.id} community={community} index={i} />
                                ))}
                            </div>
                        )}
                    </section>

                </div>
            </main>
        </div>
    );
}
