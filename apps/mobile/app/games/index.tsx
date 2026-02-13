// ============================================
// 0G Arena — Games Hub (Enhanced)
// Animated hero, better cards, stats, quick play
// ============================================

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Pressable,
    Dimensions,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    FadeInDown,
    FadeInUp,
    FadeIn,
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withRepeat,
    withSequence,
    withSpring,
    withDelay,
    Easing,
    interpolateColor,
    interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing } from '@zerog/ui';
import { ScreenHeader } from '../../components';
import { GlassCard } from '../../components';
import { useGameStore, useAuthStore } from '../../stores';
import { showError } from '../../stores/toastStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = spacing.md;
const CARD_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - CARD_GAP) / 2;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

const RECENTLY_PLAYED_KEY = '@recently-played-games';
const ACHIEVEMENTS_KEY = '@game-achievements';

// ============================================
// Achievements
// ============================================

interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    requirement: number;
}

const ACHIEVEMENTS: Achievement[] = [
    { id: 'first-win', title: 'First Victory', description: 'Win your first game', icon: 'trophy', color: colors.gold[500], requirement: 1 },
    { id: 'streak-3', title: 'On Fire', description: '3 game win streak', icon: 'flame', color: colors.coral[500], requirement: 3 },
    { id: 'games-10', title: 'Dedicated Player', description: 'Play 10 games', icon: 'game-controller', color: colors.azure[500], requirement: 10 },
    { id: 'perfect-score', title: 'Perfectionist', description: 'Get a perfect score', icon: 'star', color: colors.amber[500], requirement: 1 },
    { id: 'social-5', title: 'Social Gamer', description: 'Play 5 multiplayer games', icon: 'people', color: colors.emerald[500], requirement: 5 },
    { id: 'daily-7', title: 'Week Warrior', description: '7-day daily challenge streak', icon: 'calendar', color: colors.gold[400], requirement: 7 },
];

type AchievementProgress = Record<string, number>;

async function getAchievementProgress(): Promise<AchievementProgress> {
    try {
        const data = await AsyncStorage.getItem(ACHIEVEMENTS_KEY);
        if (data) return JSON.parse(data);
    } catch { /* non-critical */ }
    return {};
}

// ============================================
// Achievements Section
// ============================================

function AchievementsSection() {
    const [progress, setProgress] = useState<AchievementProgress>({});

    useEffect(() => {
        getAchievementProgress().then(setProgress).catch(() => {});
    }, []);

    return (
        <Animated.View entering={FadeInDown.delay(95).duration(500)} style={styles.achievementsSection}>
            <View style={styles.achievementsHeader}>
                <Ionicons name="ribbon-outline" size={16} color={colors.gold[400]} />
                <Text style={styles.achievementsTitle}>Achievements</Text>
            </View>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.achievementsScroll}
            >
                {ACHIEVEMENTS.map((ach, index) => {
                    const current = progress[ach.id] || 0;
                    const unlocked = current >= ach.requirement;
                    return (
                        <Animated.View
                            key={ach.id}
                            entering={FadeInDown.delay(110 + index * 60).duration(400).springify()}
                        >
                            <GlassCard
                                style={[
                                    styles.achievementCard,
                                    unlocked && { borderColor: ach.color + '40', shadowColor: ach.color, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
                                ]}
                                padding="sm"
                            >
                                <View
                                    style={[
                                        styles.achievementIconCircle,
                                        {
                                            backgroundColor: unlocked ? ach.color + '20' : colors.obsidian[700],
                                            borderColor: unlocked ? ach.color + '40' : colors.border.subtle,
                                        },
                                    ]}
                                >
                                    <Ionicons
                                        name={ach.icon}
                                        size={22}
                                        color={unlocked ? ach.color : colors.text.muted}
                                    />
                                </View>
                                <Text
                                    style={[
                                        styles.achievementName,
                                        unlocked && { color: ach.color },
                                    ]}
                                    numberOfLines={1}
                                >
                                    {ach.title}
                                </Text>
                                <Text style={styles.achievementProgress}>
                                    {Math.min(current, ach.requirement)}/{ach.requirement}
                                </Text>
                            </GlassCard>
                        </Animated.View>
                    );
                })}
            </ScrollView>
        </Animated.View>
    );
}

// ============================================
// Game Definitions
// ============================================

type GameCategory = 'party' | 'brain' | 'strategy' | 'solo';

interface GameDef {
    type: string;
    name: string;
    icon: keyof typeof Ionicons.glyphMap;
    desc: string;
    players: string;
    color: string;
    isNew: boolean;
    category: GameCategory;
    isSolo?: boolean;
}

const GAME_CATEGORIES: { key: GameCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'party', label: 'Party', icon: 'people' },
    { key: 'brain', label: 'Brain', icon: 'bulb' },
    { key: 'strategy', label: 'Strategy', icon: 'extension-puzzle' },
    { key: 'solo', label: 'Solo', icon: 'person' },
];

