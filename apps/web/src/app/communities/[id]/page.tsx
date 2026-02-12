'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { NavigationSidebar } from '@/components/dashboard/NavigationSidebar';
import { API_URL, API_ENDPOINTS, apiFetch } from '@/lib/api';
import { usePosts } from '@/hooks/usePosts';
import { useCommunities } from '@/hooks/useCommunities';
import { FeedPost, PostSkeleton } from '@/components/FeedPost';
import { InviteFriends } from '@/components/InviteFriends';
import { useCall } from '@/hooks/useCall';
import { CallInterface } from '@/components/calling/CallInterface';
import { IncomingCallOverlay } from '@/components/calling/IncomingCallOverlay';

// ============================================
// TYPES
// ============================================
interface CommunityDetail {
    id: string;
    name: string;
    description: string;
    memberCount: number;
    isPrivate: boolean;
    coverUrl?: string;
    logoUrl?: string;
    brandColor?: string;
    role: 'admin' | 'moderator' | 'member';
    createdAt: string;
    category?: string;
    isMember?: boolean;
    websiteUrl?: string;
}

interface ChatMessage {
    id: string;
    content: string;
    mediaUrl?: string;
    createdAt: string;
    sender: { id: string; username: string; displayName: string; avatarUrl?: string };
}

interface Poll {
    id: string;
    question: string;
    isAnonymous: boolean;
    allowMultiple: boolean;
    expiresAt?: string;
    createdAt: string;
    isExpired: boolean;
    totalVotes: number;
    myVotes: string[];
    creator: { id: string; username: string; displayName: string; avatarUrl?: string };
    options: { id: string; text: string; voteCount: number }[];
}

interface Album {
    id: string;
    title: string;
    description?: string;
    coverUrl?: string;
    photoCount: number;
    previewPhotos: string[];
    createdAt: string;
}

interface MemberStatus {
    userId: string;
    emoji: string;
    text?: string;
    user: { id: string; username: string; displayName: string; avatarUrl?: string };
}

type CommunityTab = 'feed' | 'classroom' | 'calendar' | 'chat' | 'polls' | 'albums';

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800&h=400&fit=crop';

