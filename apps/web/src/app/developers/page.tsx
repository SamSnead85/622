'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { NavigationSidebar } from '@/components/dashboard/NavigationSidebar';
import { apiFetch, API_URL } from '@/lib/api';

// ============================================
// TYPES
// ============================================
interface DeveloperApp {
    id: string;
    name: string;
    slug: string;
    description?: string;
    clientId: string;
    scopes: string;
    isActive: boolean;
    rateLimitTier: string;
    requestCount: number;
    lastUsedAt?: string;
    createdAt: string;
    apiKeys: ApiKey[];
    webhooks: WebhookEntry[];
    _count: { oauthTokens: number };
}

interface ApiKey {
    id: string;
    name: string;
    keyPrefix: string;
    isActive: boolean;
    lastUsedAt?: string;
    requestCount: number;
    createdAt: string;
}

interface WebhookEntry {
    id: string;
    url: string;
    events: string;
    isActive: boolean;
    failCount: number;
    lastFiredAt?: string;
}

type PortalTab = 'overview' | 'apps' | 'docs' | 'console';

// ============================================
// API ENDPOINT DATA
// ============================================
const API_SECTIONS = [
    {
        title: 'Communities',
        endpoints: [
            { method: 'GET', path: '/api/v1/developer/public/communities', desc: 'List public communities', scope: 'read' },
            { method: 'GET', path: '/api/v1/developer/public/communities/:id', desc: 'Get community details', scope: 'read' },
            { method: 'POST', path: '/api/v1/developer/public/communities', desc: 'Create a community', scope: 'write' },
        ],
    },
    {
        title: 'Posts',
        endpoints: [
            { method: 'GET', path: '/api/v1/developer/public/posts', desc: 'List posts (filter by communityId)', scope: 'read' },
            { method: 'POST', path: '/api/v1/developer/public/posts', desc: 'Create a post', scope: 'write' },
        ],
    },
    {
        title: 'Users',
        endpoints: [
            { method: 'GET', path: '/api/v1/developer/public/users/:username', desc: 'Get user profile', scope: 'read' },
        ],
    },
    {
        title: 'Platform',
        endpoints: [
            { method: 'GET', path: '/api/v1/developer/public/stats', desc: 'Platform statistics', scope: 'read' },
        ],
    },
    {
        title: 'OAuth 2.0',
        endpoints: [
            { method: 'GET', path: '/api/v1/developer/oauth/authorize', desc: 'Authorization endpoint', scope: '-' },
            { method: 'POST', path: '/api/v1/developer/oauth/token', desc: 'Token exchange', scope: '-' },
        ],
    },
];

const WEBHOOK_EVENTS = [
    { event: 'post.created', desc: 'A new post is published' },
    { event: 'post.liked', desc: 'A post receives a like' },
    { event: 'member.joined', desc: 'A user joins a community' },
    { event: 'member.left', desc: 'A user leaves a community' },
    { event: 'poll.created', desc: 'A new poll is created' },
    { event: 'poll.voted', desc: 'A vote is cast on a poll' },
    { event: 'message.sent', desc: 'A message is sent in group chat' },
    { event: 'call.started', desc: 'A call is initiated' },
    { event: 'album.created', desc: 'A photo album is created' },
];

const SCOPES = [
    { scope: 'read', desc: 'Read public data (communities, posts, users)', icon: 'R' },
    { scope: 'write', desc: 'Create posts, communities, and content', icon: 'W' },
    { scope: 'communities', desc: 'Manage community settings and members', icon: 'C' },
    { scope: 'messages', desc: 'Read and send messages in groups', icon: 'M' },
    { scope: 'calls', desc: 'Initiate and manage calls', icon: 'P' },
    { scope: 'all', desc: 'Full access to all API endpoints', icon: 'A' },
];

