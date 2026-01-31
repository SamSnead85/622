'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

// ============================================
// TYPES
// ============================================
interface Game {
    id: string;
    name: string;
    icon: string;
    description: string;
    players: string;
    category: 'strategy' | 'party' | 'trivia' | 'creative';
    color: string;
    gradient: string;
}

interface ActiveRoom {
    id: string;
    gameId: string;
    gameName: string;
    gameIcon: string;
    hostAvatar: string;
    hostName: string;
    players: number;
    maxPlayers: number;
}

interface OnlineFriend {
    id: string;
    name: string;
    avatar: string;
    status: 'online' | 'in-game' | 'idle';
    currentGame?: string;
}

// ============================================
// GAME CATALOG
// ============================================
const GAMES: Game[] = [
    {
        id: 'tic-tac-toe',
        name: 'Tic Tac Toe',
        icon: '⭕',
        description: 'Classic 3x3 strategy game',
        players: '2 players',
        category: 'strategy',
        color: 'from-violet-500 to-purple-600',
        gradient: 'bg-gradient-to-br from-violet-500/20 to-purple-600/20',
    },
    {
        id: 'connect-four',
        name: 'Connect Four',
        icon: '🔴',
        description: 'Drop discs, connect 4 to win',
        players: '2 players',
        category: 'strategy',
        color: 'from-red-500 to-orange-500',
        gradient: 'bg-gradient-to-br from-red-500/20 to-orange-500/20',
    },
    {
        id: 'drawing-guess',
        name: 'Draw & Guess',
        icon: '🎨',
        description: 'Draw pictures, guess words',
        players: '3-8 players',
        category: 'creative',
        color: 'from-pink-500 to-rose-500',
        gradient: 'bg-gradient-to-br from-pink-500/20 to-rose-500/20',
    },
    {
        id: 'trivia-quiz',
        name: 'Trivia Night',
        icon: '🧠',
        description: 'Test your knowledge',
        players: '2-10 players',
        category: 'trivia',
        color: 'from-cyan-500 to-blue-500',
        gradient: 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20',
    },
    {
        id: 'memory-match',
        name: 'Memory Match',
        icon: '🃏',
        description: 'Find matching pairs',
        players: '2-4 players',
        category: 'party',
        color: 'from-green-500 to-emerald-500',
        gradient: 'bg-gradient-to-br from-green-500/20 to-emerald-500/20',
    },
    {
        id: 'word-chain',
        name: 'Word Chain',
        icon: '🔤',
        description: 'Quick word association',
        players: '2-6 players',
        category: 'party',
        color: 'from-amber-500 to-yellow-500',
        gradient: 'bg-gradient-to-br from-amber-500/20 to-yellow-500/20',
    },
    {
        id: 'chess',
        name: 'Chess',
        icon: '♟️',
        description: 'The ultimate strategy game',
        players: '2 players',
        category: 'strategy',
        color: 'from-slate-600 to-slate-800',
        gradient: 'bg-gradient-to-br from-slate-600/20 to-slate-800/20',
    },
    {
        id: 'emoji-quiz',
        name: 'Emoji Quiz',
        icon: '😎',
        description: 'Guess from emoji clues',
        players: '2-8 players',
        category: 'trivia',
        color: 'from-yellow-400 to-orange-500',
        gradient: 'bg-gradient-to-br from-yellow-400/20 to-orange-500/20',
    },
];

// Mock data
const MOCK_ACTIVE_ROOMS: ActiveRoom[] = [
    {
        id: 'room1',
        gameId: 'trivia-quiz',
        gameName: 'Trivia Night',
        gameIcon: '🧠',
        hostAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
        hostName: 'Sarah',
        players: 4,
        maxPlayers: 10,
    },
    {
        id: 'room2',
        gameId: 'drawing-guess',
        gameName: 'Draw & Guess',
        gameIcon: '🎨',
        hostAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
        hostName: 'Marcus',
        players: 5,
        maxPlayers: 8,
    },
];