// ============================================
// MAIN COMPONENT
// ============================================
export default function CommunityDetailPage() {
    const params = useParams();
    const router = useRouter();
    const communityId = params.id as string;
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const refUsername = searchParams.get('ref');
    const { joinCommunity } = useCommunities();

    const [community, setCommunity] = useState<CommunityDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showInvite, setShowInvite] = useState(false);
    const [activeTab, setActiveTab] = useState<CommunityTab>('feed');

    // Chat state
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const [sendingChat, setSendingChat] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Polls state
    const [polls, setPolls] = useState<Poll[]>([]);
    const [pollsLoading, setPollsLoading] = useState(false);
    const [showNewPoll, setShowNewPoll] = useState(false);
    const [newPollQuestion, setNewPollQuestion] = useState('');
    const [newPollOptions, setNewPollOptions] = useState(['', '']);

    // Albums state
    const [albums, setAlbums] = useState<Album[]>([]);
    const [albumsLoading, setAlbumsLoading] = useState(false);
    const [showNewAlbum, setShowNewAlbum] = useState(false);
    const [newAlbumTitle, setNewAlbumTitle] = useState('');

    // Status state
    const [statuses, setStatuses] = useState<MemberStatus[]>([]);
    const [showStatusPicker, setShowStatusPicker] = useState(false);

    // Calling
    const {
        localStream, remoteStream, callState, isMuted, isVideoOn, isScreenSharing,
        currentCall, incomingCall, initiateCall, answerCall, rejectCall, endCall,
        toggleMute, toggleVideo, toggleScreenShare,
    } = useCall();

    const handleJoin = async () => {
        if (!community) return;
        await joinCommunity(community.id);
        if (refUsername && refUsername !== user?.username) {
            try {
                const profileRes = await apiFetch(`${API_ENDPOINTS.users}/${refUsername}/profile`);
                if (profileRes.ok) {
                    const profile = await profileRes.json();
                    if (profile.user?.id) {
                        await apiFetch(`${API_ENDPOINTS.users}/${profile.user.id}/follow`, { method: 'POST' });
                    }
                }
            } catch (e) { console.error('Auto-connect failed', e); }
        }
        setTimeout(() => window.location.reload(), 500);
    };

    const { posts, isLoading: postsLoading, hasMore, loadMore, likePost, toggleRsvp, deletePost, pinPost } = usePosts({ communityId });

    // ============================================
    // FETCH COMMUNITY
    // ============================================
    useEffect(() => {
        async function fetchCommunity() {
            try {
                setIsLoading(true);
                const response = await apiFetch(`${API_ENDPOINTS.communities}/${communityId}`);
                if (response.ok) {
                    const data = await response.json();
                    setCommunity(data.community || data);
                } else if (response.status === 404) {
                    setError('Community not found');
                } else {
                    setError('Failed to load community');
                }
            } catch (err) {
                console.error('Error fetching community:', err);
                setError('Network error');
            } finally {
                setIsLoading(false);
            }
        }
        if (communityId) fetchCommunity();
    }, [communityId]);

    // ============================================
    // FETCH CHAT MESSAGES
    // ============================================
    const fetchChat = useCallback(async () => {
        if (!community?.isMember) return;
        setChatLoading(true);
        try {
            const data = await apiFetch(`${API_URL}/api/v1/communities/${communityId}/chat/messages`);
            const parsed: any = data.data ?? data;
            setChatMessages(parsed?.messages || []);
        } catch (err) {
            console.error('Failed to load chat:', err);
        } finally {
            setChatLoading(false);
        }
    }, [communityId, community?.isMember]);

    const sendChatMessage = async () => {
        if (!chatInput.trim() || sendingChat) return;
        setSendingChat(true);
        try {
            const res = await apiFetch(`${API_URL}/api/v1/communities/${communityId}/chat/messages`, {
                method: 'POST',
                body: JSON.stringify({ content: chatInput.trim() }),
            });
            const msg: ChatMessage = (res.data ?? res) as ChatMessage;
            if (msg?.id) setChatMessages(prev => [...prev, msg]);
            setChatInput('');
            setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        } catch (err) {
            console.error('Failed to send message:', err);
        } finally {
            setSendingChat(false);
        }
    };

    // ============================================
    // FETCH POLLS
    // ============================================
    const fetchPolls = useCallback(async () => {
        if (!community?.isMember) return;
        setPollsLoading(true);
        try {
            const data = await apiFetch(`${API_URL}/api/v1/communities/${communityId}/polls`);
            setPolls(data.polls || []);
        } catch (err) {
            console.error('Failed to load polls:', err);
        } finally {
            setPollsLoading(false);
        }
    }, [communityId, community?.isMember]);

    const createPoll = async () => {
        const validOptions = newPollOptions.filter(o => o.trim());
        if (!newPollQuestion.trim() || validOptions.length < 2) return;
        try {
            await apiFetch(`${API_URL}/api/v1/communities/${communityId}/polls`, {
                method: 'POST',
                body: JSON.stringify({ question: newPollQuestion, options: validOptions }),
            });
            setShowNewPoll(false);
            setNewPollQuestion('');
            setNewPollOptions(['', '']);
            fetchPolls();
        } catch (err) {
            console.error('Failed to create poll:', err);
        }
    };

    const votePoll = async (pollId: string, optionId: string) => {
        try {
            await apiFetch(`${API_URL}/api/v1/communities/${communityId}/polls/${pollId}/vote`, {
                method: 'POST',
                body: JSON.stringify({ optionIds: [optionId] }),
            });
            fetchPolls();
        } catch (err) {
            console.error('Failed to vote:', err);
        }
    };

    // ============================================
    // FETCH ALBUMS
    // ============================================
    const fetchAlbums = useCallback(async () => {
        if (!community?.isMember) return;
        setAlbumsLoading(true);
        try {
            const data = await apiFetch(`${API_URL}/api/v1/communities/${communityId}/albums`);
            setAlbums(data.albums || []);
        } catch (err) {
            console.error('Failed to load albums:', err);
        } finally {
            setAlbumsLoading(false);
        }
    }, [communityId, community?.isMember]);

    const createAlbum = async () => {
        if (!newAlbumTitle.trim()) return;
        try {
            await apiFetch(`${API_URL}/api/v1/communities/${communityId}/albums`, {
                method: 'POST',
                body: JSON.stringify({ title: newAlbumTitle }),
            });
            setShowNewAlbum(false);
            setNewAlbumTitle('');
            fetchAlbums();
        } catch (err) {
            console.error('Failed to create album:', err);
        }
    };

    // ============================================
    // FETCH STATUSES
    // ============================================
    const fetchStatuses = useCallback(async () => {
        if (!community?.isMember) return;
        try {
            const data = await apiFetch(`${API_URL}/api/v1/communities/${communityId}/statuses`);
            setStatuses(data.statuses || []);
        } catch (err) { console.error('Failed to load statuses:', err); }
    }, [communityId, community?.isMember]);

    const setMyStatus = async (emoji: string, text: string) => {
        try {
            await apiFetch(`${API_URL}/api/v1/communities/${communityId}/status`, {
                method: 'POST',
                body: JSON.stringify({ emoji, text, duration: 24 }),
            });
            setShowStatusPicker(false);
            fetchStatuses();
        } catch (err) { console.error('Failed to set status:', err); }
    };

    // Load tab data when switching tabs
    useEffect(() => {
        if (activeTab === 'chat') fetchChat();
        else if (activeTab === 'polls') fetchPolls();
        else if (activeTab === 'albums') fetchAlbums();
    }, [activeTab, fetchChat, fetchPolls, fetchAlbums]);

    // Load statuses when community loads
    useEffect(() => {
        if (community?.isMember) fetchStatuses();
    }, [community?.isMember, fetchStatuses]);

    // Auto-refresh chat every 5 seconds when on chat tab
    useEffect(() => {
        if (activeTab !== 'chat' || !community?.isMember) return;
        const interval = setInterval(fetchChat, 5000);
        return () => clearInterval(interval);
    }, [activeTab, community?.isMember, fetchChat]);

    // Scroll to bottom of chat when new messages arrive
    useEffect(() => {
        if (activeTab === 'chat' && chatMessages.length > 0) {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages.length, activeTab]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !community) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
                <h1 className="text-2xl font-semibold mb-2">Community Not Found</h1>
                <p className="text-white/50 mb-6">{error || 'This community does not exist.'}</p>
                <Link href="/communities" className="px-6 py-3 rounded-xl bg-[#D4AF37] text-black font-semibold">
                    Back to Groups
                </Link>
            </div>
        );
    }

    const coverImage = community.coverUrl || DEFAULT_COVER;
    const role = community.role || 'member';
    const isAdmin = role === 'admin';
    const brandColor = community.brandColor || '#D4AF37';

    const tabs: { id: CommunityTab; label: string; icon: React.ReactNode }[] = [
        {
            id: 'feed', label: 'Feed',
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>,
        },
        {
            id: 'classroom', label: 'Classroom',
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
        },
        {
            id: 'calendar', label: 'Events',
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
        },
        {
            id: 'chat', label: 'Chat',
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
        },
        {
            id: 'polls', label: 'Polls',
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>,
        },
        {
            id: 'albums', label: 'Photos',
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>,
        },
    ];

    return (
        <div className="min-h-screen bg-black text-white">
            <NavigationSidebar />
            <div className="lg:ml-20 xl:ml-64 pb-24 lg:pb-8">
            {/* Cover Image */}
            <div className="relative h-44 md:h-56">
                <Image src={coverImage} alt={`${community.name} banner`} fill className="object-cover" priority />
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black" />

                <Link href="/communities" className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-2 rounded-xl bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors text-sm">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Back
                </Link>

                <div className="absolute top-4 right-4 z-10 flex gap-2">
                    {/* Voice Call button */}
                    {community.isMember && (
                        <button
                            onClick={() => {
                                // For group calls, we'd notify all members via socket
                                // For now, initiate a call (in a 1:1 context this targets a specific user)
                                if (user?.id) initiateCall(user.id, 'audio');
                            }}
                            className="p-2.5 rounded-xl bg-emerald-500/80 backdrop-blur-sm text-white hover:bg-emerald-500 transition-colors"
                            title="Start voice call"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        </button>
                    )}
                    {/* Video Call button */}
                    {community.isMember && (
                        <button
                            onClick={() => {
                                if (user?.id) initiateCall(user.id, 'video');
                            }}
                            className="p-2.5 rounded-xl bg-blue-500/80 backdrop-blur-sm text-white hover:bg-blue-500 transition-colors"
                            title="Start video call"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23,7 16,12 23,17"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                        </button>
                    )}
                    {isAdmin && (
                        <>
                            <Link href={`/communities/${communityId}/admin`} className="p-2.5 rounded-xl bg-[#D4AF37]/20 backdrop-blur-sm text-[#D4AF37] hover:bg-[#D4AF37]/30 transition-colors" title="Admin Dashboard">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>
                            </Link>
                            <Link href={`/communities/${communityId}/settings`} className="p-2.5 rounded-xl bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors" title="Settings">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                            </Link>
                        </>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="relative z-10 -mt-12 px-4 pb-8">
                <div className="max-w-2xl mx-auto">
                    {/* Header Card */}
                    <motion.div
                        className="bg-[#0A0A0F]/90 backdrop-blur-xl rounded-2xl border border-white/10 p-5 mb-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                {community.logoUrl ? (
                                    <img src={community.logoUrl} alt={`${community.name} logo`} className="w-12 h-12 rounded-xl object-cover border border-white/10" />
                                ) : (
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-white" style={{ backgroundColor: brandColor + '40' }}>
                                        {community.name[0]?.toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <h1 className="text-xl font-bold">{community.name}</h1>
                                    <div className="flex items-center gap-2 text-xs text-white/50">
                                        {community.isPrivate ? (
                                            <span className="flex items-center gap-1 text-emerald-400">
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                                Private
                                            </span>
                                        ) : <span>Public</span>}
                                        <span>&middot;</span>
                                        <span>{community.memberCount} members</span>
                                    </div>
                                </div>
                            </div>
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                                role === 'admin' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                                : role === 'moderator' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                : 'bg-white/10 text-white/60 border border-white/10'
                            }`}>
                                {role.charAt(0).toUpperCase() + role.slice(1)}
                            </span>
                        </div>

                        {community.description && <p className="text-sm text-white/60 mb-3">{community.description}</p>}

                        {/* Status Bubbles */}
                        {statuses.length > 0 && (
                            <div className="flex gap-2 mb-3 overflow-x-auto pb-1 -mx-1 px-1">
                                {statuses.slice(0, 8).map(s => (
                                    <div key={s.userId} className="flex flex-col items-center gap-1 flex-shrink-0" title={`${s.user?.displayName}: ${s.text || ''}`}>
                                        <div className="relative">
                                            {s.user?.avatarUrl ? (
                                                <img src={s.user.avatarUrl} alt={s.user?.displayName || 'User avatar'} className="w-9 h-9 rounded-full object-cover ring-2 ring-emerald-500/50" />
                                            ) : (
                                                <div className="w-9 h-9 rounded-full bg-white/10 ring-2 ring-emerald-500/50 flex items-center justify-center text-xs font-bold">
                                                    {(s.user?.displayName || '?')[0]}
                                                </div>
                                            )}
                                            <span className="absolute -bottom-1 -right-1 text-sm">{s.emoji}</span>
                                        </div>
                                        <span className="text-[10px] text-white/40 max-w-[50px] truncate">{s.user?.displayName?.split(' ')[0]}</span>
                                    </div>
                                ))}
                                {community.isMember && (
                                    <button onClick={() => setShowStatusPicker(true)} className="flex flex-col items-center gap-1 flex-shrink-0">
                                        <div className="w-9 h-9 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center text-white/30 hover:border-white/40 hover:text-white/50 transition-colors">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                                        </div>
                                        <span className="text-[10px] text-white/30">Status</span>
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-2">
                            {community.isMember ? (
                                <>
                                    <button onClick={() => router.push(`/create?communityId=${communityId}`)} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-black font-semibold text-sm hover:opacity-90 transition-opacity" style={{ backgroundColor: brandColor }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                                        Post
                                    </button>
                                    <button onClick={() => setShowInvite(true)} className="px-4 py-2.5 rounded-xl bg-green-500/20 text-green-400 font-medium text-sm hover:bg-green-500/30 transition-colors">
                                        Invite
                                    </button>
                                </>
                            ) : (
                                <button onClick={handleJoin} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-black font-semibold hover:opacity-90 transition-opacity" style={{ backgroundColor: brandColor }}>
                                    Join Group
                                </button>
                            )}
                            <button
                                onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/communities/${communityId}`); }}
                                className="px-3 py-2.5 rounded-xl bg-white/10 text-white hover:bg-white/15 transition-colors"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"/></svg>
                            </button>
                        </div>
                    </motion.div>

                    {/* Tabs */}
                    {community.isMember && (
                        <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1 mb-4 overflow-x-auto">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-shrink-0 ${
                                        activeTab === tab.id
                                            ? 'bg-white/10 text-white'
                                            : 'text-white/40 hover:text-white/60'
                                    }`}
                                >
                                    {tab.icon}
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Tab Content */}
                    <AnimatePresence mode="wait">
                        {/* ==================== FEED TAB ==================== */}
                        {activeTab === 'feed' && (
                            <motion.div key="feed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                                {postsLoading && posts.length === 0 ? (
                                    <><PostSkeleton /><PostSkeleton /></>
                                ) : posts.length > 0 ? (
                                    <>
                                        {posts.map(post => (
                                            <FeedPost key={post.id} post={post} likePost={likePost} toggleRsvp={toggleRsvp} deletePost={deletePost} pinPost={pinPost} />
                                        ))}
                                        {hasMore && (
                                            <div className="flex justify-center py-4">
                                                <button onClick={loadMore} className="px-4 py-2 rounded-full bg-white/5 text-white/50 text-sm hover:bg-white/10 transition-colors">Load more</button>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="bg-white/5 rounded-2xl border border-white/10 p-8 text-center">
                                        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-white/5 flex items-center justify-center text-white/30">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                        </div>
                                        <h3 className="font-semibold mb-1">No posts yet</h3>
                                        <p className="text-sm text-white/50 mb-4">Be the first to share something!</p>
                                        <button onClick={() => router.push(`/create?communityId=${communityId}`)} className="px-5 py-2.5 rounded-xl text-black font-semibold text-sm" style={{ backgroundColor: brandColor }}>
                                            Create First Post
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* ==================== CLASSROOM TAB ==================== */}
                        {activeTab === 'classroom' && (
                            <motion.div key="classroom" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                                <div className="bg-[#0A0A0F]/60 backdrop-blur rounded-2xl border border-white/10 p-8 text-center">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Courses & Learning</h3>
                                    <p className="text-white/50 mb-6 max-w-md mx-auto">Access structured courses, track your progress, and level up your knowledge in this community.</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
                                        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                            <div className="text-2xl mb-2">📚</div>
                                            <div className="text-sm font-medium text-white">Structured Courses</div>
                                            <div className="text-xs text-white/40 mt-1">Learn at your own pace</div>
                                        </div>
                                        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                            <div className="text-2xl mb-2">🏆</div>
                                            <div className="text-sm font-medium text-white">Leaderboard</div>
                                            <div className="text-xs text-white/40 mt-1">Earn points & level up</div>
                                        </div>
                                    </div>
                                    <p className="text-white/30 text-xs mt-6">Full classroom experience available in the mobile app</p>
                                </div>
                            </motion.div>
                        )}

                        {/* ==================== CALENDAR TAB ==================== */}
                        {activeTab === 'calendar' && (
                            <motion.div key="calendar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                                <div className="bg-[#0A0A0F]/60 backdrop-blur rounded-2xl border border-white/10 p-8 text-center">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Community Events</h3>
                                    <p className="text-white/50 mb-6 max-w-md mx-auto">View upcoming events, RSVP, and never miss a community gathering.</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
                                        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                            <div className="text-2xl mb-2">📅</div>
                                            <div className="text-sm font-medium text-white">Upcoming Events</div>
                                            <div className="text-xs text-white/40 mt-1">Never miss a gathering</div>
                                        </div>
                                        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                            <div className="text-2xl mb-2">✅</div>
                                            <div className="text-sm font-medium text-white">RSVP</div>
                                            <div className="text-xs text-white/40 mt-1">Let others know you&apos;re coming</div>
                                        </div>
                                    </div>
                                    <p className="text-white/30 text-xs mt-6">Full calendar experience available in the mobile app</p>
                                </div>
                            </motion.div>
                        )}

                        {/* ==================== CHAT TAB ==================== */}
                        {activeTab === 'chat' && (
                            <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                <div className="bg-[#0A0A0F]/60 backdrop-blur rounded-2xl border border-white/10 overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 400px)', minHeight: '400px' }}>
                                    {/* Chat Messages */}
                                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                        {chatLoading ? (
                                            <div className="flex justify-center py-4">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#D4AF37]" />
                                            </div>
                                        ) : chatMessages.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-12 text-white/30">
                                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 opacity-40"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                                                <p className="text-sm">No messages yet. Start the conversation!</p>
                                            </div>
                                        ) : (
                                            chatMessages.map((msg, i) => {
                                                const isMe = msg.sender.id === user?.id;
                                                const showAvatar = i === 0 || chatMessages[i - 1]?.sender.id !== msg.sender.id;
                                                return (
                                                    <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                                                        {showAvatar && !isMe ? (
                                                            msg.sender.avatarUrl ? (
                                                                <img src={msg.sender.avatarUrl} alt={msg.sender.displayName || 'User avatar'} className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-1" />
                                                            ) : (
                                                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1">
                                                                    {(msg.sender.displayName || '?')[0]}
                                                                </div>
                                                            )
                                                        ) : !isMe ? <div className="w-8 flex-shrink-0" /> : null}
                                                        <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                                                            {showAvatar && !isMe && (
                                                                <span className="text-[11px] text-white/30 mb-0.5 block">{msg.sender.displayName}</span>
                                                            )}
                                                            <div className={`px-3.5 py-2 rounded-2xl text-sm ${
                                                                isMe
                                                                    ? 'bg-[#D4AF37]/20 text-white rounded-br-md'
                                                                    : 'bg-white/[0.07] text-white/90 rounded-bl-md'
                                                            }`}>
                                                                {msg.content}
                                                            </div>
                                                            <span className="text-[10px] text-white/20 mt-0.5 block">
                                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                        <div ref={chatEndRef} />
                                    </div>

                                    {/* Chat Input */}
                                    <div className="border-t border-white/5 p-3 flex gap-2">
                                        <input
                                            type="text"
                                            value={chatInput}
                                            onChange={(e) => setChatInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}
                                            placeholder="Type a message..."
                                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/25 transition-colors"
                                        />
                                        <button
                                            onClick={sendChatMessage}
                                            disabled={!chatInput.trim() || sendingChat}
                                            className="px-4 py-2.5 rounded-xl text-black font-medium text-sm disabled:opacity-30 transition-all"
                                            style={{ backgroundColor: brandColor }}
                                        >
                                            {sendingChat ? (
                                                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                            ) : (
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/></svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ==================== POLLS TAB ==================== */}
                        {activeTab === 'polls' && (
                            <motion.div key="polls" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                                {/* Create Poll Button */}
                                <button
                                    onClick={() => setShowNewPoll(!showNewPoll)}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-white/15 text-white/50 text-sm hover:border-white/30 hover:text-white/70 transition-all"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                                    Create a Poll
                                </button>

                                {/* New Poll Form */}
                                <AnimatePresence>
                                    {showNewPoll && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-4 overflow-hidden"
                                        >
                                            <input
                                                type="text"
                                                value={newPollQuestion}
                                                onChange={(e) => setNewPollQuestion(e.target.value)}
                                                placeholder="Ask a question..."
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-white/25"
                                            />
                                            <div className="space-y-2">
                                                {newPollOptions.map((opt, i) => (
                                                    <div key={i} className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={opt}
                                                            onChange={(e) => {
                                                                const updated = [...newPollOptions];
                                                                updated[i] = e.target.value;
                                                                setNewPollOptions(updated);
                                                            }}
                                                            placeholder={`Option ${i + 1}`}
                                                            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/25"
                                                        />
                                                        {newPollOptions.length > 2 && (
                                                            <button onClick={() => setNewPollOptions(newPollOptions.filter((_, j) => j !== i))} className="px-2 text-red-400/60 hover:text-red-400">
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                                {newPollOptions.length < 6 && (
                                                    <button onClick={() => setNewPollOptions([...newPollOptions, ''])} className="text-xs text-white/40 hover:text-white/60 transition-colors">
                                                        + Add option
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => setShowNewPoll(false)} className="px-4 py-2 text-sm text-white/50 hover:text-white/70">Cancel</button>
                                                <button onClick={createPoll} disabled={!newPollQuestion.trim() || newPollOptions.filter(o => o.trim()).length < 2} className="px-5 py-2 rounded-lg text-black text-sm font-medium disabled:opacity-30" style={{ backgroundColor: brandColor }}>
                                                    Create Poll
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Polls List */}
                                {pollsLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    </div>
                                ) : polls.length === 0 ? (
                                    <div className="text-center py-12 text-white/30">
                                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 opacity-40"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
                                        <p className="text-sm">No polls yet. Create one to get opinions!</p>
                                    </div>
                                ) : (
                                    polls.map(poll => {
                                        const hasVoted = poll.myVotes.length > 0;
                                        return (
                                            <div key={poll.id} className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div>
                                                        <h3 className="font-medium text-sm">{poll.question}</h3>
                                                        <p className="text-xs text-white/30 mt-0.5">
                                                            by {poll.creator?.displayName} &middot; {poll.totalVotes} vote{poll.totalVotes !== 1 && 's'}
                                                            {poll.isExpired && <span className="text-red-400 ml-1">Expired</span>}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    {poll.options.map(opt => {
                                                        const pct = poll.totalVotes > 0 ? Math.round((opt.voteCount / poll.totalVotes) * 100) : 0;
                                                        const isMyVote = poll.myVotes.includes(opt.id);
                                                        return (
                                                            <button
                                                                key={opt.id}
                                                                onClick={() => !poll.isExpired && votePoll(poll.id, opt.id)}
                                                                disabled={poll.isExpired}
                                                                className={`w-full relative overflow-hidden rounded-xl border text-left transition-all ${
                                                                    isMyVote ? 'border-[#D4AF37]/30' : 'border-white/10 hover:border-white/20'
                                                                }`}
                                                            >
                                                                {hasVoted && (
                                                                    <div className="absolute inset-0 rounded-xl" style={{ width: `${pct}%`, backgroundColor: isMyVote ? `${brandColor}20` : 'rgba(255,255,255,0.03)' }} />
                                                                )}
                                                                <div className="relative px-4 py-3 flex items-center justify-between">
                                                                    <span className="text-sm">{opt.text}</span>
                                                                    {hasVoted && (
                                                                        <span className="text-xs text-white/40 font-medium">{pct}%</span>
                                                                    )}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </motion.div>
                        )}

                        {/* ==================== ALBUMS TAB ==================== */}
                        {activeTab === 'albums' && (
                            <motion.div key="albums" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                                <button
                                    onClick={() => setShowNewAlbum(!showNewAlbum)}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-white/15 text-white/50 text-sm hover:border-white/30 hover:text-white/70 transition-all"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                                    Create Album
                                </button>

                                <AnimatePresence>
                                    {showNewAlbum && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-3 overflow-hidden"
                                        >
                                            <input
                                                type="text"
                                                value={newAlbumTitle}
                                                onChange={(e) => setNewAlbumTitle(e.target.value)}
                                                placeholder="Album title..."
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-white/25"
                                            />
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => setShowNewAlbum(false)} className="px-4 py-2 text-sm text-white/50">Cancel</button>
                                                <button onClick={createAlbum} disabled={!newAlbumTitle.trim()} className="px-5 py-2 rounded-lg text-black text-sm font-medium disabled:opacity-30" style={{ backgroundColor: brandColor }}>
                                                    Create
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {albumsLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    </div>
                                ) : albums.length === 0 ? (
                                    <div className="text-center py-12 text-white/30">
                                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 opacity-40"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>
                                        <p className="text-sm">No photo albums yet. Create one to share memories!</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3">
                                        {albums.map(album => (
                                            <div key={album.id} className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden group cursor-pointer hover:border-white/20 transition-all">
                                                <div className="aspect-square relative bg-white/5">
                                                    {album.coverUrl || album.previewPhotos[0] ? (
                                                        <img src={album.coverUrl || album.previewPhotos[0]} alt={album.title || 'Album cover'} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-white/20">
                                                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent" />
                                                    <div className="absolute bottom-3 left-3 right-3">
                                                        <h4 className="font-semibold text-sm truncate">{album.title}</h4>
                                                        <p className="text-xs text-white/50">{album.photoCount} photo{album.photoCount !== 1 && 's'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Status Picker Modal */}
            <AnimatePresence>
                {showStatusPicker && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
                        onClick={() => setShowStatusPicker(false)}
                    >
                        <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 50, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5 max-w-sm w-full"
                        >
                            <h3 className="font-semibold mb-4">Set Your Status</h3>
                            <div className="grid grid-cols-4 gap-2 mb-4">
                                {[
                                    { emoji: '👋', text: "I'm here" },
                                    { emoji: '😊', text: 'Doing great' },
                                    { emoji: '🏠', text: 'At home' },
                                    { emoji: '💼', text: 'At work' },
                                    { emoji: '✈️', text: 'Traveling' },
                                    { emoji: '🤒', text: 'Not feeling well' },
                                    { emoji: '📚', text: 'Studying' },
                                    { emoji: '🎉', text: 'Celebrating' },
                                    { emoji: '🙏', text: 'Grateful' },
                                    { emoji: '💪', text: 'Working out' },
                                    { emoji: '🍳', text: 'Cooking' },
                                    { emoji: '😴', text: 'Sleeping' },
                                ].map(s => (
                                    <button
                                        key={s.emoji}
                                        onClick={() => setMyStatus(s.emoji, s.text)}
                                        className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-white/10 transition-colors"
                                    >
                                        <span className="text-2xl">{s.emoji}</span>
                                        <span className="text-[10px] text-white/40">{s.text}</span>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <InviteFriends isOpen={showInvite} onClose={() => setShowInvite(false)} communityId={communityId} communityName={community.name} />

            {/* Active Call UI */}
            <AnimatePresence>
                {callState !== 'idle' && callState !== 'ended' && currentCall && (
                    <CallInterface
                        localStream={localStream}
                        remoteStream={remoteStream}
                        callState={callState}
                        isMuted={isMuted}
                        isVideoOn={isVideoOn}
                        isScreenSharing={isScreenSharing}
                        participantName={currentCall.participant.displayName || community.name}
                        participantAvatar={currentCall.participant.avatarUrl || community.logoUrl}
                        onEndCall={endCall}
                        onToggleMute={toggleMute}
                        onToggleVideo={toggleVideo}
                        onToggleScreenShare={toggleScreenShare}
                    />
                )}
            </AnimatePresence>

            {/* Incoming Call Overlay */}
            <IncomingCallOverlay
                isVisible={!!incomingCall}
                callerName={incomingCall?.from.displayName || 'Unknown'}
                callerAvatar={incomingCall?.from.avatarUrl}
                callType={incomingCall?.type || 'audio'}
                onAcceptAudio={() => incomingCall && answerCall(incomingCall.callId)}
                onAcceptVideo={() => incomingCall && answerCall(incomingCall.callId)}
                onReject={() => incomingCall && rejectCall(incomingCall.callId)}
            />
            </div>
        </div>
    );
}