// ============================================
// MAIN COMPONENT
// ============================================
export default function DeveloperPortal() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<PortalTab>('overview');
    const [apps, setApps] = useState<DeveloperApp[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showCreateApp, setShowCreateApp] = useState(false);
    const [newApp, setNewApp] = useState({ name: '', description: '', websiteUrl: '', callbackUrl: '', scopes: 'read' });
    const [createdCreds, setCreatedCreds] = useState<{ apiKey: string; clientSecret: string; clientId: string } | null>(null);

    // Console state
    const [consoleEndpoint, setConsoleEndpoint] = useState('/api/v1/developer/public/stats');
    const [consoleMethod, setConsoleMethod] = useState('GET');
    const [consoleApiKey, setConsoleApiKey] = useState('');
    const [consoleBody, setConsoleBody] = useState('');
    const [consoleResponse, setConsoleResponse] = useState<string | null>(null);
    const [consoleLoading, setConsoleLoading] = useState(false);

    const fetchApps = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const data = await apiFetch(`${API_URL}/api/v1/developer/apps`);
            setApps(data.apps || []);
        } catch (err) {
            console.error('Failed to fetch apps:', err);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (activeTab === 'apps') fetchApps();
    }, [activeTab, fetchApps]);

    const createApp = async () => {
        if (!newApp.name.trim()) return;
        try {
            const data = await apiFetch(`${API_URL}/api/v1/developer/apps`, {
                method: 'POST',
                body: JSON.stringify(newApp),
            });
            setCreatedCreds({
                apiKey: data.apiKey,
                clientSecret: data.clientSecret,
                clientId: data.app.clientId,
            });
            setShowCreateApp(false);
            setNewApp({ name: '', description: '', websiteUrl: '', callbackUrl: '', scopes: 'read' });
            fetchApps();
        } catch (err) {
            console.error('Failed to create app:', err);
        }
    };

    const deleteApp = async (appId: string) => {
        if (!confirm('Are you sure? This will revoke all API keys and webhooks.')) return;
        try {
            await apiFetch(`${API_URL}/api/v1/developer/apps/${appId}`, { method: 'DELETE' });
            fetchApps();
        } catch (err) {
            console.error('Failed to delete app:', err);
        }
    };

    const runConsole = async () => {
        setConsoleLoading(true);
        setConsoleResponse(null);
        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (consoleApiKey) headers['X-Api-Key'] = consoleApiKey;

            const opts: RequestInit = { method: consoleMethod, headers };
            if (consoleMethod !== 'GET' && consoleBody) opts.body = consoleBody;

            const res = await fetch(`${API_URL}${consoleEndpoint}`, opts);
            const data = await res.json();
            setConsoleResponse(JSON.stringify(data, null, 2));
        } catch (err: any) {
            setConsoleResponse(JSON.stringify({ error: err.message }, null, 2));
        } finally {
            setConsoleLoading(false);
        }
    };

    const METHOD_COLORS: Record<string, string> = {
        GET: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        POST: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        PUT: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        DELETE: 'bg-red-500/20 text-red-400 border-red-500/30',
    };

    return (
        <div className="min-h-screen bg-black text-white">
            <NavigationSidebar />
            <div className="lg:ml-20 xl:ml-64 pb-24 lg:pb-8">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-b from-[#020818] via-black to-black" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#7C8FFF]/[0.03] blur-[120px] rounded-full" />
            </div>

            {/* Header */}
            <header className="relative z-10 border-b border-white/5">
                <div className="max-w-6xl mx-auto px-6 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/dashboard" className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </Link>
                            <div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7C8FFF] to-[#6070EE] flex items-center justify-center">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="16,18 22,12 16,6"/><polyline points="8,6 2,12 8,18"/></svg>
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-bold tracking-tight">Developer Platform</h1>
                                        <p className="text-sm text-white/40">Build on 0G &middot; API v1</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">API Status: Operational</span>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 mt-6 -mb-[1px]">
                        {[
                            { id: 'overview' as const, label: 'Overview', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg> },
                            { id: 'apps' as const, label: 'My Apps', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> },
                            { id: 'docs' as const, label: 'API Reference', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg> },
                            { id: 'console' as const, label: 'API Console', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4,17 10,11 4,5"/><line x1="12" y1="19" x2="20" y2="19"/></svg> },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-sm font-medium transition-all border-b-2 ${
                                    activeTab === tab.id
                                        ? 'bg-white/[0.05] text-white border-[#7C8FFF]'
                                        : 'text-white/40 border-transparent hover:text-white/60 hover:bg-white/[0.02]'
                                }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="relative z-10 max-w-6xl mx-auto px-6 py-8">
                <AnimatePresence mode="wait">
                    {/* ==================== OVERVIEW ==================== */}
                    {activeTab === 'overview' && (
                        <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
                            {/* Hero */}
                            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#7C8FFF]/10 via-[#6070EE]/5 to-transparent p-8 md:p-12">
                                <div className="max-w-xl">
                                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Build the future of social</h2>
                                    <p className="text-white/60 text-lg mb-6 leading-relaxed">
                                        The 0G Developer Platform gives you programmatic access to communities, posts, messaging, and more.
                                        Build integrations, automate workflows, or create entirely new experiences on top of 0G.
                                    </p>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => { setActiveTab('apps'); setShowCreateApp(true); }}
                                            className="px-6 py-3 bg-[#7C8FFF] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity text-sm"
                                        >
                                            Create Your First App
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('docs')}
                                            className="px-6 py-3 bg-white/10 border border-white/10 text-white font-medium rounded-xl hover:bg-white/15 transition-colors text-sm"
                                        >
                                            Read the Docs
                                        </button>
                                    </div>
                                </div>
                                <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-[#7C8FFF]/10 rounded-full blur-3xl" />
                            </div>

                            {/* Features Grid */}
                            <div className="grid md:grid-cols-3 gap-4">
                                {[
                                    {
                                        icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7C8FFF" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
                                        title: 'OAuth 2.0',
                                        desc: 'Secure authentication with granular permission scopes. Users authorize exactly what your app can access.',
                                    },
                                    {
                                        icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6070EE" strokeWidth="2"><polyline points="16,18 22,12 16,6"/><polyline points="8,6 2,12 8,18"/></svg>,
                                        title: 'RESTful API',
                                        desc: 'Clean, consistent API endpoints for communities, posts, users, polls, albums, and real-time events.',
                                    },
                                    {
                                        icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
                                        title: 'Webhooks',
                                        desc: 'Real-time event notifications delivered to your server. Subscribe to posts, members, polls, calls, and more.',
                                    },
                                    {
                                        icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>,
                                        title: 'Agentic & AI Ready',
                                        desc: 'Designed for AI agents and no-code builders. Create communities, manage members, and post content programmatically.',
                                    },
                                    {
                                        icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EC4899" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
                                        title: 'Community Management',
                                        desc: 'Programmatically create groups, invite members, configure permissions, and manage content at scale.',
                                    },
                                    {
                                        icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7C8FFF" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
                                        title: 'Cross-Platform',
                                        desc: 'Connect 0G to Zapier, Make, IFTTT, or your own tools. Automate posting, notifications, and member management.',
                                    },
                                ].map((feat, i) => (
                                    <div key={i} className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-colors">
                                        <div className="mb-4">{feat.icon}</div>
                                        <h3 className="font-semibold mb-2">{feat.title}</h3>
                                        <p className="text-sm text-white/40 leading-relaxed">{feat.desc}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Available Scopes */}
                            <div>
                                <h3 className="text-xl font-semibold mb-4">Permission Scopes</h3>
                                <div className="grid md:grid-cols-2 gap-3">
                                    {SCOPES.map(s => (
                                        <div key={s.scope} className="flex items-center gap-4 bg-white/[0.02] border border-white/5 rounded-xl p-4">
                                            <div className="w-9 h-9 rounded-lg bg-[#7C8FFF]/10 border border-[#7C8FFF]/20 flex items-center justify-center shrink-0">
                                                <span className="text-xs font-bold text-[#7C8FFF] font-mono">{s.icon}</span>
                                            </div>
                                            <div>
                                                <code className="text-sm font-mono text-[#7C8FFF]">{s.scope}</code>
                                                <p className="text-xs text-white/40 mt-0.5">{s.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Quick Start Code */}
                            <div>
                                <h3 className="text-xl font-semibold mb-4">Quick Start</h3>
                                <div className="bg-[#0A0A0F] border border-white/10 rounded-2xl overflow-hidden">
                                    <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
                                        <div className="w-3 h-3 rounded-full bg-red-500/60" />
                                        <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                                        <div className="w-3 h-3 rounded-full bg-green-500/60" />
                                        <span className="text-xs text-white/30 ml-2 font-mono">curl</span>
                                    </div>
                                    <pre className="p-5 text-sm text-white/80 font-mono overflow-x-auto leading-relaxed">
{`# List public communities
curl -H "X-Api-Key: 0g_your_api_key_here" \\
  ${API_URL}/api/v1/developer/public/communities

# Create a post (requires OAuth + write scope)
curl -X POST \\
  -H "Authorization: Bearer 0gat_your_token" \\
  -H "Content-Type: application/json" \\
  -d '{"content": "Hello from the API!", "communityId": "..."}' \\
  ${API_URL}/api/v1/developer/public/posts

# Platform stats
curl -H "X-Api-Key: 0g_your_api_key_here" \\
  ${API_URL}/api/v1/developer/public/stats`}
                                    </pre>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ==================== MY APPS ==================== */}
                    {activeTab === 'apps' && (
                        <motion.div key="apps" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-semibold">My Applications</h2>
                                    <p className="text-sm text-white/40">Manage your registered applications and API keys</p>
                                </div>
                                <button
                                    onClick={() => setShowCreateApp(true)}
                                    className="px-5 py-2.5 bg-[#7C8FFF] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity text-sm flex items-center gap-2"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                                    New App
                                </button>
                            </div>

                            {/* Credentials Reveal Modal */}
                            <AnimatePresence>
                                {createdCreds && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6"
                                    >
                                        <h3 className="font-semibold text-emerald-400 mb-1 flex items-center gap-2">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>
                                            App Created Successfully
                                        </h3>
                                        <p className="text-xs text-white/40 mb-4">Save these credentials now. They will not be shown again.</p>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-xs text-white/40 uppercase tracking-wider">Client ID</label>
                                                <div className="bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 font-mono text-sm mt-1 break-all">{createdCreds.clientId}</div>
                                            </div>
                                            <div>
                                                <label className="text-xs text-white/40 uppercase tracking-wider">Client Secret</label>
                                                <div className="bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 font-mono text-sm mt-1 break-all text-amber-400">{createdCreds.clientSecret}</div>
                                            </div>
                                            <div>
                                                <label className="text-xs text-white/40 uppercase tracking-wider">API Key</label>
                                                <div className="bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 font-mono text-sm mt-1 break-all text-[#7C8FFF]">{createdCreds.apiKey}</div>
                                            </div>
                                        </div>
                                        <button onClick={() => setCreatedCreds(null)} className="mt-4 px-4 py-2 bg-white/10 rounded-lg text-sm hover:bg-white/15 transition-colors">
                                            I&apos;ve saved these credentials
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Create App Form */}
                            <AnimatePresence>
                                {showCreateApp && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-4 overflow-hidden"
                                    >
                                        <h3 className="font-semibold">Register New Application</h3>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs text-white/40 mb-1.5">App Name *</label>
                                                <input type="text" value={newApp.name} onChange={(e) => setNewApp({ ...newApp, name: e.target.value })} placeholder="My Integration" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#7C8FFF]/50" />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-white/40 mb-1.5">Website URL</label>
                                                <input type="url" value={newApp.websiteUrl} onChange={(e) => setNewApp({ ...newApp, websiteUrl: e.target.value })} placeholder="https://yourapp.com" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#7C8FFF]/50" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-white/40 mb-1.5">Description</label>
                                            <textarea value={newApp.description} onChange={(e) => setNewApp({ ...newApp, description: e.target.value })} placeholder="What does your app do?" rows={2} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#7C8FFF]/50 resize-none" />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-white/40 mb-1.5">OAuth Callback URL</label>
                                            <input type="url" value={newApp.callbackUrl} onChange={(e) => setNewApp({ ...newApp, callbackUrl: e.target.value })} placeholder="https://yourapp.com/callback" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#7C8FFF]/50" />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-white/40 mb-2">Scopes</label>
                                            <div className="flex flex-wrap gap-2">
                                                {['read', 'write', 'communities', 'messages', 'calls'].map(scope => {
                                                    const selected = newApp.scopes.split(',').includes(scope);
                                                    return (
                                                        <button
                                                            key={scope}
                                                            onClick={() => {
                                                                const current = newApp.scopes.split(',').filter(Boolean);
                                                                const updated = selected ? current.filter(s => s !== scope) : [...current, scope];
                                                                setNewApp({ ...newApp, scopes: updated.join(',') || 'read' });
                                                            }}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                                                                selected ? 'bg-[#7C8FFF]/20 text-[#7C8FFF] border border-[#7C8FFF]/30' : 'bg-white/5 text-white/40 border border-white/10'
                                                            }`}
                                                        >
                                                            {scope}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-3 pt-2">
                                            <button onClick={() => setShowCreateApp(false)} className="px-4 py-2 text-sm text-white/50 hover:text-white/70">Cancel</button>
                                            <button onClick={createApp} disabled={!newApp.name.trim()} className="px-6 py-2.5 bg-[#7C8FFF] text-white font-semibold rounded-xl text-sm disabled:opacity-30 hover:opacity-90 transition-opacity">
                                                Create Application
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Apps List */}
                            {isLoading ? (
                                <div className="flex items-center justify-center py-16">
                                    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                </div>
                            ) : apps.length === 0 ? (
                                <div className="text-center py-16 text-white/30">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-4 opacity-40"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                                    <p className="text-lg font-medium mb-1">No applications yet</p>
                                    <p className="text-sm">Create your first app to get API credentials</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {apps.map(app => (
                                        <div key={app.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-colors">
                                            <div className="flex items-start justify-between mb-4">
                                                <div>
                                                    <h3 className="font-semibold text-lg flex items-center gap-2">
                                                        {app.name}
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${app.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                                            {app.isActive ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </h3>
                                                    {app.description && <p className="text-sm text-white/40 mt-0.5">{app.description}</p>}
                                                </div>
                                                <button onClick={() => deleteApp(app.id)} className="p-2 text-red-400/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                                </button>
                                            </div>

                                            <div className="grid sm:grid-cols-4 gap-4 mb-4">
                                                <div className="bg-black/20 rounded-xl p-3">
                                                    <div className="text-xs text-white/30 mb-1">Client ID</div>
                                                    <div className="font-mono text-xs text-[#7C8FFF] truncate">{app.clientId}</div>
                                                </div>
                                                <div className="bg-black/20 rounded-xl p-3">
                                                    <div className="text-xs text-white/30 mb-1">Scopes</div>
                                                    <div className="text-xs font-mono text-white/60">{app.scopes}</div>
                                                </div>
                                                <div className="bg-black/20 rounded-xl p-3">
                                                    <div className="text-xs text-white/30 mb-1">Total Requests</div>
                                                    <div className="text-sm font-semibold">{app.requestCount.toLocaleString()}</div>
                                                </div>
                                                <div className="bg-black/20 rounded-xl p-3">
                                                    <div className="text-xs text-white/30 mb-1">Rate Limit</div>
                                                    <div className="text-xs font-medium text-amber-400 capitalize">{app.rateLimitTier}</div>
                                                </div>
                                            </div>

                                            {/* API Keys */}
                                            <div className="mb-3">
                                                <div className="text-xs text-white/30 uppercase tracking-wider mb-2">API Keys</div>
                                                <div className="space-y-1">
                                                    {app.apiKeys.map(key => (
                                                        <div key={key.id} className="flex items-center justify-between bg-black/20 rounded-lg px-3 py-2">
                                                            <div className="flex items-center gap-3">
                                                                <code className="text-xs font-mono text-white/50">{key.keyPrefix}...****</code>
                                                                <span className="text-[10px] text-white/30">{key.name}</span>
                                                            </div>
                                                            <div className="flex items-center gap-3 text-xs text-white/30">
                                                                <span>{key.requestCount} requests</span>
                                                                <span className={`w-2 h-2 rounded-full ${key.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Webhooks */}
                                            {app.webhooks.length > 0 && (
                                                <div>
                                                    <div className="text-xs text-white/30 uppercase tracking-wider mb-2">Webhooks</div>
                                                    <div className="space-y-1">
                                                        {app.webhooks.map(wh => (
                                                            <div key={wh.id} className="flex items-center justify-between bg-black/20 rounded-lg px-3 py-2">
                                                                <div className="text-xs font-mono text-white/50 truncate">{wh.url}</div>
                                                                <div className="flex items-center gap-2 text-xs text-white/30 flex-shrink-0">
                                                                    <span>{wh.events.split(',').length} events</span>
                                                                    {wh.failCount > 0 && <span className="text-red-400">{wh.failCount} fails</span>}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ==================== API DOCS ==================== */}
                    {activeTab === 'docs' && (
                        <motion.div key="docs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
                            <div>
                                <h2 className="text-xl font-semibold mb-1">API Reference</h2>
                                <p className="text-sm text-white/40">Complete reference for the 0G Developer API v1</p>
                            </div>

                            {/* Auth Section */}
                            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6">
                                <h3 className="font-semibold mb-3 flex items-center gap-2">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C8FFF" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                    Authentication
                                </h3>
                                <p className="text-sm text-white/50 mb-4">Two authentication methods are supported:</p>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="bg-black/30 rounded-xl p-4">
                                        <h4 className="text-sm font-semibold text-[#7C8FFF] mb-2">API Key</h4>
                                        <p className="text-xs text-white/40 mb-3">Best for server-to-server or agentic tools. Read-only by default.</p>
                                        <pre className="text-xs font-mono text-white/60 bg-black/40 rounded-lg p-3 overflow-x-auto">
{`X-Api-Key: 0g_your_api_key`}
                                        </pre>
                                    </div>
                                    <div className="bg-black/30 rounded-xl p-4">
                                        <h4 className="text-sm font-semibold text-[#6070EE] mb-2">OAuth 2.0 Bearer Token</h4>
                                        <p className="text-xs text-white/40 mb-3">Required for write operations. Acts on behalf of a user.</p>
                                        <pre className="text-xs font-mono text-white/60 bg-black/40 rounded-lg p-3 overflow-x-auto">
{`Authorization: Bearer 0gat_token`}
                                        </pre>
                                    </div>
                                </div>
                            </div>

                            {/* Endpoints */}
                            {API_SECTIONS.map(section => (
                                <div key={section.title} className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
                                    <div className="px-6 py-4 border-b border-white/5">
                                        <h3 className="font-semibold">{section.title}</h3>
                                    </div>
                                    <div className="divide-y divide-white/5">
                                        {section.endpoints.map((ep, i) => (
                                            <div key={i} className="px-6 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
                                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border ${METHOD_COLORS[ep.method] || METHOD_COLORS.GET}`}>
                                                    {ep.method}
                                                </span>
                                                <code className="text-sm font-mono text-white/70 flex-1">{ep.path}</code>
                                                <span className="text-xs text-white/30 hidden sm:block">{ep.desc}</span>
                                                {ep.scope !== '-' && (
                                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-white/30">{ep.scope}</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {/* Webhook Events */}
                            <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
                                <div className="px-6 py-4 border-b border-white/5">
                                    <h3 className="font-semibold">Webhook Events</h3>
                                </div>
                                <div className="divide-y divide-white/5">
                                    {WEBHOOK_EVENTS.map(ev => (
                                        <div key={ev.event} className="px-6 py-3 flex items-center gap-4">
                                            <code className="text-sm font-mono text-emerald-400">{ev.event}</code>
                                            <span className="text-xs text-white/30">{ev.desc}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Rate Limits */}
                            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6">
                                <h3 className="font-semibold mb-4">Rate Limits</h3>
                                <div className="grid md:grid-cols-3 gap-4">
                                    {[
                                        { tier: 'Free', limit: '100 req/min', color: 'text-white/60' },
                                        { tier: 'Pro', limit: '1,000 req/min', color: 'text-[#7C8FFF]' },
                                        { tier: 'Enterprise', limit: '10,000 req/min', color: 'text-[#6070EE]' },
                                    ].map(t => (
                                        <div key={t.tier} className="bg-black/30 rounded-xl p-4 text-center">
                                            <div className="text-xs text-white/30 uppercase tracking-wider mb-1">{t.tier}</div>
                                            <div className={`text-lg font-bold ${t.color}`}>{t.limit}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ==================== API CONSOLE ==================== */}
                    {activeTab === 'console' && (
                        <motion.div key="console" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                            <div>
                                <h2 className="text-xl font-semibold mb-1">API Console</h2>
                                <p className="text-sm text-white/40">Test API endpoints directly from your browser</p>
                            </div>

                            <div className="bg-[#0A0A0F] border border-white/10 rounded-2xl overflow-hidden">
                                {/* Terminal Header */}
                                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-black/30">
                                    <div className="w-3 h-3 rounded-full bg-red-500/60" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                                    <div className="w-3 h-3 rounded-full bg-green-500/60" />
                                    <span className="text-xs text-white/30 ml-2 font-mono">0G API Console</span>
                                </div>

                                <div className="p-5 space-y-4">
                                    {/* API Key Input */}
                                    <div>
                                        <label className="block text-xs text-white/30 mb-1.5 font-mono">X-Api-Key</label>
                                        <input
                                            type="text"
                                            value={consoleApiKey}
                                            onChange={(e) => setConsoleApiKey(e.target.value)}
                                            placeholder="0g_your_api_key_here"
                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 font-mono text-sm text-[#7C8FFF] placeholder:text-white/15 focus:outline-none focus:border-[#7C8FFF]/50"
                                        />
                                    </div>

                                    {/* Method + URL */}
                                    <div className="flex gap-2">
                                        <select
                                            value={consoleMethod}
                                            onChange={(e) => setConsoleMethod(e.target.value)}
                                            className="bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 font-mono text-sm text-white focus:outline-none appearance-none w-24"
                                        >
                                            <option value="GET" className="bg-[#1a1a1a]">GET</option>
                                            <option value="POST" className="bg-[#1a1a1a]">POST</option>
                                            <option value="PUT" className="bg-[#1a1a1a]">PUT</option>
                                            <option value="DELETE" className="bg-[#1a1a1a]">DELETE</option>
                                        </select>
                                        <input
                                            type="text"
                                            value={consoleEndpoint}
                                            onChange={(e) => setConsoleEndpoint(e.target.value)}
                                            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 font-mono text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/25"
                                        />
                                        <button
                                            onClick={runConsole}
                                            disabled={consoleLoading}
                                            className="px-6 py-2.5 bg-[#7C8FFF] text-white font-bold rounded-lg text-sm hover:opacity-90 transition-opacity disabled:opacity-50 font-mono"
                                        >
                                            {consoleLoading ? '...' : 'Send'}
                                        </button>
                                    </div>

                                    {/* Body (for POST/PUT) */}
                                    {['POST', 'PUT'].includes(consoleMethod) && (
                                        <div>
                                            <label className="block text-xs text-white/30 mb-1.5 font-mono">Request Body (JSON)</label>
                                            <textarea
                                                value={consoleBody}
                                                onChange={(e) => setConsoleBody(e.target.value)}
                                                rows={4}
                                                placeholder='{"content": "Hello from the API!"}'
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 font-mono text-sm text-white placeholder:text-white/15 focus:outline-none focus:border-white/25 resize-none"
                                            />
                                        </div>
                                    )}

                                    {/* Quick Endpoints */}
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { m: 'GET', p: '/api/v1/developer/public/stats' },
                                            { m: 'GET', p: '/api/v1/developer/public/communities' },
                                            { m: 'GET', p: '/api/v1/developer/public/posts' },
                                        ].map(q => (
                                            <button
                                                key={q.p}
                                                onClick={() => { setConsoleMethod(q.m); setConsoleEndpoint(q.p); }}
                                                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-mono text-white/40 hover:text-white/60 hover:border-white/20 transition-colors"
                                            >
                                                {q.m} {q.p.split('/').pop()}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Response */}
                                {consoleResponse && (
                                    <div className="border-t border-white/5">
                                        <div className="px-4 py-2 bg-black/20 flex items-center gap-2">
                                            <span className="text-xs font-mono text-emerald-400">Response</span>
                                        </div>
                                        <pre className="p-5 text-sm font-mono text-white/70 overflow-x-auto max-h-96 overflow-y-auto leading-relaxed">
                                            {consoleResponse}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Footer */}
            <footer className="relative z-10 border-t border-white/5 py-8 mt-16">
                <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
                    <p className="text-xs text-white/20">0G Developer Platform &middot; API v1</p>
                    <div className="flex gap-4 text-xs text-white/20">
                        <span>Rate limit: 100 req/min (free)</span>
                        <span>Status: Operational</span>
                    </div>
                </div>
            </footer>
            </div>
        </div>
    );
}