const MOCK_ONLINE_FRIENDS: OnlineFriend[] = [
    { id: '1', name: 'Sarah Chen', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face', status: 'in-game', currentGame: 'Trivia Night' },
    { id: '2', name: 'Marcus J', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face', status: 'online' },
    { id: '3', name: 'Emily Park', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face', status: 'online' },
    { id: '4', name: 'Jordan Lee', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop&crop=face', status: 'idle' },
];

// ============================================
// GAME CARD
// ============================================
function GameCard({ game, onSelect }: { game: Game; onSelect: () => void }) {
    return (
        <motion.button
            onClick={onSelect}
            className={`relative overflow-hidden rounded-3xl ${game.gradient} border border-white/10 p-5 text-left transition-all hover:border-white/20 hover:scale-[1.02] group`}
            whileTap={{ scale: 0.98 }}
        >
            {/* Glow effect */}
            <div className={`absolute inset-0 bg-gradient-to-br ${game.color} opacity-0 group-hover:opacity-20 transition-opacity blur-xl`} />

            <div className="relative z-10">
                <span className="text-4xl mb-3 block">{game.icon}</span>
                <h3 className="font-bold text-white text-lg mb-1">{game.name}</h3>
                <p className="text-white/60 text-sm mb-3">{game.description}</p>
                <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded-full bg-white/10 text-xs text-white/70">
                        {game.players}
                    </span>
                    <span className="px-2 py-1 rounded-full bg-white/10 text-xs text-white/70 capitalize">
                        {game.category}
                    </span>
                </div>
            </div>
        </motion.button>
    );
}

// ============================================
// ACTIVE ROOM CARD
// ============================================
function ActiveRoomCard({ room }: { room: ActiveRoom }) {
    return (
        <Link href={`/games/${room.gameId}?room=${room.id}`}>
            <motion.div
                className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all cursor-pointer"
                whileHover={{ x: 4 }}
            >
                <span className="text-3xl">{room.gameIcon}</span>
                <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-white truncate">{room.gameName}</h4>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="w-5 h-5 rounded-full overflow-hidden relative">
                            <Image src={room.hostAvatar} alt={room.hostName} fill className="object-cover" />
                        </div>
                        <span className="text-xs text-white/50">{room.hostName}&apos;s room</span>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-white/80 font-medium">{room.players}/{room.maxPlayers}</span>
                    <p className="text-xs text-green-400">Join</p>
                </div>
            </motion.div>
        </Link>
    );
}

// ============================================
// FRIEND ROW
// ============================================
function FriendRow({ friend, onInvite }: { friend: OnlineFriend; onInvite: () => void }) {
    const statusColors = {
        online: 'bg-green-500',
        'in-game': 'bg-violet-500',
        idle: 'bg-yellow-500',
    };

    return (
        <div className="flex items-center gap-3 py-2">
            <div className="relative">
                <div className="w-10 h-10 rounded-full overflow-hidden relative">
                    <Image src={friend.avatar} alt={friend.name} fill className="object-cover" />
                </div>
                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ${statusColors[friend.status]} ring-2 ring-[#0a0a0f]`} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm truncate">{friend.name}</p>
                <p className="text-xs text-white/50 truncate">
                    {friend.status === 'in-game' ? `Playing ${friend.currentGame}` : friend.status}
                </p>
            </div>
            <button
                onClick={onInvite}
                className="px-3 py-1.5 rounded-full bg-white/10 text-xs text-white/80 hover:bg-white/20 transition-colors"
            >
                Invite
            </button>
        </div>
    );
}

// ============================================
// GAME INVITE MODAL
// ============================================
function GameInviteModal({
    game,
    isOpen,
    onClose,
}: {
    game: Game | null;
    isOpen: boolean;
    onClose: () => void;
}) {
    const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
    const [sending, setSending] = useState(false);

    if (!isOpen || !game) return null;

    const toggleFriend = (id: string) => {
        setSelectedFriends(prev =>
            prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
        );
    };

    const sendInvites = async () => {
        setSending(true);
        await new Promise(r => setTimeout(r, 1000));
        setSending(false);
        onClose();
    };

    return (
        <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            <motion.div
                className="relative w-full max-w-md bg-[#0a0a0f] rounded-3xl border border-white/10 overflow-hidden"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
            >
                {/* Header */}
                <div className={`p-6 bg-gradient-to-r ${game.color}`}>
                    <div className="flex items-center gap-4">
                        <span className="text-5xl">{game.icon}</span>
                        <div>
                            <h2 className="text-2xl font-bold text-white">{game.name}</h2>
                            <p className="text-white/80">{game.players}</p>
                        </div>
                    </div>
                </div>

                {/* Friend Selection */}
                <div className="p-4">
                    <h3 className="text-sm font-medium text-white/70 mb-3">Invite Friends</h3>
                    <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                        {MOCK_ONLINE_FRIENDS.map(friend => (
                            <button
                                key={friend.id}
                                onClick={() => toggleFriend(friend.id)}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${selectedFriends.includes(friend.id)
                                        ? 'bg-white/10 ring-2 ring-violet-500'
                                        : 'bg-white/5 hover:bg-white/10'
                                    }`}
                            >
                                <div className="w-10 h-10 rounded-full overflow-hidden relative">
                                    <Image src={friend.avatar} alt={friend.name} fill className="object-cover" />
                                </div>
                                <span className="text-white font-medium">{friend.name}</span>
                                {selectedFriends.includes(friend.id) && (
                                    <span className="ml-auto text-violet-400">✓</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="p-4 border-t border-white/10 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/15 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={sendInvites}
                        disabled={selectedFriends.length === 0 || sending}
                        className={`flex-1 py-3 rounded-xl bg-gradient-to-r ${game.color} text-white font-medium disabled:opacity-50 transition-all`}
                    >
                        {sending ? 'Sending...' : `Start Game ${selectedFriends.length > 0 ? `(${selectedFriends.length})` : ''}`}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ============================================
// MAIN GAMING HUB
// ============================================
export function GamingHub() {
    const [mounted, setMounted] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedGame, setSelectedGame] = useState<Game | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="min-h-screen bg-[#050508] flex items-center justify-center">
                <div className="w-10 h-10 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
            </div>
        );
    }

    const categories = ['all', 'strategy', 'party', 'trivia', 'creative'];
    const filteredGames = selectedCategory === 'all'
        ? GAMES
        : GAMES.filter(g => g.category === selectedCategory);

    return (
        <div className="min-h-screen bg-[#050508]">
            {/* Hero Section */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-violet-500/10 via-transparent to-transparent" />
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-[100px]" />
                <div className="absolute top-20 right-1/4 w-80 h-80 bg-cyan-500/20 rounded-full blur-[100px]" />

                <div className="relative z-10 px-4 py-12 md:py-20 text-center">
                    <motion.h1
                        className="text-4xl md:text-6xl font-bold text-white mb-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        🎮 Game Zone
                    </motion.h1>
                    <motion.p
                        className="text-lg text-white/60 max-w-md mx-auto"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        Play games with friends. Challenge anyone. Have fun together!
                    </motion.p>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 pb-24">
                {/* Quick Actions */}
                <div className="flex gap-3 mb-8 overflow-x-auto scrollbar-hide pb-2">
                    <motion.button
                        className="flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold whitespace-nowrap"
                        whileTap={{ scale: 0.95 }}
                    >
                        <span>🎲</span> Random Game
                    </motion.button>
                    <motion.button
                        className="flex items-center gap-2 px-5 py-3 rounded-full bg-white/10 text-white font-medium whitespace-nowrap hover:bg-white/15 transition-colors"
                        whileTap={{ scale: 0.95 }}
                    >
                        <span>⚡</span> Quick Match
                    </motion.button>
                    <motion.button
                        className="flex items-center gap-2 px-5 py-3 rounded-full bg-white/10 text-white font-medium whitespace-nowrap hover:bg-white/15 transition-colors"
                        whileTap={{ scale: 0.95 }}
                    >
                        <span>🏆</span> Tournaments
                    </motion.button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Games Section */}
                    <div className="lg:col-span-2">
                        {/* Category Filter */}
                        <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-2">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-all ${selectedCategory === cat
                                            ? 'bg-white text-black'
                                            : 'bg-white/10 text-white/70 hover:bg-white/15'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* Games Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {filteredGames.map((game, i) => (
                                <motion.div
                                    key={game.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                >
                                    <GameCard game={game} onSelect={() => setSelectedGame(game)} />
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Active Rooms */}
                        <div className="bg-white/5 rounded-3xl border border-white/10 p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-white">Active Rooms</h3>
                                <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                                    {MOCK_ACTIVE_ROOMS.length} live
                                </span>
                            </div>
                            <div className="space-y-3">
                                {MOCK_ACTIVE_ROOMS.map(room => (
                                    <ActiveRoomCard key={room.id} room={room} />
                                ))}
                            </div>
                        </div>

                        {/* Online Friends */}
                        <div className="bg-white/5 rounded-3xl border border-white/10 p-5">
                            <h3 className="font-semibold text-white mb-4">Friends Online</h3>
                            <div className="space-y-1">
                                {MOCK_ONLINE_FRIENDS.map(friend => (
                                    <FriendRow
                                        key={friend.id}
                                        friend={friend}
                                        onInvite={() => setSelectedGame(GAMES[0])}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Game Invite Modal */}
            <AnimatePresence>
                {selectedGame && (
                    <GameInviteModal
                        game={selectedGame}
                        isOpen={!!selectedGame}
                        onClose={() => setSelectedGame(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

export default GamingHub;
