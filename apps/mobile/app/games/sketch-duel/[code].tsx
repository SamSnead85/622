// ============================================
// Sketch Duel — Pictionary-style Drawing Game
// Artist draws, others guess in real-time
// ============================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Dimensions,
    ScrollView,
    PanResponder,
    GestureResponderEvent,
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeIn,
    FadeOut,
    ZoomIn,
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    withSequence,
    withRepeat,
    Easing,
} from 'react-native-reanimated';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors, typography, spacing } from '@zerog/ui';
import { ScreenHeader, GlassCard, LoadingView } from '../../../components';
import { useGameStore, useAuthStore } from '../../../stores';
import { socketManager } from '../../../lib/socket';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================
// Constants
// ============================================

const TIMER_DURATION = 60;
const CANVAS_PADDING = spacing.md;
const CANVAS_WIDTH = SCREEN_WIDTH - CANVAS_PADDING * 2;
const CANVAS_HEIGHT = Math.min(CANVAS_WIDTH * 0.75, SCREEN_HEIGHT * 0.35);

const PALETTE_COLORS = [
    '#FFFFFF', // White
    '#FF3366', // Pink
    '#3B82F6', // Blue
    '#10B981', // Green
    '#FFB020', // Gold
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#000000', // Black (eraser-like on dark bg)
];

const BRUSH_SIZES = [2, 4, 8];

// ============================================
// Types
// ============================================

interface StrokePoint {
    x: number;
    y: number;
}

interface Stroke {
    points: StrokePoint[];
    color: string;
    width: number;
}

interface GuessMessage {
    playerId: string;
    playerName: string;
    text: string;
    isCorrect: boolean;
    timestamp: number;
}

interface CorrectGuesser {
    playerId: string;
    playerName: string;
    order: number;
    timestamp: number;
}

// ============================================
// SVG Canvas Component
// ============================================

function DrawingCanvas({
    strokes,
    currentStroke,
    width,
    height,
}: {
    strokes: Stroke[];
    currentStroke: Stroke | null;
    width: number;
    height: number;
}) {
    const allStrokes = currentStroke ? [...strokes, currentStroke] : strokes;

    return (
        <Svg width={width} height={height} style={canvasStyles.svg}>
            {allStrokes.map((stroke, i) => {
                if (stroke.points.length < 2) {
                    // Single dot
                    const pt = stroke.points[0];
                    if (!pt) return null;
                    return (
                        <Circle
                            key={`dot-${i}`}
                            cx={pt.x}
                            cy={pt.y}
                            r={stroke.width / 2}
                            fill={stroke.color}
                        />
                    );
                }

                // Build SVG path with smooth curves
                let d = `M ${stroke.points[0].x} ${stroke.points[0].y}`;
                for (let j = 1; j < stroke.points.length; j++) {
                    const prev = stroke.points[j - 1];
                    const curr = stroke.points[j];
                    const midX = (prev.x + curr.x) / 2;
                    const midY = (prev.y + curr.y) / 2;
                    d += ` Q ${prev.x} ${prev.y} ${midX} ${midY}`;
                }
                // Final line to last point
                const last = stroke.points[stroke.points.length - 1];
                d += ` L ${last.x} ${last.y}`;

                return (
                    <Path
                        key={`stroke-${i}`}
                        d={d}
                        stroke={stroke.color}
                        strokeWidth={stroke.width}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                    />
                );
            })}
        </Svg>
    );
}

const canvasStyles = StyleSheet.create({
    svg: {
        backgroundColor: 'transparent',
    },
});

// ============================================
// Timer Ring Component
// ============================================

