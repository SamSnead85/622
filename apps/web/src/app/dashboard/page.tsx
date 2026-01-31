'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

// Story Bubble Component
function StoryBubble({
    name,
    image,
    isYou = false,
    hasUnread = false,
}: {
    name: string;
    image: string;
    isYou?: boolean;
    hasUnread?: boolean;
}) {
    return (
        <button className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div className={`relative w-16 h-16 rounded-full ${hasUnread ? 'p-[2px] bg-gradient-to-br from-rose-500 via-purple-500 to-blue-500' : ''}`}>
                <div className={`w-full h-full rounded-full ${hasUnread ? 'p-[2px] bg-gray-950' : ''}`}>
                    <div className="w-full h-full rounded-full overflow-hidden relative">
                        <Image src={image} alt={name} fill className="object-cover" />
                    </div>
                </div>
                {isYou && (
                    <div className="absolute bottom-0 right-0 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-gray-950">
                        <span className="text-white text-xs font-bold">+</span>
                    </div>
                )}
            </div>
            <span className="text-[11px] text-gray-400 truncate max-w-16">{name}</span>
        </button>
    );
}

// Feed Post Component
function FeedPost({
    author,
    username,
    avatar,
    image,
    caption,
    time,
    likes,
    comments,
    delay = 0,
}: {
    author: string;
    username: string;
    avatar: string;
    image: string;
    caption: string;
    time: string;
    likes: number;
    comments: { author: string; text: string }[];
    delay?: number;
}) {
    const [isLiked, setIsLiked] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [likeCount, setLikeCount] = useState(likes);

    const handleLike = () => {
        setIsLiked(!isLiked);
        setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
    };

    return (
        <motion.article
            className="border-b border-gray-900"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
        >
            {/* Post Header */}
            <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-full overflow-hidden relative flex-shrink-0">
                    <Image src={avatar} alt={author} fill className="object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                    <span className="text-[14px] font-semibold">{author}</span>
                    <span className="text-[12px] text-gray-500 ml-2">{time}</span>
                </div>
                <button className="text-gray-400 hover:text-white p-1">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                        <circle cx="9" cy="3" r="1.5" />
                        <circle cx="9" cy="9" r="1.5" />
                        <circle cx="9" cy="15" r="1.5" />
                    </svg>
                </button>
            </div>

            {/* Post Image */}
            <div className="relative aspect-square bg-gray-900">
                <Image
                    src={image}
                    alt={`Post by ${author}`}
                    fill
                    className="object-cover"
                />
            </div>

            {/* Action Buttons */}
            <div className="px-4 py-3">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleLike}
                            className={`transition-all duration-200 active:scale-125 ${isLiked ? 'text-rose-500' : 'text-white hover:text-gray-400'}`}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                                <path d="M12 21s-8-5-8-11a5 5 0 0110 0 5 5 0 0110 0c0 6-8 11-8 11z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                        <button className="text-white hover:text-gray-400 transition-colors duration-200">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                        <button className="text-white hover:text-gray-400 transition-colors duration-200">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>
                    <button
                        onClick={() => setIsSaved(!isSaved)}
                        className={`transition-colors duration-200 ${isSaved ? 'text-white' : 'text-white hover:text-gray-400'}`}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>

                {/* Likes */}
                <div className="mb-2">
                    <span className="text-[14px] font-semibold">{likeCount.toLocaleString()} likes</span>
                </div>

                {/* Caption */}
                <div className="mb-2">
                    <span className="text-[14px]">
                        <span className="font-semibold">{username}</span>{' '}
                        <span className="text-gray-300">{caption}</span>
                    </span>
                </div>

                {/* Comments preview */}
                {comments.length > 0 && (
                    <div className="space-y-1">
                        {comments.slice(0, 2).map((comment, i) => (
                            <div key={i} className="text-[14px]">
                                <span className="font-semibold">{comment.author}</span>{' '}
                                <span className="text-gray-300">{comment.text}</span>
                            </div>
                        ))}
                        {comments.length > 2 && (
                            <button className="text-[14px] text-gray-500">
                                View all {comments.length} comments
                            </button>
                        )}
                    </div>
                )}

                {/* Add comment */}
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-900">
                    <input
                        type="text"
                        placeholder="Add a comment..."
                        className="flex-1 bg-transparent text-[14px] text-white placeholder:text-gray-600 focus:outline-none"
                    />
                    <button className="text-[14px] font-semibold text-blue-500 hover:text-blue-400">Post</button>
                </div>
            </div>
        </motion.article>
    );
}