const games: GameDef[] = [
    // Party Games — fun, loud, group play
    { type: 'emoji-charades', name: 'Emoji Charades', icon: 'happy' as const, desc: 'Describe with emojis, guess the phrase!', players: '3-8', color: colors.amber[500], isNew: true, category: 'party' },
    { type: 'predict', name: 'Predict', icon: 'people' as const, desc: 'Guess what others think', players: '3-8', color: colors.azure[500], isNew: false, category: 'party' },
    { type: 'wavelength', name: 'Wavelength', icon: 'radio' as const, desc: 'Read minds on a spectrum', players: '2-8', color: colors.emerald[500], isNew: false, category: 'party' },
    { type: 'infiltrator', name: 'Infiltrator', icon: 'eye-off' as const, desc: 'Find the hidden spy', players: '4-8', color: colors.coral[500], isNew: false, category: 'party' },

    // Brain Games — quick thinking, reflexes
    { type: 'trivia', name: 'Rapid Fire', icon: 'flash' as const, desc: 'Fast-paced trivia blitz', players: '2-8', color: colors.amber[500], isNew: false, category: 'brain' },
    { type: 'speed-match', name: 'Speed Match', icon: 'speedometer' as const, desc: 'Color Rush, Memory, Math — how fast are you?', players: '1-2', color: colors.coral[500], isNew: true, category: 'brain' },
    { type: 'word-blitz', name: 'Word Blitz', icon: 'text' as const, desc: 'Daily word puzzle + race mode', players: '1-2', color: colors.emerald[500], isNew: true, category: 'brain' },

    // Strategy Games — deeper thinking
    { type: 'cipher', name: 'Cipher', icon: 'grid' as const, desc: 'Strategic word deduction', players: '4-8', color: colors.gold[500], isNew: false, category: 'strategy' },

    // Solo Games — play anytime
    { type: 'daily', name: 'Daily Challenge', icon: 'calendar' as const, desc: '7 trivia questions, new every day', players: '1', color: colors.gold[500], isNew: false, category: 'solo', isSolo: true },
    { type: 'practice', name: 'Solo Practice', icon: 'school' as const, desc: 'Unlimited trivia by topic', players: '1', color: colors.azure[500], isNew: false, category: 'solo', isSolo: true },
];

// ============================================
// Recently Played Helper
// ============================================

async function getRecentlyPlayed(): Promise<string[]> {
    try {
        const data = await AsyncStorage.getItem(RECENTLY_PLAYED_KEY);
        if (data) return JSON.parse(data);
    } catch { /* non-critical */ }
    return [];
}

async function trackRecentlyPlayed(gameType: string): Promise<void> {
    try {
        const existing = await getRecentlyPlayed();
        const updated = [gameType, ...existing.filter(t => t !== gameType)].slice(0, 5);
        await AsyncStorage.setItem(RECENTLY_PLAYED_KEY, JSON.stringify(updated));
    } catch { /* non-critical */ }
}

// ============================================
// Recently Played Section
// ============================================

function RecentlyPlayedSection({ onPlay }: { onPlay: (type: string) => void }) {
    const [recentTypes, setRecentTypes] = useState<string[]>([]);

    useEffect(() => {
        getRecentlyPlayed().then(setRecentTypes).catch(() => {});
    }, []);

    const recentGames = useMemo(
        () => recentTypes.map(t => games.find(g => g.type === t)).filter(Boolean) as GameDef[],
        [recentTypes],
    );

    if (recentGames.length === 0) return null;

    return (
        <Animated.View entering={FadeInDown.delay(90).duration(500)} style={styles.recentSection}>
            <View style={styles.recentHeader}>
                <Ionicons name="time-outline" size={16} color={colors.gold[400]} />
                <Text style={styles.recentTitle}>Recently Played</Text>
            </View>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recentScroll}
            >
                {recentGames.map((game, index) => (
                    <Animated.View
                        key={game.type}
                        entering={FadeInDown.delay(100 + index * 60).duration(400).springify()}
                    >
                        <TouchableOpacity
                            style={styles.recentCard}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                onPlay(game.type);
                            }}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel={`Play ${game.name} again`}
                        >
                            <LinearGradient
                                colors={[game.color + '20', game.color + '08']}
                                style={styles.recentCardBg}
                            />
                            <View style={[styles.recentIconBg, { backgroundColor: game.color + '20' }]}>
                                <Ionicons name={game.icon} size={20} color={game.color} />
                            </View>
                            <Text style={styles.recentCardName} numberOfLines={1}>{game.name}</Text>
                            <View style={styles.recentPlayBadge}>
                                <Ionicons name="play" size={10} color={colors.gold[500]} />
                            </View>
                        </TouchableOpacity>
                    </Animated.View>
                ))}
            </ScrollView>
        </Animated.View>
    );
}

