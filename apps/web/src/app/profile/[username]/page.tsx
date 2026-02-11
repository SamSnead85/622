'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { API_URL } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { usePullToRefresh } from '@/hooks/useInfiniteScroll';
import { NavigationSidebar } from '@/components/dashboard/NavigationSidebar';
import { RightSidebar } from '@/components/RightSidebar';
import { HeartIcon, PlayIcon, PhoneIcon, VideoIcon } from '@/components/icons';
import { useCall } from '@/hooks/useCall';
import { CallInterface } from '@/components/calling/CallInterface';
import { IncomingCallOverlay } from '@/components/calling/IncomingCallOverlay';

export default function PublicProfilePage() {
    const params = useParams();
    const router = useRouter();
    const { user: currentUser, isAuthenticated } = useAuth();
    const { username } = params as { username: string };
    const [profile, setProfile] = useState<any>(null);
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isReporting, setIsReporting] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [reportSubmitted, setReportSubmitted] = useState(false);
    const moreMenuRef = useRef<HTMLDivElement>(null);
    const {
        initiateCall, answerCall, rejectCall, endCall,
        callState, currentCall, incomingCall, localStream, remoteStream,
        isMuted, isVideoOn, isScreenSharing, toggleMute, toggleVideo, toggleScreenShare,
    } = useCall();

    // Close more menu on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
                setShowMoreMenu(false);
            }
        }
        if (showMoreMenu) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showMoreMenu]);

    const loadProfileData = useCallback(async () => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('0g_token') : null;
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        try {
            const userRes = await fetch(`${API_URL}/api/v1/users/${encodeURIComponent(username)}`, {
                headers,
                credentials: 'include',
            });
            if (!userRes.ok) throw new Error('User not found');
            const userData = await userRes.json();
            setProfile(userData);
            if (userData?.isFollowing) setIsFollowing(true);

            if (userData?.id) {
                const postsRes = await fetch(`${API_URL}/api/v1/users/${userData.id}/posts`, {
                    headers,
                    credentials: 'include',
                });
                if (postsRes.ok) {
                    const postsData = await postsRes.json();
                    setPosts(postsData.posts || []);
                }
            }
        } catch (error) {
            console.error('Failed to load profile', error);
        } finally {
            setLoading(false);
        }
    }, [username]);

    // Follow / Unfollow
    const handleFollow = async () => {
        if (!isAuthenticated || !profile?.id) {
            router.push('/login');
            return;
        }
        const token = typeof window !== 'undefined' ? localStorage.getItem('0g_token') : null;
        const wasFollowing = isFollowing;
        setIsFollowing(!wasFollowing);
        try {
            await fetch(`${API_URL}/api/v1/users/${profile.id}/follow`, {
                method: wasFollowing ? 'DELETE' : 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
            });
        } catch {
            setIsFollowing(wasFollowing);
        }
    };

    // Report user
    const handleReport = async () => {
        if (!isAuthenticated || !profile?.id || !reportReason.trim()) return;
        setIsReporting(true);
        const token = typeof window !== 'undefined' ? localStorage.getItem('0g_token') : null;
        try {
            const res = await fetch(`${API_URL}/api/v1/reports`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    targetId: profile.id,
                    targetType: 'USER',
                    reason: reportReason.trim(),
                }),
            });
            if (res.ok) {
                setReportSubmitted(true);
                setTimeout(() => {
                    setShowReportModal(false);
                    setReportSubmitted(false);
                    setReportReason('');
                }, 2000);
            }
        } catch (err) {
            console.error('Failed to submit report:', err);
        } finally {
            setIsReporting(false);
        }
    };

    // Block user (uses follow endpoint DELETE + navigates away)
    const handleBlock = async () => {
        if (!isAuthenticated || !profile?.id) return;
        const token = typeof window !== 'undefined' ? localStorage.getItem('0g_token') : null;
        try {
            // Unfollow if following
            if (isFollowing) {
                await fetch(`${API_URL}/api/v1/users/${profile.id}/follow`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` },
                });
            }
            // Submit a block report for admin visibility
            await fetch(`${API_URL}/api/v1/reports`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    targetId: profile.id,
                    targetType: 'USER',
                    reason: 'User blocked by viewer',
                }),
            });
            router.push('/dashboard');
        } catch (err) {
            console.error('Failed to block user:', err);
        }
    };

    const { pullDistance, isRefreshing, containerRef: pullRef } = usePullToRefresh({
        onRefresh: loadProfileData,
    });

    useEffect(() => {
        loadProfileData();
    }, [loadProfileData]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050508]">
                <div className="max-w-4xl mx-auto">
                    {/* Cover skeleton */}
                    <div className="skeleton h-48 md:h-64 w-full" />
                    {/* Profile info skeleton */}
                    <div className="px-4 -mt-16 relative z-10">
                        <div className="skeleton w-28 h-28 rounded-full border-4 border-[#050508]" />
                        <div className="mt-4 space-y-2">
                            <div className="skeleton skeleton-text w-48" />
                            <div className="skeleton skeleton-text-sm w-32" />
                            <div className="skeleton skeleton-text w-72 mt-3" />
                        </div>
                        <div className="flex gap-6 mt-4">
                            <div className="skeleton w-20 h-8 rounded-lg" />
                            <div className="skeleton w-20 h-8 rounded-lg" />
                            <div className="skeleton w-20 h-8 rounded-lg" />
                        </div>
                    </div>
                    {/* Posts grid skeleton */}
                    <div className="grid grid-cols-3 gap-1 mt-8 px-4">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="skeleton aspect-square rounded-lg" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-[#050508] flex items-center justify-center text-white/50">
                User not found
            </div>
        );
    }

    return (
        <div ref={pullRef} className="min-h-screen bg-[#050508] relative">
            {/* Pull-to-refresh indicator */}
            {pullDistance > 0 && (
                <div className="flex items-center justify-center py-2 relative z-50" style={{ height: pullDistance }}>
                    <div className={`w-5 h-5 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full ${isRefreshing ? 'animate-spin' : ''}`} />
                </div>
            )}
            {/* Ambient Background matching Premium Theme */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/3 w-96 h-96 rounded-full bg-[#D4AF37]/[0.03] blur-[120px]" />
                <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full bg-[#9A7A24]/[0.03] blur-[120px]" />
            </div>

            <NavigationSidebar />
            <RightSidebar />

            <main className="lg:ml-20 xl:ml-64 lg:mr-80 min-h-screen pb-20 lg:pb-8 relative z-10">
                {/* Cover & Header */}
                <div className="relative">
                    <div className="h-48 lg:h-64 bg-gradient-to-br from-[#0a0a1a] via-[#1a0a2e] to-[#0a1a2e] relative overflow-hidden">
                        {profile.coverUrl ? (
                            <Image
                                src={profile.coverUrl}
                                alt={`${profile.displayName}'s cover`}
                                fill
                                className="object-cover opacity-80"
                            />
                        ) : (
                            <>
                                {/* Decorative blur orbs for cover */}
                                <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-[#D4AF37]/10 blur-[80px]" />
                                <div className="absolute bottom-0 right-1/3 w-48 h-48 rounded-full bg-[#9A7A24]/10 blur-[60px]" />
                            </>
                        )}
                        {/* Overlay gradient for text readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    </div>

                    <div className="max-w-4xl mx-auto px-6 relative">
                        <div className="flex flex-col md:flex-row items-start md:items-end gap-6 -mt-20 md:-mt-16 mb-8">
                            {/* Avatar */}
                            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-[#050508] p-1.5 relative z-10 ring-4 ring-black ring-offset-2 ring-offset-[#D4AF37]/20 shadow-[0_0_20px_rgba(0,212,255,0.2)]">
                                <div className="w-full h-full rounded-full overflow-hidden bg-gray-800 relative">
                                    {profile.avatarUrl ? (
                                        <Image src={profile.avatarUrl} alt={profile.displayName} fill className="object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-white/40 bg-white/5">
                                            {profile.displayName?.[0]}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Info */}
                            <div className="flex-1 pb-4 md:pb-0">
                                <h1 className="text-3xl font-bold text-white mb-1">{profile.displayName}</h1>
                                <p className="text-white/60 mb-4">@{profile.username}</p>

                                <div className="flex divide-x divide-white/10 mb-4">
                                    <div className="text-center px-4 first:pl-0">
                                        <div className="text-xl font-bold text-white">{posts.length}</div>
                                        <div className="text-xs text-white/40 uppercase tracking-wider">Posts</div>
                                    </div>
                                    <div className="text-center px-4">
                                        <div className="text-xl font-bold text-white">{profile._count?.followers || 0}</div>
                                        <div className="text-xs text-white/40 uppercase tracking-wider">Followers</div>
                                    </div>
                                    <div className="text-center px-4">
                                        <div className="text-xl font-bold text-white">{profile._count?.following || 0}</div>
                                        <div className="text-xs text-white/40 uppercase tracking-wider">Following</div>
                                    </div>
                                </div>

                                <p className="text-white/80 max-w-lg leading-relaxed">{profile.bio || 'Member of ZeroG'}</p>
                            </div>

                            {/* Actions */}
                            <div className="mb-4 self-center md:self-end flex items-center gap-2">
                                {currentUser?.id !== profile?.id && (
                                    <>
                                        <button
                                            onClick={handleFollow}
                                            className={`font-semibold px-6 py-2.5 rounded-xl transition-all duration-300 hover:scale-[1.02] ${
                                                isFollowing
                                                    ? 'bg-white/[0.06] border border-white/[0.1] text-white hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400'
                                                    : 'bg-gradient-to-r from-[#D4AF37] to-[#9A7A24] text-white hover:shadow-[0_4px_20px_rgba(0,212,255,0.3)]'
                                            }`}
                                        >
                                            {isFollowing ? 'Following' : 'Follow'}
                                        </button>
                                        <button
                                            onClick={() => router.push(`/messages?user=${profile?.username}`)}
                                            className="bg-white/[0.06] border border-white/[0.1] text-white font-medium px-6 py-2.5 rounded-xl hover:bg-white/[0.1] hover:border-[#D4AF37]/20 transition-all duration-300"
                                        >
                                            Message
                                        </button>
                                        <button
                                            onClick={() => profile?.id && initiateCall(profile.id, 'audio', { username: profile.username, displayName: profile.displayName, avatarUrl: profile.avatarUrl })}
                                            className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center hover:bg-emerald-500/20 hover:border-emerald-500/30 hover:text-emerald-400 transition-all duration-300"
                                            title="Voice call"
                                        >
                                            <PhoneIcon size={16} />
                                        </button>
                                        <button
                                            onClick={() => profile?.id && initiateCall(profile.id, 'video', { username: profile.username, displayName: profile.displayName, avatarUrl: profile.avatarUrl })}
                                            className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center hover:bg-blue-500/20 hover:border-blue-500/30 hover:text-blue-400 transition-all duration-300"
                                            title="Video call"
                                        >
                                            <VideoIcon size={16} />
                                        </button>
                                    </>
                                )}
                                <div className="relative" ref={moreMenuRef}>
                                    <button
                                        onClick={() => setShowMoreMenu(!showMoreMenu)}
                                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                                    >
                                        <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor" className="text-white/60">
                                            <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                                        </svg>
                                    </button>
                                    {showMoreMenu && (
                                        <div className="absolute right-0 top-full mt-2 w-48 bg-[#1a1a2e] rounded-xl border border-white/10 shadow-xl z-50 overflow-hidden">
                                            <button
                                                onClick={() => { setShowMoreMenu(false); setShowReportModal(true); }}
                                                className="w-full px-4 py-3 text-left text-sm text-white/70 hover:bg-white/5 transition-colors"
                                            >
                                                Report User
                                            </button>
                                            <button
                                                onClick={() => { setShowMoreMenu(false); if (confirm('Are you sure you want to block this user? You will be redirected to your dashboard.')) handleBlock(); }}
                                                className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-white/5 transition-colors"
                                            >
                                                Block User
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="max-w-4xl mx-auto px-6">
                    {/* Tab Navigation */}
                    <div className="flex gap-8 border-b border-white/[0.06] mb-8">
                        <button className="text-[#D4AF37] border-b-2 border-[#D4AF37] pb-3 font-semibold text-sm">Posts</button>
                        <button className="text-white/40 hover:text-white/70 pb-3 transition-colors duration-200 text-sm">Likes</button>
                        <button className="text-white/40 hover:text-white/70 pb-3 transition-colors duration-200 text-sm">Media</button>
                    </div>

                    <div className="pt-0">
                        {posts.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2 md:gap-4">
                                {posts.map((post) => (
                                    <motion.div
                                        key={post.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="aspect-square bg-white/5 rounded-xl overflow-hidden relative group cursor-pointer hover:ring-2 hover:ring-[#D4AF37]/30 transition-all duration-300"
                                    >
                                        {post.mediaUrl ? (
                                            <Image src={post.mediaUrl} alt="" fill className="object-cover transition-transform duration-500 group-hover:scale-110" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center p-4 text-center text-white/50 text-xs text-balance">
                                                {post.caption?.slice(0, 50)}...
                                            </div>
                                        )}

                                        {post.type === 'VIDEO' && (
                                            <div className="absolute top-2 right-2 text-white drop-shadow-md">
                                                <PlayIcon size={20} />
                                            </div>
                                        )}

                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-bold">
                                            <HeartIcon className="fill-white" size={20} />
                                            {post.likesCount || 0}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5">
                                <p className="text-white/30">No posts yet</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Report Modal */}
            {showReportModal && (
                <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-[#1a1a2e] rounded-2xl border border-white/10 p-6 w-full max-w-md"
                    >
                        {reportSubmitted ? (
                            <div className="text-center py-8">
                                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Report Submitted</h3>
                                <p className="text-white/50">Thank you. Our team will review this report.</p>
                            </div>
                        ) : (
                            <>
                                <h3 className="text-xl font-bold text-white mb-1">Report @{profile?.username}</h3>
                                <p className="text-white/50 text-sm mb-4">Help us understand what&apos;s wrong. Your report is confidential.</p>
                                <textarea
                                    value={reportReason}
                                    onChange={(e) => setReportReason(e.target.value)}
                                    placeholder="Describe the issue..."
                                    rows={4}
                                    maxLength={1000}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:border-[#D4AF37]/40 focus:outline-none resize-none mb-4"
                                />
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => { setShowReportModal(false); setReportReason(''); }}
                                        className="flex-1 py-3 rounded-xl bg-white/5 text-white/70 font-medium hover:bg-white/10 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleReport}
                                        disabled={!reportReason.trim() || isReporting}
                                        className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors disabled:opacity-40"
                                    >
                                        {isReporting ? 'Submitting...' : 'Submit Report'}
                                    </button>
                                </div>
                            </>
                        )}
                    </motion.div>
                </div>
            )}

            {/* Call UI Overlays */}
            {(callState === 'calling' || callState === 'connected') && currentCall && (
                <CallInterface
                    localStream={localStream}
                    remoteStream={remoteStream}
                    callState={callState}
                    isMuted={isMuted}
                    isVideoOn={isVideoOn}
                    isScreenSharing={isScreenSharing}
                    participantName={currentCall.participant.displayName || currentCall.participant.username}
                    participantAvatar={currentCall.participant.avatarUrl}
                    onToggleMute={toggleMute}
                    onToggleVideo={toggleVideo}
                    onToggleScreenShare={toggleScreenShare}
                    onEndCall={endCall}
                />
            )}
            {incomingCall && (
                <IncomingCallOverlay
                    isVisible={true}
                    callerName={incomingCall.from.displayName || incomingCall.from.username}
                    callerAvatar={incomingCall.from.avatarUrl}
                    callType={incomingCall.type}
                    onAcceptAudio={() => answerCall(incomingCall.callId)}
                    onAcceptVideo={() => answerCall(incomingCall.callId)}
                    onReject={() => rejectCall(incomingCall.callId)}
                />
            )}
        </div>
    );
}
