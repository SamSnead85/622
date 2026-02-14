// ============================================
// Wavelength — Spectrum Mind-Reading Game
// Psychic gives a clue, others guess the position
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Dimensions,
    ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    FadeInDown,
    FadeIn,
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    withSequence,
    runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing } from '@zerog/ui';
import { ScreenHeader, GlassCard, Button, LoadingView } from '../../../components';
import { useGameStore, useAuthStore } from '../../../stores';
import { socketManager } from '../../../lib/socket';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SPECTRUM_WIDTH = SCREEN_WIDTH - spacing.lg * 2 - spacing.md * 2;
const SPECTRUM_HEIGHT = 20;
const MARKER_SIZE = 24;
const GUESS_MARKER_SIZE = 16;

// ============================================
// Types
// ============================================

interface PlayerGuess {
    playerId: string;
    name: string;
    position: number;
    color: string;
    score?: number;
}

type Phase = 'waiting' | 'clue' | 'guessing' | 'reveal';

// ============================================
// Marker Colors for Players
// ============================================

const MARKER_COLORS = [
    colors.azure[400],
    colors.coral[400],
    colors.emerald[400],
    colors.amber[400],
    colors.azure[400], // purple → azure
    colors.coral[300], // pink → coral
    colors.azure[300], // cyan → azure
    colors.gold[400], // orange → gold
];

// ============================================
// Wavelength Game Screen
// ============================================