// ============================================
// Animated NEW Badge
// ============================================

function NewBadge() {
    const pulse = useSharedValue(0);

    useEffect(() => {
        pulse.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
                withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
            ),
            -1,
            false,
        );
    }, [pulse]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: interpolate(pulse.value, [0, 1], [0.85, 1]),
        transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.08]) }],
    }));

    return (
        <Animated.View style={[styles.newBadge, animatedStyle]}>
            <LinearGradient
                colors={[colors.coral[500], colors.coral[400]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.newBadgeGradient}
            >
                <Text style={styles.newBadgeText}>NEW</Text>
            </LinearGradient>
        </Animated.View>
    );
}

// ============================================
// Animated Input Border
// ============================================

function AnimatedCodeInput({
    value,
    onChangeText,
    onSubmitEditing,
    inputRef,
}: {
    value: string;
    onChangeText: (text: string) => void;
    onSubmitEditing: () => void;
    inputRef: React.RefObject<TextInput | null>;
}) {
    const borderProgress = useSharedValue(0);
    const isFocused = useSharedValue(0);

    useEffect(() => {
        borderProgress.value = withRepeat(
            withTiming(1, { duration: 3000, easing: Easing.linear }),
            -1,
            false,
        );
    }, [borderProgress]);

    const handleFocus = useCallback(() => {
        isFocused.value = withTiming(1, { duration: 300 });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, [isFocused]);

    const handleBlur = useCallback(() => {
        isFocused.value = withTiming(0, { duration: 300 });
    }, [isFocused]);

    const animatedBorderStyle = useAnimatedStyle(() => {
        const borderColor = interpolateColor(
            isFocused.value,
            [0, 1],
            [colors.border.subtle, colors.gold[500] + '80'],
        );
        return {
            borderColor,
            borderWidth: interpolate(isFocused.value, [0, 1], [1, 1.5]),
        };
    });

    return (
        <Animated.View style={[styles.codeInputContainer, animatedBorderStyle]}>
            <Ionicons name="keypad-outline" size={18} color={colors.text.muted} />
            <TextInput
                ref={inputRef}
                style={styles.codeInput}
                placeholder="ROOM CODE"
                placeholderTextColor={colors.text.muted}
                value={value}
                onChangeText={(text) => onChangeText(text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                maxLength={6}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={onSubmitEditing}
                onFocus={handleFocus}
                onBlur={handleBlur}
                accessibilityLabel="Room code input"
            />
            {value.length > 0 && (
                <View style={styles.codeCountBadge}>
                    <Text style={styles.codeCountText}>{value.length}/6</Text>
                </View>
            )}
        </Animated.View>
    );
}

// ============================================
// Enhanced Game Card
// ============================================

interface GameCardProps {
    game: typeof games[number];
    index: number;
    onPlay: (type: string) => void;
}

function GameCard({ game, index, onPlay }: GameCardProps) {
    const scale = useSharedValue(1);
    const glowOpacity = useSharedValue(0);

    useEffect(() => {
        glowOpacity.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
                withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
            ),
            -1,
            false,
        );
    }, [glowOpacity]);

    const handlePressIn = useCallback(() => {
        scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
    }, [scale]);

    const handlePressOut = useCallback(() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 200 });
    }, [scale]);

    const handlePlay = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPlay(game.type);
    }, [game.type, onPlay]);

    const animatedCardStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const glowStyle = useAnimatedStyle(() => ({
        opacity: interpolate(glowOpacity.value, [0, 1], [0.05, 0.15]),
    }));

    // Stagger columns: left column gets base delay, right column gets extra offset
    const column = index % 2;
    const row = Math.floor(index / 2);
    const staggerDelay = 200 + row * 120 + column * 60;

    return (
        <Animated.View
            entering={FadeInDown.delay(staggerDelay).duration(500).springify()}
            style={styles.cardWrapper}
        >
            <AnimatedPressable
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={handlePlay}
                style={animatedCardStyle}
                accessibilityRole="button"
                accessibilityLabel={`Play ${game.name}. ${game.players} players.`}
            >
                <GlassCard style={styles.gameCard} padding="md">
                    {/* Gradient accent strip */}
                    <LinearGradient
                        colors={[game.color, game.color + '00']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.cardAccentStrip}
                    />

                    {/* Animated corner glow */}
                    <Animated.View style={[styles.cardCornerGlow, { backgroundColor: game.color }, glowStyle]} />

                    {/* NEW badge */}
                    {game.isNew && <NewBadge />}

                    {/* Large icon */}
                    <View style={styles.cardIconContainer}>
                        <LinearGradient
                            colors={[game.color + '25', game.color + '08']}
                            style={styles.iconCircle}
                        >
                            <Ionicons name={game.icon} size={28} color={game.color} />
                        </LinearGradient>
                    </View>

                    <Text style={styles.cardName} numberOfLines={1}>{game.name}</Text>
                    <Text style={styles.cardDesc} numberOfLines={2}>{game.desc}</Text>

                    <View style={styles.cardFooter}>
                        <View style={styles.playerBadge}>
                            <Ionicons name="people-outline" size={12} color={colors.text.muted} />
                            <Text style={styles.playerText}>{game.players}</Text>
                        </View>

                        <View style={[styles.playButton, { backgroundColor: game.color + '20' }]}>
                            <Text style={[styles.playButtonText, { color: game.color }]}>Play</Text>
                            <Ionicons name="arrow-forward" size={14} color={game.color} />
                        </View>
                    </View>
                </GlassCard>
            </AnimatedPressable>
        </Animated.View>
    );
}