function TimerDisplay({ timeLeft, total }: { timeLeft: number; total: number }) {
    const isUrgent = timeLeft <= 10;
    const progress = timeLeft / total;

    const pulseScale = useSharedValue(1);

    useEffect(() => {
        if (isUrgent && timeLeft > 0) {
            pulseScale.value = withSequence(
                withSpring(1.15, { damping: 8 }),
                withSpring(1, { damping: 8 }),
            );
        }
    }, [timeLeft, isUrgent]);

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
    }));

    return (
        <Animated.View style={[styles.timerContainer, pulseStyle]}>
            <View style={[
                styles.timerRing,
                {
                    borderColor: isUrgent ? colors.coral[500] : colors.emerald[400],
                    borderWidth: 3,
                },
            ]}>
                <Text style={[
                    styles.timerText,
                    isUrgent && { color: colors.coral[400] },
                ]}>
                    {timeLeft}
                </Text>
            </View>
        </Animated.View>
    );
}

// ============================================
// Color Picker Component
// ============================================

function ColorPicker({
    selectedColor,
    onSelectColor,
    brushSize,
    onSelectSize,
}: {
    selectedColor: string;
    onSelectColor: (color: string) => void;
    brushSize: number;
    onSelectSize: (size: number) => void;
}) {
    return (
        <View style={styles.colorPickerContainer}>
            <View style={styles.colorRow}>
                {PALETTE_COLORS.map((color) => (
                    <TouchableOpacity
                        key={color}
                        style={[
                            styles.colorSwatch,
                            { backgroundColor: color },
                            selectedColor === color && styles.colorSwatchSelected,
                        ]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onSelectColor(color);
                        }}
                        activeOpacity={0.7}
                    />
                ))}
            </View>
            <View style={styles.sizeRow}>
                {BRUSH_SIZES.map((size) => (
                    <TouchableOpacity
                        key={size}
                        style={[
                            styles.sizeButton,
                            brushSize === size && styles.sizeButtonSelected,
                        ]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onSelectSize(size);
                        }}
                        activeOpacity={0.7}
                    >
                        <View style={[
                            styles.sizeDot,
                            {
                                width: size * 2 + 4,
                                height: size * 2 + 4,
                                borderRadius: size + 2,
                                backgroundColor: brushSize === size ? colors.gold[500] : colors.text.muted,
                            },
                        ]} />
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

// ============================================
// Guess Chat Component
// ============================================

function GuessChat({
    guesses,
    correctGuessers,
}: {
    guesses: GuessMessage[];
    correctGuessers: CorrectGuesser[];
}) {
    const scrollRef = useRef<ScrollView>(null);
    const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (guesses.length > 0) {
            if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
            scrollTimerRef.current = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
        }
    }, [guesses.length]);

    useEffect(() => {
        return () => {
            if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
        };
    }, []);

    return (
        <View style={styles.chatContainer}>
            <ScrollView
                ref={scrollRef}
                style={styles.chatScroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.chatContent}
            >
                {guesses.length === 0 && (
                    <Text style={styles.chatEmpty}>Guesses will appear here...</Text>
                )}
                {guesses.map((guess, i) => (
                    <View
                        key={`${guess.playerId}-${guess.timestamp}-${i}`}
                        style={[
                            styles.chatMessage,
                            guess.isCorrect && styles.chatMessageCorrect,
                        ]}
                    >
                        <Text style={[
                            styles.chatPlayerName,
                            guess.isCorrect && { color: colors.emerald[400] },
                        ]}>
                            {guess.playerName}
                        </Text>
                        <Text style={[
                            styles.chatText,
                            guess.isCorrect && { color: colors.emerald[300], fontWeight: '700' as const },
                        ]}>
                            {guess.text}
                        </Text>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

// ============================================
// Leaderboard Component
// ============================================

function MiniLeaderboard({
    players,
    localScores,
    artistId,
}: {
    players: Array<{ id: string; userId?: string; name: string; score: number }>;
    localScores: Record<string, number>;
    artistId: string | null;
}) {
    const sorted = useMemo(
        () =>
            [...players]
                .map((p) => ({ ...p, totalScore: p.score + (localScores[p.id] || 0) }))
                .sort((a, b) => b.totalScore - a.totalScore),
        [players, localScores],
    );

    return (
        <View style={styles.leaderboardContainer}>
            {sorted.slice(0, 4).map((p, i) => (
                <View key={p.id} style={styles.leaderboardRow}>
                    <Text style={styles.leaderboardRank}>
                        {i === 0 ? '👑' : `${i + 1}.`}
                    </Text>
                    <Text
                        style={[
                            styles.leaderboardName,
                            p.id === artistId && { color: colors.gold[400] },
                        ]}
                        numberOfLines={1}
                    >
                        {p.name}
                        {p.id === artistId ? ' 🎨' : ''}
                    </Text>
                    <Text style={styles.leaderboardScore}>{p.totalScore}</Text>
                </View>
            ))}
        </View>
    );
}

// ============================================
// Main Screen
// ============================================

export default function SketchDuelScreen() {
    const router = useRouter();
    const { code } = useLocalSearchParams<{ code: string }>();
    const gameStore = useGameStore();
    const authStore = useAuthStore();
    const myUserId = authStore.user?.id;

    // ---- Game State ----
    const [phase, setPhase] = useState<'waiting' | 'drawing' | 'reveal'>('waiting');
    const [round, setRound] = useState(1);
    const [artistId, setArtistId] = useState<string | null>(null);
    const [word, setWord] = useState<string | null>(null);
    const [wordHint, setWordHint] = useState<string>('');
    const [category, setCategory] = useState<string>('');
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
    const [guesses, setGuesses] = useState<GuessMessage[]>([]);
    const [correctGuessers, setCorrectGuessers] = useState<CorrectGuesser[]>([]);
    const [guessText, setGuessText] = useState('');
    const [hasGuessedCorrectly, setHasGuessedCorrectly] = useState(false);
    const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
    const [localScores, setLocalScores] = useState<Record<string, number>>({});
    const [revealWord, setRevealWord] = useState<string | null>(null);

    // ---- Drawing State ----
    const [selectedColor, setSelectedColor] = useState('#FFFFFF');
    const [brushSize, setBrushSize] = useState(4);

    // ---- Animation Values ----
    const correctFlashOpacity = useSharedValue(0);

    const isMountedRef = useRef(true);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const guessInputRef = useRef<TextInput>(null);

    const players = gameStore.players;
    const totalRounds = gameStore.totalRounds || 6;
    const isArtist = artistId != null && (
        artistId === myUserId ||
        players.some(p => p.id === artistId && p.userId === myUserId)
    );

    const artistPlayer = useMemo(
        () => players.find((p) => p.userId === artistId || p.id === artistId),
        [players, artistId],
    );

    // ---- Correct flash animation ----
    const correctFlashStyle = useAnimatedStyle(() => ({
        opacity: correctFlashOpacity.value,
    }));

    // ============================================
    // Socket Listeners
    // ============================================

    useEffect(() => {
        const unsubs = [
            socketManager.on('game:update', (data: Record<string, unknown>) => {
                gameStore.updateFromDelta(data);

                const gd = data.gameData;
                if (gd) {
                    if (gd.phase) setPhase(gd.phase);
                    if (gd.artistId) setArtistId(gd.artistId);
                    if (gd.currentWordHint) setWordHint(gd.currentWordHint);
                    if (gd.currentCategory) setCategory(gd.currentCategory);

                    // Strokes update from artist
                    if (gd.strokes !== undefined) {
                        setStrokes(gd.strokes);
                    }

                    // New stroke appended
                    if (gd.newStroke) {
                        setStrokes((prev) => [...prev, gd.newStroke]);
                    }

                    // Canvas cleared
                    if (gd.cleared) {
                        setStrokes([]);
                    }

                    // Guess feed
                    if (gd.guesses !== undefined) {
                        setGuesses(gd.guesses);
                    }
                    if (gd.newGuess) {
                        setGuesses((prev) => [...prev, gd.newGuess]);
                    }

                    // Correct guesser notification
                    if (gd.correctGuess) {
                        const cg: CorrectGuesser = gd.correctGuess;
                        setCorrectGuessers((prev) => [...prev, cg]);

                        if (cg.playerId === myUserId) {
                            setHasGuessedCorrectly(true);
                            // Green flash
                            correctFlashOpacity.value = withSequence(
                                withTiming(0.5, { duration: 150 }),
                                withTiming(0, { duration: 800 }),
                            );
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        } else {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                    }

                    // Correct guessers list
                    if (gd.correctGuessers !== undefined) {
                        setCorrectGuessers(gd.correctGuessers);
                    }

                    // Word for artist only
                    if (gd.word) {
                        setWord(gd.word);
                    }

                    // Round scores update
                    if (gd.roundScores) {
                        setLocalScores((prev) => {
                            const next = { ...prev };
                            for (const [pid, score] of Object.entries(gd.roundScores)) {
                                next[pid] = score as number;
                            }
                            return next;
                        });
                    }

                    // Reveal word at round end
                    if (gd.revealWord) {
                        setRevealWord(gd.revealWord);
                    }
                }
            }),
            socketManager.on('game:round-start', (data: Record<string, unknown>) => {
                setPhase('drawing');
                setGuessText('');
                setHasGuessedCorrectly(false);
                setCorrectGuessers([]);
                setGuesses([]);
                setStrokes([]);
                setCurrentStroke(null);
                setRevealWord(null);
                setTimeLeft(TIMER_DURATION);
                setRound(data.round || round + 1);

                const gd = data.gameData;
                if (gd) {
                    if (gd.artistId) setArtistId(gd.artistId);
                    if (gd.word) setWord(gd.word);
                    if (gd.currentWordHint) setWordHint(gd.currentWordHint);
                    if (gd.currentCategory) setCategory(gd.currentCategory);
                }
            }),
            socketManager.on('game:round-end', (data: Record<string, unknown>) => {
                gameStore.setRoundEnd(data);
                setPhase('reveal');
                clearTimer();
                if (data.summary?.word) {
                    setRevealWord(data.summary.word);
                }
            }),
            socketManager.on('game:ended', (data: Record<string, unknown>) => {
                gameStore.setGameEnded(data);
                router.replace(`/games/results/${code}`);
            }),
            socketManager.on('game:error', (data: { message: string }) => {
                gameStore.setError(data.message);
            }),
        ];

        return () => unsubs.forEach((fn) => fn());
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [code]);

    // ============================================
    // Timer
    // ============================================

    const clearTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (phase !== 'drawing') {
            clearTimer();
            return;
        }

        setTimeLeft(TIMER_DURATION);

        timerRef.current = setInterval(() => {
            if (!isMountedRef.current) return;
            setTimeLeft((prev) => {
                const next = prev - 1;
                if (next <= 0) {
                    clearTimer();
                    // Notify server time is up
                    gameStore.sendAction('sketch:timeout', {});
                    return 0;
                }
                if (next <= 5 && next > 0) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                return next;
            });
        }, 1000);

        return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase, round]);

    // Mount guard for async callbacks
    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => clearTimer();
    }, [clearTimer]);

    // ============================================
    // Drawing Touch Handlers
    // ============================================

    const getCanvasPoint = useCallback((evt: GestureResponderEvent): StrokePoint => {
        const { locationX, locationY } = evt.nativeEvent;
        return {
            x: Math.max(0, Math.min(locationX, CANVAS_WIDTH)),
            y: Math.max(0, Math.min(locationY, CANVAS_HEIGHT)),
        };
    }, []);

    const panResponder = useMemo(
        () =>
            PanResponder.create({
                onStartShouldSetPanResponder: () => isArtist && phase === 'drawing',
                onMoveShouldSetPanResponder: () => isArtist && phase === 'drawing',
                onPanResponderGrant: (evt) => {
                    if (!isArtist || phase !== 'drawing') return;
                    const point = getCanvasPoint(evt);
                    setCurrentStroke({
                        points: [point],
                        color: selectedColor,
                        width: brushSize,
                    });
                },
                onPanResponderMove: (evt) => {
                    if (!isArtist || phase !== 'drawing') return;
                    const point = getCanvasPoint(evt);
                    setCurrentStroke((prev) => {
                        if (!prev) return null;
                        return {
                            ...prev,
                            points: [...prev.points, point],
                        };
                    });
                },
                onPanResponderRelease: () => {
                    if (!isArtist || phase !== 'drawing') return;
                    setCurrentStroke((prev) => {
                        if (prev && prev.points.length > 0) {
                            // Add to strokes
                            setStrokes((s) => [...s, prev]);
                            // Send to server
                            gameStore.sendAction('sketch:draw', { stroke: prev });
                        }
                        return null;
                    });
                },
                onPanResponderTerminate: () => {
                    setCurrentStroke(null);
                },
            }),
        [isArtist, phase, selectedColor, brushSize, getCanvasPoint, gameStore],
    );

    // ============================================
    // Action Handlers
    // ============================================

    const handleClearCanvas = useCallback(() => {
        if (!isArtist) return;
        setStrokes([]);
        setCurrentStroke(null);
        gameStore.sendAction('sketch:clear', {});
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, [isArtist, gameStore]);

    const handleSubmitGuess = useCallback(() => {
        const text = guessText.trim();
        if (!text || hasGuessedCorrectly || isArtist) return;

        gameStore.sendAction('sketch:guess', { text });
        setGuessText('');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, [guessText, hasGuessedCorrectly, isArtist, gameStore]);

    const handleLeave = useCallback(() => {
        clearTimer();
        gameStore.leaveGame();
        router.replace('/games');
    }, [clearTimer, gameStore, router]);

    // ============================================
    // Render
    // ============================================

    if (!code) {
        return <LoadingView />;
    }

    return (
        <View style={styles.container}>
            {/* Correct guess green flash overlay */}
            <Animated.View
                style={[styles.correctFlashOverlay, correctFlashStyle]}
                pointerEvents="none"
            />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleLeave} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Sketch Duel</Text>
                    <Text style={styles.headerRound}>
                        Round {round}/{totalRounds}
                    </Text>
                </View>
                <TimerDisplay timeLeft={timeLeft} total={TIMER_DURATION} />
            </View>

            {/* Artist Info Bar */}
            <Animated.View entering={FadeInDown.duration(300)} style={styles.artistBar}>
                {phase === 'drawing' && artistPlayer && (
                    <View style={styles.artistInfo}>
                        <View style={[styles.artistDot, { backgroundColor: colors.gold[500] }]} />
                        <Text style={styles.artistLabel}>
                            {isArtist ? 'You are drawing!' : `${artistPlayer.name} is drawing`}
                        </Text>
                    </View>
                )}
                {phase === 'drawing' && (
                    <View style={styles.wordHintContainer}>
                        {isArtist && word ? (
                            <View style={styles.wordBadge}>
                                <Ionicons name="eye" size={14} color={colors.gold[400]} />
                                <Text style={styles.wordText}>{word}</Text>
                            </View>
                        ) : (
                            <View style={styles.hintBadge}>
                                <Text style={styles.hintLabel}>{category}</Text>
                                <Text style={styles.hintText}>{wordHint}</Text>
                            </View>
                        )}
                    </View>
                )}
                {phase === 'reveal' && revealWord && (
                    <Animated.View entering={ZoomIn.duration(400)} style={styles.revealContainer}>
                        <Text style={styles.revealLabel}>The word was:</Text>
                        <Text style={styles.revealWord}>{revealWord}</Text>
                    </Animated.View>
                )}
            </Animated.View>

            {/* Canvas Area */}
            <View style={styles.canvasWrapper}>
                <GlassCard style={styles.canvasCard} padding="none">
                    <View
                        style={styles.canvasArea}
                        {...panResponder.panHandlers}
                    >
                        <DrawingCanvas
                            strokes={strokes}
                            currentStroke={currentStroke}
                            width={CANVAS_WIDTH}
                            height={CANVAS_HEIGHT}
                        />
                        {/* Canvas overlay for non-artist */}
                        {!isArtist && phase === 'drawing' && strokes.length === 0 && (
                            <View style={styles.canvasPlaceholder}>
                                <Ionicons name="brush-outline" size={40} color={colors.text.muted + '40'} />
                                <Text style={styles.canvasPlaceholderText}>
                                    Waiting for artist to draw...
                                </Text>
                            </View>
                        )}
                    </View>
                </GlassCard>
            </View>

            {/* Artist Tools or Guesser Chat */}
            {isArtist && phase === 'drawing' ? (
                <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.toolsSection}>
                    <ColorPicker
                        selectedColor={selectedColor}
                        onSelectColor={setSelectedColor}
                        brushSize={brushSize}
                        onSelectSize={setBrushSize}
                    />
                    <View style={styles.toolButtons}>
                        <TouchableOpacity
                            style={styles.toolButton}
                            onPress={() => {
                                // Undo last stroke
                                setStrokes((prev) => prev.slice(0, -1));
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="arrow-undo" size={20} color={colors.text.secondary} />
                            <Text style={styles.toolButtonText}>Undo</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.toolButton, styles.clearButton]}
                            onPress={handleClearCanvas}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="trash-outline" size={20} color={colors.coral[400]} />
                            <Text style={[styles.toolButtonText, { color: colors.coral[400] }]}>Clear</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            ) : (
                <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.guesserSection}>
                    {/* Guess Chat */}
                    <GuessChat guesses={guesses} correctGuessers={correctGuessers} />

                    {/* Guess Input */}
                    {phase === 'drawing' && !hasGuessedCorrectly && (
                        <View style={styles.guessInputRow}>
                            <TextInput
                                ref={guessInputRef}
                                style={styles.guessInput}
                                value={guessText}
                                onChangeText={setGuessText}
                                placeholder="Type your guess..."
                                placeholderTextColor={colors.text.muted}
                                onSubmitEditing={handleSubmitGuess}
                                returnKeyType="send"
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!hasGuessedCorrectly}
                            />
                            <TouchableOpacity
                                style={[
                                    styles.guessSubmitButton,
                                    !guessText.trim() && styles.guessSubmitDisabled,
                                ]}
                                onPress={handleSubmitGuess}
                                disabled={!guessText.trim()}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name="send"
                                    size={18}
                                    color={guessText.trim() ? colors.gold[500] : colors.text.muted}
                                />
                            </TouchableOpacity>
                        </View>
                    )}
                    {hasGuessedCorrectly && phase === 'drawing' && (
                        <Animated.View entering={FadeIn.duration(300)} style={styles.correctBanner}>
                            <Ionicons name="checkmark-circle" size={20} color={colors.emerald[400]} />
                            <Text style={styles.correctBannerText}>You guessed it!</Text>
                        </Animated.View>
                    )}
                </Animated.View>
            )}

            {/* Mini Leaderboard */}
            <MiniLeaderboard
                players={players}
                localScores={localScores}
                artistId={artistId}
            />
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
        paddingTop: 54,
    },
    correctFlashOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.emerald[500],
        zIndex: 100,
        pointerEvents: 'none',
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.sm,
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.obsidian[700],
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text.primary,
        letterSpacing: 0.5,
    },
    headerRound: {
        fontSize: 12,
        color: colors.text.muted,
        marginTop: 1,
    },

    // Timer
    timerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    timerRing: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.obsidian[800],
    },
    timerText: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.text.primary,
    },

    // Artist Bar
    artistBar: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        minHeight: 44,
    },
    artistInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    artistDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: spacing.xs,
    },
    artistLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.gold[400],
    },
    wordHintContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    wordBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.gold[500] + '20',
        borderColor: colors.gold[500] + '40',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        gap: 6,
    },
    wordText: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.gold[400],
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    hintBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    hintLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        backgroundColor: colors.obsidian[700],
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        overflow: 'hidden',
    },
    hintText: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text.secondary,
        letterSpacing: 3,
    },

    // Reveal
    revealContainer: {
        alignItems: 'center',
        paddingVertical: spacing.xs,
    },
    revealLabel: {
        fontSize: 12,
        color: colors.text.muted,
        marginBottom: 2,
    },
    revealWord: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.gold[400],
        textTransform: 'uppercase',
        letterSpacing: 2,
    },

    // Canvas
    canvasWrapper: {
        paddingHorizontal: CANVAS_PADDING,
        marginBottom: spacing.sm,
    },
    canvasCard: {
        borderRadius: 16,
        overflow: 'hidden',
        borderColor: colors.obsidian[600],
        borderWidth: 1,
    },
    canvasArea: {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: colors.obsidian[800],
        borderRadius: 14,
        overflow: 'hidden',
    },
    canvasPlaceholder: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    canvasPlaceholderText: {
        fontSize: 13,
        color: colors.text.muted + '60',
        marginTop: spacing.xs,
    },

    // Color Picker
    colorPickerContainer: {
        paddingHorizontal: spacing.md,
        gap: spacing.xs,
    },
    colorRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    colorSwatch: {
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    colorSwatchSelected: {
        borderColor: colors.gold[500],
        shadowColor: colors.gold[500],
        shadowOpacity: 0.5,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 0 },
    },
    sizeRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
    },
    sizeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.obsidian[700],
        alignItems: 'center',
        justifyContent: 'center',
    },
    sizeButtonSelected: {
        backgroundColor: colors.obsidian[600],
        borderColor: colors.gold[500] + '40',
        borderWidth: 1,
    },
    sizeDot: {
        backgroundColor: colors.text.muted,
    },

    // Tools Section (Artist)
    toolsSection: {
        paddingVertical: spacing.xs,
        gap: spacing.sm,
    },
    toolButtons: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.md,
        paddingHorizontal: spacing.md,
    },
    toolButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.obsidian[700],
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        borderRadius: 12,
    },
    clearButton: {
        backgroundColor: colors.coral[500] + '15',
    },
    toolButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text.secondary,
    },

    // Guesser Section
    guesserSection: {
        flex: 1,
        paddingHorizontal: spacing.md,
        gap: spacing.xs,
    },

    // Chat
    chatContainer: {
        flex: 1,
        backgroundColor: colors.obsidian[800],
        borderRadius: 14,
        borderColor: colors.obsidian[600],
        borderWidth: 1,
        overflow: 'hidden',
    },
    chatScroll: {
        flex: 1,
    },
    chatContent: {
        padding: spacing.sm,
        gap: 4,
    },
    chatEmpty: {
        fontSize: 13,
        color: colors.text.muted + '60',
        textAlign: 'center',
        paddingVertical: spacing.lg,
    },
    chatMessage: {
        flexDirection: 'row',
        gap: 6,
        paddingVertical: 3,
    },
    chatMessageCorrect: {
        backgroundColor: colors.emerald[500] + '10',
        borderRadius: 8,
        paddingHorizontal: 6,
        paddingVertical: 4,
    },
    chatPlayerName: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.azure[400],
    },
    chatText: {
        fontSize: 13,
        color: colors.text.secondary,
        flex: 1,
    },

    // Guess Input
    guessInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    guessInput: {
        flex: 1,
        height: 42,
        backgroundColor: colors.obsidian[700],
        borderRadius: 12,
        paddingHorizontal: spacing.md,
        color: colors.text.primary,
        fontSize: 14,
        borderColor: colors.obsidian[600],
        borderWidth: 1,
    },
    guessSubmitButton: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: colors.obsidian[700],
        alignItems: 'center',
        justifyContent: 'center',
        borderColor: colors.gold[500] + '30',
        borderWidth: 1,
    },
    guessSubmitDisabled: {
        borderColor: 'transparent',
    },

    // Correct Banner
    correctBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        backgroundColor: colors.emerald[500] + '15',
        borderRadius: 12,
        paddingVertical: 10,
        borderColor: colors.emerald[500] + '30',
        borderWidth: 1,
    },
    correctBannerText: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.emerald[400],
    },

    // Leaderboard
    leaderboardContainer: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        paddingBottom: spacing.lg,
    },
    leaderboardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 3,
    },
    leaderboardRank: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.text.muted,
        width: 28,
    },
    leaderboardName: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        color: colors.text.secondary,
    },
    leaderboardScore: {
        fontSize: 14,
        fontWeight: '800',
        color: colors.gold[400],
        minWidth: 36,
        textAlign: 'right',
    },
});