export default function WavelengthGameScreen() {
    const router = useRouter();
    const { code } = useLocalSearchParams<{ code: string }>();
    const gameStore = useGameStore();
    const authStore = useAuthStore();
    const myUserId = authStore.user?.id;

    // ---- Game State ----
    const [phase, setPhase] = useState<Phase>('waiting');
    const [spectrumLeft, setSpectrumLeft] = useState('Hot');
    const [spectrumRight, setSpectrumRight] = useState('Cold');
    const [targetPosition, setTargetPosition] = useState(50);
    const [psychicId, setPsychicId] = useState<string | null>(null);
    const [clueText, setClueText] = useState('');
    const [currentClue, setCurrentClue] = useState('');
    const [myGuess, setMyGuess] = useState(50);
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const [playerGuesses, setPlayerGuesses] = useState<PlayerGuess[]>([]);
    const [roundScores, setRoundScores] = useState<Record<string, number>>({});

    // ---- Animation Values ----
    const targetOpacity = useSharedValue(0);
    const targetScale = useSharedValue(0);
    const guessMarkerScale = useSharedValue(1);

    const isPsychic = psychicId === myUserId;

    // ---- Derived Data ----
    const players = gameStore.players;
    const round = gameStore.round;
    const totalRounds = gameStore.totalRounds;

    const psychicPlayer = useMemo(
        () => players.find((p) => p.userId === psychicId || p.id === psychicId),
        [players, psychicId],
    );

    // ---- Socket Listeners ----
    useEffect(() => {
        const unsubs = [
            socketManager.on('game:update', (data) => {
                gameStore.updateFromDelta(data);

                const gd = data.gameData;
                if (gd) {
                    if (gd.spectrumLeft) setSpectrumLeft(gd.spectrumLeft);
                    if (gd.spectrumRight) setSpectrumRight(gd.spectrumRight);
                    if (gd.targetPosition !== undefined) setTargetPosition(gd.targetPosition);
                    if (gd.psychicId) setPsychicId(gd.psychicId);
                    if (gd.phase) setPhase(gd.phase);
                    if (gd.clue) setCurrentClue(gd.clue);
                    if (gd.guesses) {
                        const guessList: PlayerGuess[] = (gd.guesses || []).map(
                            (g: Record<string, unknown>, i: number) => ({
                                playerId: g.playerId,
                                name: g.name || 'Player',
                                position: g.position,
                                color: MARKER_COLORS[i % MARKER_COLORS.length],
                                score: g.score,
                            }),
                        );
                        setPlayerGuesses(guessList);
                    }
                }
            }),
            socketManager.on('game:round-start', (data) => {
                // Reset round state
                setPhase('waiting');
                setClueText('');
                setCurrentClue('');
                setMyGuess(50);
                setHasSubmitted(false);
                setPlayerGuesses([]);
                setRoundScores({});
                targetOpacity.value = 0;
                targetScale.value = 0;

                if (data.gameData) {
                    if (data.gameData.spectrumLeft) setSpectrumLeft(data.gameData.spectrumLeft);
                    if (data.gameData.spectrumRight) setSpectrumRight(data.gameData.spectrumRight);
                    if (data.gameData.targetPosition !== undefined) setTargetPosition(data.gameData.targetPosition);
                    if (data.gameData.psychicId) setPsychicId(data.gameData.psychicId);
                    if (data.gameData.phase) setPhase(data.gameData.phase);
                }
            }),
            socketManager.on('game:round-end', (data) => {
                gameStore.setRoundEnd(data);
                setPhase('reveal');
                if (data.scores) setRoundScores(data.scores);

                // Animate target reveal
                targetOpacity.value = withTiming(1, { duration: 600 });
                targetScale.value = withSequence(
                    withSpring(1.3, { damping: 8 }),
                    withSpring(1, { damping: 12 }),
                );
            }),
            socketManager.on('game:ended', (data) => {
                gameStore.setGameEnded(data);
                router.replace(`/games/results/${code}`);
            }),
        ];
        return () => unsubs.forEach((fn) => fn());
    }, []);

    // ---- Sync initial game data ----
    useEffect(() => {
        const gd = gameStore.gameData;
        if (gd) {
            if (gd.spectrumLeft) setSpectrumLeft(gd.spectrumLeft);
            if (gd.spectrumRight) setSpectrumRight(gd.spectrumRight);
            if (gd.targetPosition !== undefined) setTargetPosition(gd.targetPosition);
            if (gd.psychicId) setPsychicId(gd.psychicId);
            if (gd.phase) setPhase(gd.phase);
            if (gd.clue) setCurrentClue(gd.clue);
        }
    }, []);

    // ---- Actions ----
    const handleSendClue = useCallback(() => {
        const word = clueText.trim().split(/\s+/)[0]; // Single word only
        if (!word) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        gameStore.sendAction('clue', { clue: word });
        setClueText('');
    }, [clueText, gameStore]);

    const handleSpectrumTouch = useCallback(
        (event: { nativeEvent: { locationX: number } }) => {
            if (isPsychic || hasSubmitted || phase !== 'guessing') return;
            const { locationX } = event.nativeEvent;
            const position = Math.round((locationX / SPECTRUM_WIDTH) * 100);
            const clamped = Math.max(0, Math.min(100, position));
            setMyGuess(clamped);
            Haptics.selectionAsync();
        },
        [isPsychic, hasSubmitted, phase],
    );

    const handleLockIn = useCallback(() => {
        if (hasSubmitted) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        gameStore.sendAction('guess', { position: myGuess });
        setHasSubmitted(true);
        guessMarkerScale.value = withSequence(
            withSpring(1.4, { damping: 8 }),
            withSpring(1, { damping: 12 }),
        );
    }, [myGuess, hasSubmitted, gameStore]);

    // ---- Animated Styles ----
    const targetMarkerStyle = useAnimatedStyle(() => ({
        opacity: targetOpacity.value,
        transform: [{ scale: targetScale.value }],
    }));

    const myGuessMarkerStyle = useAnimatedStyle(() => ({
        transform: [{ scale: guessMarkerScale.value }],
    }));

    // ---- Loading State ----
    if (gameStore.status === 'idle') {
        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={[colors.obsidian[900], colors.obsidian[800], colors.obsidian[900]]}
                    style={StyleSheet.absoluteFill}
                />
                <ScreenHeader title="Wavelength" showBack noBorder />
                <LoadingView message="Connecting to game..." />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.obsidian[900], colors.obsidian[800], colors.obsidian[900]]}
                style={StyleSheet.absoluteFill}
            />
            <ScreenHeader title="Wavelength" showBack noBorder />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ---- Round Counter & Psychic Indicator ---- */}
                <Animated.View entering={FadeInDown.delay(100).duration(500)}>
                    <View style={styles.topBar}>
                        <GlassCard style={styles.roundBadge} padding="sm">
                            <Text style={styles.roundText}>
                                Round {round}/{totalRounds}
                            </Text>
                        </GlassCard>

                        <GlassCard
                            style={[styles.psychicBadge, isPsychic && styles.psychicBadgeActive]}
                            padding="sm"
                        >
                            <Ionicons
                                name="radio"
                                size={16}
                                color={isPsychic ? colors.gold[500] : colors.text.muted}
                            />
                            <Text
                                style={[
                                    styles.psychicText,
                                    isPsychic && styles.psychicTextActive,
                                ]}
                                numberOfLines={1}
                            >
                                {isPsychic
                                    ? 'You are the Psychic'
                                    : `Psychic: ${psychicPlayer?.name || '...'}`}
                            </Text>
                            {isPsychic && (
                                <View style={styles.goldDot} />
                            )}
                        </GlassCard>
                    </View>
                </Animated.View>

                {/* ---- Spectrum Bar ---- */}
                <Animated.View entering={FadeInDown.delay(200).duration(500)}>
                    <GlassCard style={styles.spectrumCard} padding="md">
                        <Text style={styles.spectrumTitle} accessibilityRole="header">
                            Spectrum
                        </Text>

                        {/* Labels */}
                        <View style={styles.spectrumLabels}>
                            <Text style={styles.spectrumLabelLeft}>{spectrumLeft}</Text>
                            <Text style={styles.spectrumLabelRight}>{spectrumRight}</Text>
                        </View>

                        {/* Spectrum Bar */}
                        <View
                            style={styles.spectrumBarWrapper}
                            onStartShouldSetResponder={() =>
                                !isPsychic && !hasSubmitted && phase === 'guessing'
                            }
                            onResponderRelease={handleSpectrumTouch}
                            onResponderMove={(e) => {
                                if (isPsychic || hasSubmitted || phase !== 'guessing') return;
                                const { locationX } = e.nativeEvent;
                                const position = Math.round((locationX / SPECTRUM_WIDTH) * 100);
                                setMyGuess(Math.max(0, Math.min(100, position)));
                            }}
                            accessibilityRole="adjustable"
                            accessibilityLabel={`Spectrum position selector, current value ${myGuess}`}
                        >
                            <LinearGradient
                                colors={[colors.azure[500], colors.emerald[400], colors.gold[500], colors.coral[500]]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.spectrumBar}
                            />

                            {/* Target Marker (revealed at end) */}
                            {(phase === 'reveal' || (isPsychic && phase !== 'waiting')) && (
                                <Animated.View
                                    style={[
                                        styles.targetMarker,
                                        {
                                            left: (targetPosition / 100) * SPECTRUM_WIDTH - MARKER_SIZE / 2,
                                        },
                                        phase === 'reveal' && targetMarkerStyle,
                                        isPsychic && phase !== 'reveal' && { opacity: 1, transform: [{ scale: 1 }] },
                                    ]}
                                    accessibilityLabel={`Target position at ${targetPosition}`}
                                >
                                    <View style={styles.targetDot}>
                                        <Ionicons name="star" size={12} color={colors.text.primary} />
                                    </View>
                                </Animated.View>
                            )}

                            {/* My Guess Marker */}
                            {!isPsychic && phase === 'guessing' && (
                                <Animated.View
                                    style={[
                                        styles.guessMarkerMine,
                                        {
                                            left: (myGuess / 100) * SPECTRUM_WIDTH - GUESS_MARKER_SIZE / 2,
                                        },
                                        myGuessMarkerStyle,
                                    ]}
                                    accessibilityLabel={`Your guess at ${myGuess}`}
                                >
                                    <View style={styles.guessNumberBubble}>
                                        <Text style={styles.guessNumberText}>{myGuess}</Text>
                                    </View>
                                    <View style={styles.myGuessDot} />
                                </Animated.View>
                            )}

                            {/* Player Guess Markers (shown during reveal) */}
                            {phase === 'reveal' &&
                                playerGuesses.map((guess) => (
                                    <Animated.View
                                        key={guess.playerId}
                                        entering={FadeIn.delay(300).duration(400)}
                                        style={[
                                            styles.playerGuessMarker,
                                            {
                                                left:
                                                    (guess.position / 100) * SPECTRUM_WIDTH -
                                                    GUESS_MARKER_SIZE / 2,
                                                backgroundColor: guess.color,
                                            },
                                        ]}
                                        accessibilityLabel={`${guess.name} guessed ${guess.position}`}
                                    />
                                ))}
                        </View>

                        {/* Scale numbers */}
                        <View style={styles.scaleNumbers}>
                            <Text style={styles.scaleText}>0</Text>
                            <Text style={styles.scaleText}>25</Text>
                            <Text style={styles.scaleText}>50</Text>
                            <Text style={styles.scaleText}>75</Text>
                            <Text style={styles.scaleText}>100</Text>
                        </View>
                    </GlassCard>
                </Animated.View>

                {/* ---- Psychic View: Give Clue ---- */}
                {isPsychic && (phase === 'clue' || phase === 'waiting') && (
                    <Animated.View entering={FadeInDown.delay(300).duration(500)}>
                        <GlassCard style={styles.actionCard} padding="md">
                            <View style={styles.actionHeader}>
                                <Ionicons name="bulb" size={20} color={colors.gold[500]} />
                                <Text style={styles.actionTitle}>Give a One-Word Clue</Text>
                            </View>
                            <Text style={styles.actionHint}>
                                Guide your team to position {targetPosition} on the spectrum
                            </Text>
                            <View style={styles.clueInputRow}>
                                <TextInput
                                    style={styles.clueInput}
                                    placeholder="Type a clue..."
                                    placeholderTextColor={colors.text.muted}
                                    value={clueText}
                                    onChangeText={(t) => setClueText(t.replace(/\s+/g, '').slice(0, 20))}
                                    maxLength={20}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    returnKeyType="send"
                                    onSubmitEditing={handleSendClue}
                                    accessibilityLabel="Clue input"
                                />
                                <Button
                                    title="Send Clue"
                                    onPress={handleSendClue}
                                    disabled={!clueText.trim()}
                                    icon="send"
                                    size="sm"
                                />
                            </View>
                        </GlassCard>
                    </Animated.View>
                )}

                {/* ---- Guesser View: See Clue & Guess ---- */}
                {!isPsychic && phase === 'guessing' && (
                    <Animated.View entering={FadeInDown.delay(300).duration(500)}>
                        <GlassCard style={styles.actionCard} padding="md">
                            {/* Clue Display */}
                            <Text style={styles.clueLabel}>The Clue</Text>
                            <Text
                                style={styles.clueDisplay}
                                accessibilityLabel={`Clue: ${currentClue}`}
                            >
                                {currentClue || '...'}
                            </Text>

                            <View style={styles.guessDivider} />

                            <Text style={styles.guessInstructions}>
                                Tap or drag on the spectrum above to place your guess
                            </Text>
                            <Text style={styles.guessValue}>
                                Your guess: <Text style={styles.guessValueBold}>{myGuess}</Text>
                            </Text>

                            <Button
                                title={hasSubmitted ? 'Locked In!' : 'Lock In'}
                                onPress={handleLockIn}
                                disabled={hasSubmitted}
                                icon={hasSubmitted ? 'checkmark-circle' : 'lock-closed'}
                                fullWidth
                                variant={hasSubmitted ? 'secondary' : 'primary'}
                            />
                        </GlassCard>
                    </Animated.View>
                )}

                {/* ---- Waiting for Clue ---- */}
                {!isPsychic && (phase === 'clue' || phase === 'waiting') && (
                    <Animated.View entering={FadeInDown.delay(300).duration(500)}>
                        <GlassCard style={styles.waitingCard} padding="md">
                            <Ionicons name="hourglass" size={28} color={colors.gold[400]} />
                            <Text style={styles.waitingText}>
                                Waiting for the Psychic to give a clue...
                            </Text>
                        </GlassCard>
                    </Animated.View>
                )}

                {/* ---- Reveal: Scores ---- */}
                {phase === 'reveal' && (
                    <Animated.View entering={FadeInDown.delay(400).duration(500)}>
                        <GlassCard style={styles.revealCard} padding="md">
                            <Text style={styles.revealTitle}>Round Results</Text>
                            <Text style={styles.revealTarget}>
                                Target was: <Text style={styles.revealTargetValue}>{targetPosition}</Text>
                            </Text>

                            <View style={styles.scoresList}>
                                {playerGuesses.map((guess) => (
                                    <View key={guess.playerId} style={styles.scoreRow}>
                                        <View style={styles.scorePlayerInfo}>
                                            <View
                                                style={[
                                                    styles.scoreColorDot,
                                                    { backgroundColor: guess.color },
                                                ]}
                                            />
                                            <Text style={styles.scorePlayerName}>{guess.name}</Text>
                                        </View>
                                        <View style={styles.scoreDetails}>
                                            <Text style={styles.scoreGuessText}>
                                                Guess: {guess.position}
                                            </Text>
                                            <Text style={styles.scorePointsText}>
                                                +{guess.score ?? roundScores[guess.playerId] ?? 0}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </GlassCard>
                    </Animated.View>
                )}

                {/* ---- Player Scores Summary ---- */}
                <Animated.View entering={FadeInDown.delay(500).duration(500)}>
                    <GlassCard style={styles.scoresCard} padding="md">
                        <Text style={styles.scoresTitle}>Scoreboard</Text>
                        {[...players]
                            .sort((a, b) => b.score - a.score)
                            .map((player, index) => (
                                <View key={player.id} style={styles.scoreboardRow}>
                                    <Text style={styles.scoreboardRank}>#{index + 1}</Text>
                                    <View style={styles.scoreboardNameRow}>
                                        <Text style={styles.scoreboardName}>{player.name}</Text>
                                        {player.userId === psychicId && (
                                            <Ionicons name="radio" size={12} color={colors.gold[500]} />
                                        )}
                                    </View>
                                    <Text style={styles.scoreboardPoints}>{player.score}</Text>
                                </View>
                            ))}
                    </GlassCard>
                </Animated.View>

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
        paddingTop: spacing.md,
    },

    // ---- Top Bar ----
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    roundBadge: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    roundText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.text.secondary,
    },
    psychicBadge: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    psychicBadgeActive: {
        borderColor: colors.gold[500] + '30',
        backgroundColor: colors.surface.goldSubtle,
    },
    psychicText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.text.muted,
        flex: 1,
    },
    psychicTextActive: {
        color: colors.gold[400],
    },
    goldDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.gold[500],
    },

    // ---- Spectrum Card ----
    spectrumCard: {
        marginBottom: spacing.lg,
    },
    spectrumTitle: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: spacing.md,
    },
    spectrumLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    spectrumLabelLeft: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.azure[400],
    },
    spectrumLabelRight: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.coral[400],
    },

    // ---- Spectrum Bar ----
    spectrumBarWrapper: {
        width: SPECTRUM_WIDTH,
        height: 60,
        justifyContent: 'center',
        position: 'relative',
    },
    spectrumBar: {
        width: SPECTRUM_WIDTH,
        height: SPECTRUM_HEIGHT,
        borderRadius: SPECTRUM_HEIGHT / 2,
    },

    // ---- Target Marker ----
    targetMarker: {
        position: 'absolute',
        top: (60 - MARKER_SIZE) / 2 - SPECTRUM_HEIGHT / 2 + SPECTRUM_HEIGHT / 2,
        width: MARKER_SIZE,
        height: MARKER_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
    },
    targetDot: {
        width: MARKER_SIZE,
        height: MARKER_SIZE,
        borderRadius: MARKER_SIZE / 2,
        backgroundColor: colors.gold[500],
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.gold[500],
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 10,
        elevation: 8,
    },

    // ---- Guess Markers ----
    guessMarkerMine: {
        position: 'absolute',
        top: (60 - GUESS_MARKER_SIZE) / 2 - SPECTRUM_HEIGHT / 2 + SPECTRUM_HEIGHT / 2 - 22,
        alignItems: 'center',
    },
    guessNumberBubble: {
        backgroundColor: colors.obsidian[700],
        paddingHorizontal: spacing.xs + 2,
        paddingVertical: 2,
        borderRadius: 6,
        marginBottom: 4,
    },
    guessNumberText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '700',
        color: colors.text.primary,
    },
    myGuessDot: {
        width: GUESS_MARKER_SIZE,
        height: GUESS_MARKER_SIZE,
        borderRadius: GUESS_MARKER_SIZE / 2,
        backgroundColor: colors.text.primary,
        borderWidth: 2,
        borderColor: colors.obsidian[900],
    },
    playerGuessMarker: {
        position: 'absolute',
        top: (60 - GUESS_MARKER_SIZE) / 2,
        width: GUESS_MARKER_SIZE,
        height: GUESS_MARKER_SIZE,
        borderRadius: GUESS_MARKER_SIZE / 2,
        borderWidth: 2,
        borderColor: colors.obsidian[900],
    },

    // ---- Scale ----
    scaleNumbers: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: spacing.xs,
    },
    scaleText: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
    },

    // ---- Action Card (Psychic / Guesser) ----
    actionCard: {
        marginBottom: spacing.lg,
    },
    actionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.xs,
    },
    actionTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
    },
    actionHint: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        marginBottom: spacing.md,
    },
    clueInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    clueInput: {
        flex: 1,
        backgroundColor: colors.obsidian[800],
        borderRadius: 12,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },

    // ---- Clue Display ----
    clueLabel: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        textAlign: 'center',
        marginBottom: spacing.xs,
    },
    clueDisplay: {
        fontSize: 32,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.gold[400],
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    guessDivider: {
        height: 1,
        backgroundColor: colors.border.subtle,
        marginBottom: spacing.md,
    },
    guessInstructions: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    guessValue: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    guessValueBold: {
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
        fontSize: typography.fontSize.xl,
    },

    // ---- Waiting ----
    waitingCard: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing['2xl'],
        marginBottom: spacing.lg,
    },
    waitingText: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        textAlign: 'center',
        marginTop: spacing.md,
    },

    // ---- Reveal ----
    revealCard: {
        marginBottom: spacing.lg,
    },
    revealTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    revealTarget: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        marginBottom: spacing.md,
    },
    revealTargetValue: {
        fontWeight: '700',
        color: colors.gold[400],
        fontSize: typography.fontSize.xl,
    },
    scoresList: {
        gap: spacing.sm,
    },
    scoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
    },
    scorePlayerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        flex: 1,
    },
    scoreColorDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    scorePlayerName: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
    },
    scoreDetails: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    scoreGuessText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
    },
    scorePointsText: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.emerald[400],
    },

    // ---- Scoreboard ----
    scoresCard: {
        marginBottom: spacing.lg,
    },
    scoresTitle: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: spacing.md,
    },
    scoreboardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
    },
    scoreboardRank: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        color: colors.text.muted,
        width: 30,
    },
    scoreboardNameRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    scoreboardName: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
    },
    scoreboardPoints: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.gold[400],
    },
});