// ============================================
// Game Stats Helper
// ============================================

export async function updateGameStats(won: boolean) {
    try {
        const data = await AsyncStorage.getItem('@game-stats');
        let stats = { played: 0, wins: 0, streak: 0 };
        if (data) { try { stats = JSON.parse(data); } catch { /* corrupted, use defaults */ } }
        stats.played++;
        if (won) { stats.wins++; stats.streak++; } else { stats.streak = 0; }
        await AsyncStorage.setItem('@game-stats', JSON.stringify(stats));
    } catch { /* non-critical: stats tracking failure doesn't affect gameplay */ }
}

// ============================================
// Stats Section
// ============================================

function StatsSection() {
    const [gameStats, setGameStats] = useState({ played: 0, winRate: 0, streak: 0 });

    useEffect(() => {
        AsyncStorage.getItem('@game-stats').then(data => {
            if (data) {
                try {
                    const parsed = JSON.parse(data);
                    const winRate = parsed.played > 0 ? Math.round((parsed.wins / parsed.played) * 100) : 0;
                    setGameStats({ played: parsed.played || 0, winRate, streak: parsed.streak || 0 });
                } catch { /* corrupted stats, use defaults */ }
            }
        }).catch(() => {});
    }, []);

    const stats = [
        { label: 'Games Played', value: String(gameStats.played), icon: 'game-controller' as const, color: colors.azure[500] },
        { label: 'Win Rate', value: `${gameStats.winRate}%`, icon: 'trophy' as const, color: colors.gold[500] },
        { label: 'Streak', value: String(gameStats.streak), icon: 'flame' as const, color: colors.coral[500] },
    ];

    return (
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.statsSection}>
            <View style={styles.statsRow}>
                {stats.map((stat, index) => (
                    <Animated.View
                        key={stat.label}
                        entering={FadeInDown.delay(120 + index * 80).duration(400).springify()}
                        style={styles.statItem}
                    >
                        <GlassCard style={styles.statCard} padding="sm">
                            <View style={[styles.statIconBg, { backgroundColor: stat.color + '15' }]}>
                                <Ionicons name={stat.icon} size={16} color={stat.color} />
                            </View>
                            <Text style={styles.statValue}>{stat.value}</Text>
                            <Text style={styles.statLabel}>{stat.label}</Text>
                        </GlassCard>
                    </Animated.View>
                ))}
            </View>
        </Animated.View>
    );
}

// ============================================
// Quick Play Button
// ============================================