// Message Preview Component
function MessagePreview({ name, avatar, message, time, unread = false }: {
    name: string;
    avatar: string;
    message: string;
    time: string;
    unread?: boolean;
}) {
    return (
        <Link href="#" className="flex items-center gap-3 p-3 hover:bg-gray-900 rounded-lg transition-colors duration-200">
            <div className="relative">
                <div className="w-12 h-12 rounded-full overflow-hidden relative">
                    <Image src={avatar} alt={name} fill className="object-cover" />
                </div>
                {unread && (
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full border-2 border-gray-950" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-[14px] ${unread ? 'font-semibold' : ''}`}>{name}</span>
                    <span className="text-[11px] text-gray-500">{time}</span>
                </div>
                <p className={`text-[13px] truncate ${unread ? 'text-gray-300' : 'text-gray-500'}`}>{message}</p>
            </div>
        </Link>
    );
}

// Navigation Item
function NavItem({
    icon,
    label,
    active = false,
    href = '#',
    notification = false,
}: {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    href?: string;
    notification?: boolean;
}) {
    return (
        <Link
            href={href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-200 ${active
                ? 'bg-gray-900'
                : 'hover:bg-gray-900/50'
                }`}
        >
            <span className="relative w-6 h-6 flex items-center justify-center">
                {icon}
                {notification && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full" />
                )}
            </span>
            <span className={`text-[15px] ${active ? 'font-semibold' : ''}`}>{label}</span>
        </Link>
    );
}

// Sidebar Component
function Sidebar({ onOpenCreate }: { onOpenCreate: () => void }) {
    return (
        <aside className="fixed left-0 top-0 bottom-0 w-64 bg-gray-950 border-r border-gray-900 flex flex-col p-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 px-3 py-4 mb-4">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                    <span className="text-gray-950 font-semibold text-sm">C</span>
                </div>
                <span className="font-semibold text-xl tracking-[-0.02em]">Caravan</span>
            </Link>

            {/* Navigation */}
            <nav className="flex-1 space-y-1">
                <NavItem
                    icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9.5L12 3l9 6.5V21a1 1 0 01-1 1h-5v-7h-6v7H4a1 1 0 01-1-1V9.5z" /></svg>}
                    label="Home"
                    active
                />
                <NavItem
                    icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" /></svg>}
                    label="Explore"
                />
                <NavItem
                    icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3" /><line x1="19" y1="12" x2="19" y2="12" /></svg>}
                    label="Journeys"
                    href="/journeys"
                />
                <NavItem
                    icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" /></svg>}
                    label="Messages"
                    notification
                />
                <NavItem
                    icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" /></svg>}
                    label="Notifications"
                    notification
                />
                <NavItem
                    icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>}
                    label="Communities"
                />
                <NavItem
                    icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2c3.31 0 6 2.69 6 6 0 2.97-2.16 5.44-5 5.92V22h-2v-8.08c-2.84-.48-5-2.95-5-5.92 0-3.31 2.69-6 6-6z" /><path d="M12 6v8" /><circle cx="12" cy="8" r="2" fill="currentColor" /></svg>}
                    label="Campfire"
                    href="/campfire"
                />
                <NavItem
                    icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>}
                    label="Profile"
                />

                {/* Migration Link */}
                <NavItem
                    icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 14.899A7 7 0 1115.71 8h1.79a4.5 4.5 0 012.5 8.242" /><path d="M12 12v9" /><path d="M8 17l4 4 4-4" /></svg>}
                    label="Import Content"
                    href="/migration"
                />
            </nav>

            {/* Create Button */}
            <button
                onClick={onOpenCreate}
                className="w-full bg-white text-gray-950 font-semibold py-3 rounded-xl hover:bg-gray-100 transition-colors duration-200 flex items-center justify-center gap-2"
            >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M8 2v12M2 8h12" strokeLinecap="round" />
                </svg>
                Create
            </button>

            {/* User */}
            <div className="flex items-center gap-3 px-2 py-4 mt-4 border-t border-gray-900">
                <div className="w-10 h-10 rounded-full overflow-hidden relative">
                    <Image
                        src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face"
                        alt="Profile"
                        fill
                        className="object-cover"
                    />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold truncate">Abu Jawad</p>
                    <p className="text-[12px] text-gray-500 truncate">@abujawad</p>
                </div>
            </div>
        </aside>
    );
}

// Create Post Modal
function CreatePostModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [caption, setCaption] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    const handleFile = (selectedFile: File) => {
        if (!selectedFile.type.startsWith('image/') && !selectedFile.type.startsWith('video/')) {
            alert('Please select an image or video file');
            return;
        }
        setFile(selectedFile);
        setPreview(URL.createObjectURL(selectedFile));
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files?.[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handlePost = async () => {
        if (!file) return;
        setIsPosting(true);
        // Simulate posting
        await new Promise(r => setTimeout(r, 1500));
        setIsPosting(false);
        setFile(null);
        setPreview(null);
        setCaption('');
        onClose();
        // In production, this would call the API
    };

    const resetAndClose = () => {
        setFile(null);
        setPreview(null);
        setCaption('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80" onClick={resetAndClose} />

            {/* Modal */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-gray-900 rounded-2xl w-full max-w-lg overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                    <button onClick={resetAndClose} className="text-gray-400 hover:text-white">
                        Cancel
                    </button>
                    <span className="font-semibold">Create new stop</span>
                    <button
                        onClick={handlePost}
                        disabled={!file || isPosting}
                        className="text-blue-500 font-semibold disabled:opacity-50"
                    >
                        {isPosting ? 'Posting...' : 'Share'}
                    </button>
                </div>

                {/* Content */}
                {!preview ? (
                    <div
                        className={`p-8 ${dragActive ? 'bg-gray-800' : ''}`}
                        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                        onDragLeave={() => setDragActive(false)}
                        onDrop={handleDrop}
                    >
                        <div className="flex flex-col items-center justify-center min-h-[300px] border-2 border-dashed border-gray-700 rounded-xl">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500 mb-4">
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <path d="M21 15l-5-5L5 21" />
                            </svg>
                            <p className="text-gray-400 mb-4">Drag photos or videos here</p>
                            <label className="bg-blue-500 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-600 transition-colors">
                                Select from computer
                                <input
                                    type="file"
                                    accept="image/*,video/*"
                                    className="hidden"
                                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                                />
                            </label>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col">
                        {/* Preview */}
                        <div className="relative aspect-square bg-black">
                            {file?.type.startsWith('video/') ? (
                                <video src={preview} className="w-full h-full object-contain" controls />
                            ) : (
                                <img src={preview} alt="Preview" className="w-full h-full object-contain" />
                            )}
                            <button
                                onClick={() => { setFile(null); setPreview(null); }}
                                className="absolute top-3 right-3 bg-gray-900/80 p-2 rounded-full hover:bg-gray-800"
                            >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
                                </svg>
                            </button>
                        </div>

                        {/* Caption */}
                        <div className="p-4 border-t border-gray-800">
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full overflow-hidden relative flex-shrink-0">
                                    <Image
                                        src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face"
                                        alt="You"
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                                <textarea
                                    value={caption}
                                    onChange={(e) => setCaption(e.target.value)}
                                    placeholder="Write a caption..."
                                    className="flex-1 bg-transparent resize-none text-[14px] placeholder:text-gray-500 focus:outline-none min-h-[80px]"
                                    maxLength={2200}
                                />
                            </div>
                            <div className="text-right text-[12px] text-gray-500 mt-2">
                                {caption.length}/2,200
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
}

// Right Sidebar - Messages & Activity
function RightSidebar() {
    const messages = [
        {
            name: 'Sarah Chen',
            avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
            message: 'The photos look amazing! 📸',
            time: '2m',
            unread: true
        },
        {
            name: 'Marcus Johnson',
            avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
            message: 'Thanks for sharing!',
            time: '15m',
            unread: true
        },
        {
            name: 'Family Group',
            avatar: 'https://images.unsplash.com/photo-1609220136736-443140cffec6?w=100&h=100&fit=crop',
            message: 'Mom: See you all Sunday!',
            time: '1h',
            unread: false
        },
        {
            name: 'Emily Park',
            avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
            message: 'That looks delicious!',
            time: '3h',
            unread: false
        },
    ];

    return (
        <aside className="fixed right-0 top-0 bottom-0 w-80 bg-gray-950 border-l border-gray-900 p-4 overflow-y-auto">
            {/* Messages Header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-[16px] font-semibold">Messages</h2>
                <button className="text-gray-400 hover:text-white p-1">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M17 3l-5 5H7l-5 5v-8a2 2 0 012-2h11a2 2 0 012 2v0zM3 17l5-5h5l5-5v8a2 2 0 01-2 2H5a2 2 0 01-2-2v0z" />
                    </svg>
                </button>
            </div>

            {/* Message List */}
            <div className="space-y-1 mb-6">
                {messages.map((msg, i) => (
                    <MessagePreview key={i} {...msg} />
                ))}
            </div>

            {/* Activity */}
            <div className="border-t border-gray-900 pt-4">
                <h2 className="text-[16px] font-semibold mb-4">Activity</h2>
                <div className="space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden relative flex-shrink-0">
                            <Image
                                src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop&crop=face"
                                alt="Jordan"
                                fill
                                className="object-cover"
                            />
                        </div>
                        <div>
                            <p className="text-[13px]"><span className="font-semibold">Jordan Lee</span> liked your photo</p>
                            <span className="text-[12px] text-gray-500">2h</span>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden relative flex-shrink-0">
                            <Image
                                src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=face"
                                alt="Alex"
                                fill
                                className="object-cover"
                            />
                        </div>
                        <div>
                            <p className="text-[13px]"><span className="font-semibold">Alex Rivera</span> started following you</p>
                            <span className="text-[12px] text-gray-500">5h</span>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden relative flex-shrink-0">
                            <Image
                                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face"
                                alt="Casey"
                                fill
                                className="object-cover"
                            />
                        </div>
                        <div>
                            <p className="text-[13px]"><span className="font-semibold">Casey</span> commented: &ldquo;Beautiful!&rdquo;</p>
                            <span className="text-[12px] text-gray-500">1d</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Suggested People */}
            <div className="border-t border-gray-900 pt-4 mt-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[14px] text-gray-500">Suggested for you</h2>
                    <button className="text-[13px] font-semibold hover:text-gray-300">See All</button>
                </div>
                <div className="space-y-3">
                    {[
                        { name: 'Omar Hassan', username: 'omarh', mutual: 3, avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face' },
                        { name: 'Fatima Ali', username: 'fatimaa', mutual: 5, avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&h=100&fit=crop&crop=face' },
                    ].map((person, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden relative">
                                <Image src={person.avatar} alt={person.name} fill className="object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[14px] font-semibold truncate">{person.name}</p>
                                <p className="text-[12px] text-gray-500 truncate">{person.mutual} mutual friends</p>
                            </div>
                            <button className="text-[13px] font-semibold text-blue-500 hover:text-blue-400">Follow</button>
                        </div>
                    ))}
                </div>
            </div>
        </aside>
    );
}

// Main Dashboard
export default function DashboardPage() {
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Real Unsplash images for stories
    const stories = [
        { name: 'Your story', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face', isYou: true },
        { name: 'Sarah', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face', hasUnread: true },
        { name: 'Marcus', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face', hasUnread: true },
        { name: 'Emily', image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face', hasUnread: true },
        { name: 'Jordan', image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=face', hasUnread: false },
        { name: 'Alex', image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&crop=face', hasUnread: false },
        { name: 'Casey', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face', hasUnread: false },
    ];

    // Real Unsplash images for posts - beautiful real photography
    const posts = [
        {
            author: 'Sarah Chen',
            username: 'sarahc',
            avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
            image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=800&fit=crop',
            caption: 'Found this magical spot during our road trip ✨ The sunset was absolutely breathtaking. Nature never disappoints! 🌅 #travel #wanderlust',
            time: '2h',
            likes: 1247,
            comments: [
                { author: 'marcus_j', text: 'Wow, where is this? 😍' },
                { author: 'emily_p', text: 'So beautiful!' },
                { author: 'jordan_l', text: 'Adding this to my bucket list' },
            ],
        },
        {
            author: 'Emily Park',
            username: 'emilyp',
            avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
            image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=800&fit=crop',
            caption: 'Sunday brunch is a whole mood 🥑🍳 Homemade everything! Recipe coming soon 👆',
            time: '5h',
            likes: 892,
            comments: [
                { author: 'sarahc', text: 'Need that recipe!' },
                { author: 'alex_r', text: 'This looks incredible 🤤' },
            ],
        },
        {
            author: 'Marcus Johnson',
            username: 'marcusj',
            avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
            image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=800&fit=crop',
            caption: 'Family time is the best time 👨‍👩‍👧‍👦❤️ Grateful for these moments. Weekend vibes!',
            time: '8h',
            likes: 2150,
            comments: [
                { author: 'emilyp', text: 'Love this! Beautiful fam 🥰' },
                { author: 'jordan_l', text: 'Wholesome content ❤️' },
                { author: 'sarahc', text: 'The kids are getting so big!' },
                { author: 'casey_s', text: 'Best crew ever!' },
            ],
        },
        {
            author: 'Jordan Lee',
            username: 'jordanl',
            avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop&crop=face',
            image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=800&fit=crop',
            caption: 'Early morning hike was worth every step 🏔️ The peace up here is unmatched. #hiking #nature #adventure',
            time: '12h',
            likes: 3421,
            comments: [
                { author: 'sarahc', text: 'This is stunning! Which trail?' },
                { author: 'marcus_j', text: 'Nature therapy 🌲' },
            ],
        },
    ];

    return (
        <div className="min-h-screen bg-gray-950">
            {/* Sidebars - hidden on mobile */}
            <div className="hidden lg:block">
                <Sidebar onOpenCreate={() => setShowCreateModal(true)} />
            </div>
            <div className="hidden xl:block">
                <RightSidebar />
            </div>
            <CreatePostModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />

            {/* Main Feed - responsive margins */}
            <main className="lg:ml-64 xl:mr-80 pb-20 lg:pb-0">
                <div className="max-w-[470px] mx-auto py-4 lg:py-6 px-4 lg:px-0">
                    {/* Mobile Header */}
                    <div className="lg:hidden flex items-center justify-between mb-4">
                        <Link href="/" className="text-xl font-semibold tracking-[-0.02em]">Caravan</Link>
                        <div className="flex items-center gap-4">
                            <button onClick={() => setShowCreateModal(true)} className="text-white">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                    <path d="M12 8v8M8 12h8" strokeLinecap="round" />
                                </svg>
                            </button>
                            <Link href="/messages" className="text-white relative">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />
                                </svg>
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center">3</span>
                            </Link>
                        </div>
                    </div>

                    {/* Stories */}
                    <div className="flex items-center gap-3 overflow-x-auto pb-4 mb-4 border-b border-gray-900 scrollbar-hide">
                        {stories.map((story, i) => (
                            <StoryBubble key={i} {...story} />
                        ))}
                    </div>

                    {/* Feed Posts */}
                    <div className="space-y-0">
                        {posts.map((post, i) => (
                            <FeedPost key={post.username + i} {...post} delay={i * 0.1} />
                        ))}
                    </div>

                    {/* End of feed */}
                    <div className="py-10 text-center">
                        <p className="text-[14px] text-gray-500">You&apos;re all caught up!</p>
                        <p className="text-[13px] text-gray-600 mt-1">You&apos;ve seen all new posts from the last 3 days</p>
                    </div>
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-gray-950 border-t border-gray-900 z-40">
                <div className="flex items-center justify-around py-3">
                    <Link href="/dashboard" className="text-white p-2">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 9.5L12 3l9 6.5V21a1 1 0 01-1 1h-5v-7h-6v7H4a1 1 0 01-1-1V9.5z" />
                        </svg>
                    </Link>
                    <Link href="/explore" className="text-gray-500 p-2">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" />
                        </svg>
                    </Link>
                    <button onClick={() => setShowCreateModal(true)} className="bg-white text-gray-950 w-10 h-10 rounded-full flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M10 4v12M4 10h12" strokeLinecap="round" />
                        </svg>
                    </button>
                    <Link href="/notifications" className="text-gray-500 p-2 relative">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
                        </svg>
                        <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
                    </Link>
                    <Link href="/profile" className="p-2">
                        <div className="w-6 h-6 rounded-full overflow-hidden relative">
                            <Image
                                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face"
                                alt="Profile"
                                fill
                                className="object-cover"
                            />
                        </div>
                    </Link>
                </div>
            </nav>
        </div>
    );
}