function QuickPlayButton({ onPress }: { onPress: () => void }) {
    const shimmer = useSharedValue(0);

    useEffect(() => {
        shimmer.value = withRepeat(
            withTiming(1, { duration: 2500, easing: Easing.linear }),
            -1,
            false,
        );
    }, [shimmer]);

    const animatedShimmer = useAnimatedStyle(() => ({
        opacity: interpolate(shimmer.value, [0, 0.5, 1], [0.7, 1, 0.7]),
    }));

    return (
        <Animated.View entering={FadeInDown.delay(80).duration(500)}>
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Quick Play — join a random game"
            >
                <Animated.View style={animatedShimmer}>
                    <LinearGradient
                        colors={[colors.gold[600], colors.gold[500], colors.gold[400]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.quickPlayGradient}
                    >
                        <View style={styles.quickPlayContent}>
                            <View style={styles.quickPlayLeft}>
                                <View style={styles.quickPlayIconCircle}>
                                    <Ionicons name="shuffle" size={22} color="#FFFFFF" />
                                </View>
                                <View>
                                    <Text style={styles.quickPlayTitle}>Quick Play</Text>
                                    <Text style={styles.quickPlaySubtitle}>Jump into a random game</Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                        </View>
                    </LinearGradient>
                </Animated.View>
            </TouchableOpacity>
        </Animated.View>
    );
}

// ============================================
// Hero Section
// ============================================

function HeroSection() {
    const float = useSharedValue(0);
    const livePulse = useSharedValue(0);

    useEffect(() => {
        float.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
                withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
            ),
            -1,
            false,
        );
        livePulse.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
            ),
            -1,
            false,
        );
    }, [float, livePulse]);

    const animatedFloat = useAnimatedStyle(() => ({
        transform: [{ translateY: interpolate(float.value, [0, 1], [0, -6]) }],
    }));

    const liveDotStyle = useAnimatedStyle(() => ({
        opacity: interpolate(livePulse.value, [0, 1], [0.4, 1]),
        transform: [{ scale: interpolate(livePulse.value, [0, 1], [1, 1.3]) }],
    }));

    return (
        <Animated.View
            entering={FadeInDown.delay(60).duration(600)}
            style={styles.heroSection}
        >
            {/* Background pattern dots */}
            <View style={styles.heroPatternContainer}>
                {Array.from({ length: 15 }).map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.heroDot,
                            {
                                left: `${(i % 5) * 25 + 5}%` as any,
                                top: `${Math.floor(i / 5) * 35 + 10}%` as any,
                                opacity: 0.03 + (i % 3) * 0.02,
                                width: 4 + (i % 3) * 2,
                                height: 4 + (i % 3) * 2,
                                borderRadius: 2 + (i % 3),
                            },
                        ]}
                    />
                ))}
            </View>

            <Animated.View style={[styles.heroTextContainer, animatedFloat]}>
                <View style={styles.heroIconRow}>
                    <LinearGradient
                        colors={[colors.gold[500], colors.gold[400]]}
                        style={styles.heroIconBg}
                    >
                        <Ionicons name="game-controller" size={20} color="#FFFFFF" />
                    </LinearGradient>
                    <View style={styles.heroLiveBadge}>
                        <Animated.View style={[styles.heroLiveDot, liveDotStyle]} />
                        <Text style={styles.heroLiveText}>LIVE</Text>
                    </View>
                </View>
                <Text style={styles.heroTitle}>0G Arena</Text>
                <Text style={styles.heroSubtitle}>Challenge friends in real-time</Text>
            </Animated.View>
        </Animated.View>
    );
}

// ============================================
// Games Hub Screen
// ============================================

export default function GamesHubScreen() {
    const router = useRouter();
    const gameStore = useGameStore();
    const [roomCode, setRoomCode] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [activeCategory, setActiveCategory] = useState<GameCategory | null>(null);
    const inputRef = useRef<TextInput>(null);

    const filteredGames = useMemo(() => {
        if (!activeCategory) return games;
        return games.filter(g => g.category === activeCategory);
    }, [activeCategory]);

    // ---- Auth state for guest flow ----
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

    // ---- Join Game by Code ----
    const handleJoin = useCallback(() => {
        const code = roomCode.trim().toUpperCase();
        if (code.length !== 6) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Invalid Code', 'Please enter a 6-character room code.');
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if (isAuthenticated) {
            // Authenticated users go directly to the lobby
            router.push(`/games/lobby/${code}`);
        } else {
            // Guests go through the guest-join flow
            router.push(`/games/guest-join?code=${code}` as any);
        }
    }, [roomCode, router, isAuthenticated]);

    // ---- Create & Play a Game ----
    const handlePlay = useCallback(async (type: string) => {
        // Track recently played
        trackRecentlyPlayed(type);

        // Solo games navigate directly
        if (type === 'daily') { router.push('/games/daily'); return; }
        if (type === 'practice') { router.push('/games/practice'); return; }
        if (type === 'word-blitz') { router.push('/games/word-blitz'); return; }
        if (type === 'speed-match') { router.push('/games/speed-match'); return; }

        // Multiplayer games create a lobby
        if (isCreating) return;
        setIsCreating(true);
        try {
            const code = await gameStore.createGame(type);
            if (code) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                router.push(`/games/lobby/${code}`);
            } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert('Game Creation Failed', gameStore.error || 'Unable to create game. Please try again.');
            }
        } catch {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Game Unavailable', 'Unable to start the game right now. Please check your connection and try again.');
            showError('Could not start game');
        } finally {
            setIsCreating(false);
        }
    }, [isCreating, gameStore, router]);

    // ---- Quick Play — pick random multiplayer game ----
    const handleQuickPlay = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        const multiplayerGames = games.filter(g => !g.isSolo);
        const randomGame = multiplayerGames[Math.floor(Math.random() * multiplayerGames.length)];
        handlePlay(randomGame.type);
    }, [handlePlay]);

    // ---- Daily Challenge ----
    const handleDaily = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/games/daily');
    }, [router]);

    // ---- Solo Practice ----
    const handlePractice = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/games/practice');
    }, [router]);

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.obsidian[900], colors.obsidian[800], colors.obsidian[900]]}
                style={StyleSheet.absoluteFill}
            />

            <ScreenHeader title="0G Arena" showBack noBorder />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* ---- Hero Section ---- */}
                <HeroSection />

                {/* ---- Achievements ---- */}
                <AchievementsSection />

                {/* ---- Recently Played ---- */}
                <RecentlyPlayedSection onPlay={handlePlay} />

                {/* ---- Quick Play ---- */}
                <QuickPlayButton onPress={handleQuickPlay} />

                {/* ---- Stats Section ---- */}
                <StatsSection />

                {/* ---- Join Game Section ---- */}
                <Animated.View entering={FadeInDown.delay(150).duration(500)}>
                    <GlassCard style={styles.joinCard} padding="md">
                        <View style={styles.joinHeader}>
                            <Ionicons name="enter-outline" size={18} color={colors.gold[500]} />
                            <Text style={styles.joinTitle}>Join Game</Text>
                        </View>
                        <View style={styles.joinRow}>
                            <AnimatedCodeInput
                                value={roomCode}
                                onChangeText={setRoomCode}
                                onSubmitEditing={handleJoin}
                                inputRef={inputRef}
                            />
                            <TouchableOpacity
                                style={[
                                    styles.joinButton,
                                    roomCode.length < 6 && styles.joinButtonDisabled,
                                ]}
                                onPress={handleJoin}
                                disabled={roomCode.length < 6}
                                activeOpacity={0.8}
                                accessibilityRole="button"
                                accessibilityLabel="Join game"
                            >
                                <LinearGradient
                                    colors={roomCode.length >= 6 ? [colors.gold[500], colors.gold[400]] : [colors.obsidian[600], colors.obsidian[500]]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.joinButtonGradient}
                                >
                                    <Text style={[styles.joinButtonText, roomCode.length < 6 && styles.joinButtonTextDisabled]}>Go</Text>
                                    <Ionicons name="arrow-forward" size={16} color={roomCode.length >= 6 ? '#FFFFFF' : colors.text.muted} />
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </GlassCard>
                </Animated.View>

                {/* ---- Create Game Section Header ---- */}
                <Animated.View entering={FadeInDown.delay(180).duration(500)} style={styles.sectionHeader}>
                    <View style={styles.sectionTitleRow}>
                        <Ionicons name="add-circle-outline" size={20} color={colors.gold[500]} />
                        <Text style={styles.sectionTitle}>Create a Game</Text>
                    </View>
                    <Text style={styles.sectionBadge}>{games.length} Games</Text>
                </Animated.View>

                {/* ---- Category Tabs ---- */}
                <Animated.View entering={FadeInDown.delay(200).duration(400)}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.categoryTabs}
                    >
                        <TouchableOpacity
                            style={[styles.categoryTab, !activeCategory && styles.categoryTabActive]}
                            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveCategory(null); }}
                            accessibilityRole="tab"
                            accessibilityLabel="All games"
                        >
                            <Ionicons name="apps" size={14} color={!activeCategory ? colors.gold[500] : colors.text.muted} />
                            <Text style={[styles.categoryTabText, !activeCategory && styles.categoryTabTextActive]}>All</Text>
                        </TouchableOpacity>
                        {GAME_CATEGORIES.map(cat => (
                            <TouchableOpacity
                                key={cat.key}
                                style={[styles.categoryTab, activeCategory === cat.key && styles.categoryTabActive]}
                                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveCategory(cat.key); }}
                                accessibilityRole="tab"
                                accessibilityLabel={`${cat.label} games`}
                            >
                                <Ionicons name={cat.icon} size={14} color={activeCategory === cat.key ? colors.gold[500] : colors.text.muted} />
                                <Text style={[styles.categoryTabText, activeCategory === cat.key && styles.categoryTabTextActive]}>{cat.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </Animated.View>

                {/* ---- Game Cards Grid ---- */}
                <View style={styles.gamesGrid}>
                    {filteredGames.map((game, index) => (
                        <GameCard
                            key={game.type}
                            game={game}
                            index={index}
                            onPlay={handlePlay}
                        />
                    ))}
                </View>

                {/* ---- Solo Practice Banner ---- */}
                <Animated.View entering={FadeInUp.delay(650).duration(500)}>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handlePractice}
                        accessibilityRole="button"
                        accessibilityLabel="Solo Practice"
                    >
                        <GlassCard style={styles.practiceCard} padding="md">
                            <View style={styles.dailyContent}>
                                <View style={styles.dailyLeft}>
                                    <View style={styles.dailyIconRow}>
                                        <LinearGradient
                                            colors={[colors.azure[500], colors.azure[400]]}
                                            style={styles.dailyFireBg}
                                        >
                                            <Ionicons name="school" size={20} color="#FFFFFF" />
                                        </LinearGradient>
                                        <View>
                                            <Text style={styles.practiceTitle}>Solo Practice</Text>
                                            <Text style={styles.dailyDesc}>
                                                280+ questions across 11 topics
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                            <View style={styles.practiceTopicRow}>
                                <View style={styles.practiceTopicChip}>
                                    <Ionicons name="moon-outline" size={12} color={colors.gold[400]} />
                                    <Text style={styles.practiceTopicText}>Islamic</Text>
                                </View>
                                <View style={styles.practiceTopicChip}>
                                    <Ionicons name="flask-outline" size={12} color={colors.azure[400]} />
                                    <Text style={styles.practiceTopicText}>Science</Text>
                                </View>
                                <View style={styles.practiceTopicChip}>
                                    <Ionicons name="globe-outline" size={12} color={colors.emerald[400]} />
                                    <Text style={styles.practiceTopicText}>Geography</Text>
                                </View>
                                <View style={styles.practiceTopicChip}>
                                    <Ionicons name="ellipsis-horizontal" size={12} color={colors.text.muted} />
                                    <Text style={styles.practiceTopicText}>+8 more</Text>
                                </View>
                            </View>
                            <View style={styles.dailyArrowRow}>
                                <Text style={[styles.dailyArrowText, { color: colors.azure[500] }]}>Choose Topics & Play</Text>
                                <Ionicons name="chevron-forward" size={16} color={colors.azure[500]} />
                            </View>
                        </GlassCard>
                    </TouchableOpacity>
                </Animated.View>

                {/* ---- Daily Challenge Banner ---- */}
                <Animated.View entering={FadeInUp.delay(700).duration(500)}>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handleDaily}
                        accessibilityRole="button"
                        accessibilityLabel="Daily Challenge"
                    >
                        <GlassCard gold style={styles.dailyCard} padding="md">
                            <View style={styles.dailyContent}>
                                <View style={styles.dailyLeft}>
                                    <View style={styles.dailyIconRow}>
                                        <View style={styles.dailyFireBg}>
                                            <Ionicons name="flame" size={20} color={colors.gold[400]} />
                                        </View>
                                        <View>
                                            <Text style={styles.dailyTitle}>Daily Challenge</Text>
                                            <Text style={styles.dailyDesc}>
                                                Build your streak — compete today!
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                                <View style={styles.dailyStreakBadge}>
                                    <Ionicons name="flame" size={16} color={colors.gold[400]} />
                                    <Text style={styles.dailyStreakText}>0</Text>
                                </View>
                            </View>
                            <View style={styles.dailyArrowRow}>
                                <Text style={styles.dailyArrowText}>Play Now</Text>
                                <Ionicons name="chevron-forward" size={16} color={colors.gold[500]} />
                            </View>
                        </GlassCard>
                    </TouchableOpacity>
                </Animated.View>

                {/* Bottom spacing */}
                <View style={{ height: spacing['3xl'] }} />
            </ScrollView>
        </View>
    );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.obsidian[900],
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
    },

    // ---- Achievements ----
    achievementsSection: {
        marginBottom: spacing.lg,
    },
    achievementsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    achievementsTitle: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.text.secondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    achievementsScroll: {
        gap: spacing.sm,
    },
    achievementCard: {
        width: 100,
        alignItems: 'center',
        gap: spacing.xs,
    },
    achievementIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
    },
    achievementName: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.text.primary,
        textAlign: 'center',
    },
    achievementProgress: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.text.muted,
    },

    // ---- Recently Played ----
    recentSection: {
        marginBottom: spacing.lg,
    },
    recentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    recentTitle: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.text.secondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    recentScroll: {
        gap: spacing.sm,
    },
    recentCard: {
        width: 100,
        backgroundColor: colors.surface.glass,
        borderRadius: 14,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border.subtle,
        overflow: 'hidden',
        position: 'relative',
    },
    recentCardBg: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 14,
    },
    recentIconBg: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xs,
    },
    recentCardName: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.text.primary,
        textAlign: 'center',
    },
    recentPlayBadge: {
        position: 'absolute',
        top: spacing.xs,
        right: spacing.xs,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: colors.gold[500] + '20',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ---- Hero Section ----
    heroSection: {
        marginBottom: spacing.lg,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 20,
        paddingVertical: spacing.xl,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.obsidian[800],
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    heroPatternContainer: {
        ...StyleSheet.absoluteFillObject,
    },
    heroDot: {
        position: 'absolute',
        backgroundColor: colors.gold[500],
    },
    heroTextContainer: {
        alignItems: 'center',
    },
    heroIconRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    heroIconBg: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroLiveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.emerald[500] + '20',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.emerald[500] + '40',
    },
    heroLiveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.emerald[500],
    },
    heroLiveText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '700',
        color: colors.emerald[400],
        letterSpacing: 1,
    },
    heroTitle: {
        fontSize: 22,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        letterSpacing: -0.3,
        color: colors.text.primary,
        marginBottom: spacing.xs,
        textAlign: 'center',
    },
    heroSubtitle: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        textAlign: 'center',
    },

    // ---- Quick Play ----
    quickPlayGradient: {
        borderRadius: 16,
        marginBottom: spacing.lg,
        overflow: 'hidden',
    },
    quickPlayContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.md + 2,
        paddingHorizontal: spacing.lg,
    },
    quickPlayLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    quickPlayIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: colors.surface.glassActive,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickPlayTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: '#FFFFFF',
    },
    quickPlaySubtitle: {
        fontSize: typography.fontSize.xs,
        color: '#FFFFFF',
        opacity: 0.7,
    },

    // ---- Stats Section ----
    statsSection: {
        marginBottom: spacing.lg,
    },
    statsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    statItem: {
        flex: 1,
    },
    statCard: {
        alignItems: 'center',
        gap: spacing.xs,
    },
    statIconBg: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 2,
    },
    statValue: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    // ---- Join Card ----
    joinCard: {
        marginBottom: spacing.xl,
    },
    joinHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    joinTitle: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.text.secondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    joinRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    codeInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.obsidian[800],
        borderRadius: 12,
        paddingHorizontal: spacing.md,
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    codeInput: {
        flex: 1,
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
        letterSpacing: 4,
        paddingVertical: spacing.md,
    },
    codeCountBadge: {
        backgroundColor: colors.gold[500] + '15',
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: 6,
    },
    codeCountText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.gold[500],
    },
    joinButton: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    joinButtonDisabled: {
        opacity: 0.5,
    },
    joinButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: 12,
    },
    joinButtonText: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: '#FFFFFF',
    },
    joinButtonTextDisabled: {
        color: colors.text.muted,
    },

    // ---- Section Header ----
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        letterSpacing: -0.3,
        color: colors.text.primary,
    },
    sectionBadge: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.text.muted,
        backgroundColor: colors.surface.glass,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 8,
        overflow: 'hidden',
    },

    // ---- Category Tabs ----
    categoryTabs: {
        flexDirection: 'row',
        gap: spacing.sm,
        paddingBottom: spacing.md,
    },
    categoryTab: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: colors.surface.glass,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    categoryTabActive: {
        backgroundColor: colors.surface.goldSubtle,
        borderColor: colors.gold[500] + '30',
    },
    categoryTabText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.text.muted,
    },
    categoryTabTextActive: {
        color: colors.gold[500],
    },

    // ---- Game Cards Grid ----
    gamesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: CARD_GAP,
        marginBottom: spacing.xl,
    },
    cardWrapper: {
        width: CARD_WIDTH,
    },
    gameCard: {
        position: 'relative',
        overflow: 'hidden',
        minHeight: 195,
    },
    cardAccentStrip: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        borderTopLeftRadius: 14,
        borderTopRightRadius: 14,
    },
    cardCornerGlow: {
        position: 'absolute',
        top: -30,
        right: -30,
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    cardIconContainer: {
        marginBottom: spacing.sm,
        marginTop: spacing.xs,
    },
    iconCircle: {
        width: 52,
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardName: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
        marginBottom: spacing.xxs,
    },
    cardDesc: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        lineHeight: 16,
        marginBottom: spacing.sm,
        flex: 1,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    playerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    playerText: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
    },
    playButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 2,
        borderRadius: 10,
    },
    playButtonText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
    },

    // ---- NEW Badge ----
    newBadge: {
        position: 'absolute',
        top: spacing.sm,
        right: spacing.sm,
        zIndex: 10,
    },
    newBadgeGradient: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: 6,
    },
    newBadgeText: {
        fontSize: 9,
        fontWeight: '800',
        color: colors.text.primary,
        letterSpacing: 1,
    },

    // ---- Solo Practice ----
    practiceCard: {
        marginBottom: spacing.md,
    },
    practiceTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.azure[400],
    },
    practiceTopicRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
        marginBottom: spacing.sm,
    },
    practiceTopicChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.surface.glass,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    practiceTopicText: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.text.muted,
    },

    // ---- Daily Challenge ----
    dailyCard: {
        marginBottom: spacing.lg,
    },
    dailyContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    dailyLeft: {
        flex: 1,
        marginRight: spacing.md,
    },
    dailyIconRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    dailyFireBg: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: colors.gold[500] + '15',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.gold[500] + '25',
    },
    dailyTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.gold[400],
    },
    dailyDesc: {
        fontSize: typography.fontSize.xs,
        color: colors.text.secondary,
        marginTop: 2,
    },
    dailyStreakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.gold[500] + '15',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.gold[500] + '30',
    },
    dailyStreakText: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.gold[400],
    },
    dailyArrowRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    dailyArrowText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.gold[500],
    },
});
