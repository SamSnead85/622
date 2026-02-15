// ============================================
// Cipher — Strategic Word Deduction Game
// 5x5 grid, two teams, spymasters give clues
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    ScrollView,
    TouchableOpacity,
    Dimensions,
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
import { ScreenHeader, GlassCard, Button, LoadingView, ErrorBoundary } from '../../../components';
import { useTheme } from '../../../contexts/ThemeContext';
import { useGameStore, useAuthStore } from '../../../stores';
import { socketManager } from '../../../lib/socket';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = spacing.lg;
const GRID_GAP = 4;
const TILE_COUNT = 5;
const TILE_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (TILE_COUNT - 1)) / TILE_COUNT;
const TILE_HEIGHT = TILE_WIDTH * 0.65;

// ============================================
// Types
// ============================================

type WordType = 'teamA' | 'teamB' | 'neutral' | 'trap';
type Team = 'A' | 'B';
type Phase = 'clue' | 'guessing' | 'reveal' | 'waiting';

interface WordTile {
    word: string;
    type: WordType;
    revealed: boolean;
    revealedBy?: Team;
}

// ============================================
// Color Maps
// ============================================

const REVEAL_COLORS: Record<WordType, string> = {
    teamA: colors.azure[500],
    teamB: colors.coral[500],
    neutral: colors.obsidian[600],
    trap: colors.gold[500],
};

const SPYMASTER_BORDER_COLORS: Record<WordType, string> = {
    teamA: colors.azure[400],
    teamB: colors.coral[400],
    neutral: colors.obsidian[400],
    trap: colors.gold[400],
};

const TEAM_COLORS: Record<Team, string> = {
    A: colors.azure[500],
    B: colors.coral[500],
};

// ============================================
// Cipher Game Screen
// ============================================

export default function CipherGameScreen() {
    const router = useRouter();
    const { code } = useLocalSearchParams<{ code: string }>();
    const gameStore = useGameStore();
    const authStore = useAuthStore();
    const myUserId = authStore.user?.id;
    const { colors: c } = useTheme();

    // ---- Game State ----
    const [words, setWords] = useState<WordTile[]>([]);
    const [currentTeam, setCurrentTeam] = useState<Team>('A');
    const [phase, setPhase] = useState<Phase>('waiting');
    const [myTeam, setMyTeam] = useState<Team | null>(null);
    const [isSpymaster, setIsSpymaster] = useState(false);
    const [teamAScore, setTeamAScore] = useState(0);
    const [teamBScore, setTeamBScore] = useState(0);
    const [teamATotal, setTeamATotal] = useState(0);
    const [teamBTotal, setTeamBTotal] = useState(0);
    const [clueText, setClueText] = useState('');
    const [clueNumber, setClueNumber] = useState(1);
    const [currentClue, setCurrentClue] = useState('');
    const [currentClueNumber, setCurrentClueNumber] = useState(0);
    const [guessesRemaining, setGuessesRemaining] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [winner, setWinner] = useState<Team | null>(null);

    // ---- Animation Values ----
    const teamIndicatorAnim = useSharedValue(0);

    // ---- Derived Data ----
    const players = gameStore.players;
    const round = gameStore.round;
    const isMyTurn = currentTeam === myTeam;
    const canGiveClue = isSpymaster && isMyTurn && phase === 'clue';
    const canGuess = !isSpymaster && isMyTurn && phase === 'guessing';

    // ---- Animate team change ----
    useEffect(() => {
        teamIndicatorAnim.value = withTiming(currentTeam === 'A' ? 0 : 1, { duration: 400 });
    }, [currentTeam]);

    // ---- Socket Listeners ----
    useEffect(() => {
        const unsubs = [
            socketManager.on('game:update', (data) => {
                gameStore.updateFromDelta(data);

                const gd = data.gameData;
                if (gd) {
                    if (gd.words) setWords(gd.words);
                    if (gd.currentTeam) setCurrentTeam(gd.currentTeam);
                    if (gd.phase) setPhase(gd.phase);
                    if (gd.myTeam) setMyTeam(gd.myTeam);
                    if (gd.isSpymaster !== undefined) setIsSpymaster(gd.isSpymaster);
                    if (gd.teamAScore !== undefined) setTeamAScore(gd.teamAScore);
                    if (gd.teamBScore !== undefined) setTeamBScore(gd.teamBScore);
                    if (gd.teamATotal !== undefined) setTeamATotal(gd.teamATotal);
                    if (gd.teamBTotal !== undefined) setTeamBTotal(gd.teamBTotal);
                    if (gd.currentClue) setCurrentClue(gd.currentClue);
                    if (gd.currentClueNumber !== undefined) setCurrentClueNumber(gd.currentClueNumber);
                    if (gd.guessesRemaining !== undefined) setGuessesRemaining(gd.guessesRemaining);
                    if (gd.gameOver !== undefined) setGameOver(gd.gameOver);
                    if (gd.winner) setWinner(gd.winner);

                    // Handle individual tile reveals
                    if (gd.revealedIndex !== undefined) {
                        setWords((prev) =>
                            prev.map((w, i) =>
                                i === gd.revealedIndex
                                    ? { ...w, revealed: true, revealedBy: gd.revealedBy }
                                    : w,
                            ),
                        );
                    }
                }
            }),
            socketManager.on('game:round-start', (data) => {
                setClueText('');
                setClueNumber(1);
                setCurrentClue('');
                setCurrentClueNumber(0);
                setGuessesRemaining(0);

                if (data.gameData) {
                    if (data.gameData.words) setWords(data.gameData.words);
                    if (data.gameData.currentTeam) setCurrentTeam(data.gameData.currentTeam);
                    if (data.gameData.phase) setPhase(data.gameData.phase);
                    if (data.gameData.myTeam) setMyTeam(data.gameData.myTeam);
                    if (data.gameData.isSpymaster !== undefined) setIsSpymaster(data.gameData.isSpymaster);
                    if (data.gameData.teamATotal !== undefined) setTeamATotal(data.gameData.teamATotal);
                    if (data.gameData.teamBTotal !== undefined) setTeamBTotal(data.gameData.teamBTotal);
                }
            }),
            socketManager.on('game:round-end', (data) => {
                gameStore.setRoundEnd(data);
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
            if (gd.words) setWords(gd.words);
            if (gd.currentTeam) setCurrentTeam(gd.currentTeam);
            if (gd.phase) setPhase(gd.phase);
            if (gd.myTeam) setMyTeam(gd.myTeam);
            if (gd.isSpymaster !== undefined) setIsSpymaster(gd.isSpymaster);
            if (gd.teamAScore !== undefined) setTeamAScore(gd.teamAScore);
            if (gd.teamBScore !== undefined) setTeamBScore(gd.teamBScore);
            if (gd.teamATotal !== undefined) setTeamATotal(gd.teamATotal);
            if (gd.teamBTotal !== undefined) setTeamBTotal(gd.teamBTotal);
            if (gd.currentClue) setCurrentClue(gd.currentClue);
            if (gd.currentClueNumber !== undefined) setCurrentClueNumber(gd.currentClueNumber);
            if (gd.guessesRemaining !== undefined) setGuessesRemaining(gd.guessesRemaining);
        }
    }, []);

    // ---- Actions ----
    const handleGiveClue = useCallback(() => {
        const word = clueText.trim().split(/\s+/)[0]; // Single word
        if (!word) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        gameStore.sendAction('clue', { clue: word, number: clueNumber });
        setClueText('');
    }, [clueText, clueNumber, gameStore]);

    const handleWordTap = useCallback(
        (index: number) => {
            if (!canGuess) return;
            if (words[index]?.revealed) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            gameStore.sendAction('guess', { index });
        },
        [canGuess, words, gameStore],
    );

    const handleEndTurn = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        gameStore.sendAction('end_turn', {});
    }, [gameStore]);

    // ---- Get reveal color ----
    const getRevealColor = (type: WordType): string => REVEAL_COLORS[type];
    const getSpymasterColor = (type: WordType): string => SPYMASTER_BORDER_COLORS[type];

    // ---- Team Indicator Animated Style ----
    const teamIndicatorStyle = useAnimatedStyle(() => ({
        backgroundColor: teamIndicatorAnim.value < 0.5
            ? colors.azure[500]
            : colors.coral[500],
    }));

    // ---- Loading State ----
    if (gameStore.status === 'idle') {
        return (
            <ErrorBoundary>
            <View style={[styles.container, { backgroundColor: c.background }]}>
                <LinearGradient
                    colors={[c.obsidian[900], c.obsidian[800], c.obsidian[900]]}
                    style={StyleSheet.absoluteFill}
                />
                <ScreenHeader title="Cipher" showBack noBorder />
                <LoadingView message="Connecting to game..." />
            </View>
            </ErrorBoundary>
        );
    }

    return (
        <ErrorBoundary>
        <View style={[styles.container, { backgroundColor: c.background }]}>
            <LinearGradient
                colors={[c.obsidian[900], c.obsidian[800], c.obsidian[900]]}
                style={StyleSheet.absoluteFill}
            />
            <ScreenHeader title="Cipher" showBack noBorder />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ---- Top Bar: Team Scores ---- */}
                <Animated.View entering={FadeInDown.delay(100).duration(500)}>
                    <View style={styles.topBar}>
                        {/* Team A Score */}
                        <GlassCard
                            style={[
                                styles.teamScoreCard,
                                currentTeam === 'A' && styles.teamScoreCardActive,
                                { borderColor: colors.azure[500] + (currentTeam === 'A' ? '60' : '20') },
                            ]}
                            padding="sm"
                        >
                            <View style={[styles.teamDot, { backgroundColor: colors.azure[500] }]} />
                            <Text style={[styles.teamLabel, { color: colors.azure[400] }]}>
                                Team A
                            </Text>
                            <Text style={[styles.teamScore, { color: colors.azure[400] }]}>
                                {teamAScore}/{teamATotal}
                            </Text>
                        </GlassCard>

                        {/* Round */}
                        <View style={styles.roundCenter}>
                            <Text style={styles.roundNumber}>R{round}</Text>
                            <Animated.View style={[styles.turnIndicator, teamIndicatorStyle]} />
                        </View>

                        {/* Team B Score */}
                        <GlassCard
                            style={[
                                styles.teamScoreCard,
                                currentTeam === 'B' && styles.teamScoreCardActive,
                                { borderColor: colors.coral[500] + (currentTeam === 'B' ? '60' : '20') },
                            ]}
                            padding="sm"
                        >
                            <View style={[styles.teamDot, { backgroundColor: colors.coral[500] }]} />
                            <Text style={[styles.teamLabel, { color: colors.coral[400] }]}>
                                Team B
                            </Text>
                            <Text style={[styles.teamScore, { color: colors.coral[400] }]}>
                                {teamBScore}/{teamBTotal}
                            </Text>
                        </GlassCard>
                    </View>

                    {/* My Team & Role */}
                    <View style={styles.myInfoRow}>
                        {myTeam && (
                            <View
                                style={[
                                    styles.myTeamBadge,
                                    { backgroundColor: TEAM_COLORS[myTeam] + '15', borderColor: TEAM_COLORS[myTeam] + '30' },
                                ]}
                            >
                                <View style={[styles.myTeamDot, { backgroundColor: TEAM_COLORS[myTeam] }]} />
                                <Text style={[styles.myTeamText, { color: TEAM_COLORS[myTeam] }]}>
                                    Team {myTeam}
                                </Text>
                            </View>
                        )}
                        {isSpymaster && (
                            <View style={styles.spymasterBadge}>
                                <Ionicons name="eye" size={12} color={colors.gold[400]} />
                                <Text style={styles.spymasterText}>Spymaster</Text>
                            </View>
                        )}
                        {isMyTurn && (
                            <View style={styles.turnBadge}>
                                <Text style={styles.turnBadgeText}>Your Turn</Text>
                            </View>
                        )}
                    </View>
                </Animated.View>

                {/* ---- Word Grid ---- */}
                <Animated.View entering={FadeInDown.delay(200).duration(500)}>
                    <View style={styles.grid} accessibilityRole="grid" accessibilityLabel="Word grid">
                        {words.map((tile, index) => {
                            const isRevealed = tile.revealed;
                            const revealBg = isRevealed ? getRevealColor(tile.type) : undefined;
                            const spymasterBorder =
                                isSpymaster && !isRevealed
                                    ? getSpymasterColor(tile.type)
                                    : undefined;
                            const isTrap = isRevealed && tile.type === 'trap';

                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.wordTile,
                                        isRevealed && { backgroundColor: revealBg, borderColor: revealBg },
                                        !isRevealed && spymasterBorder && {
                                            borderColor: spymasterBorder,
                                            borderWidth: 2,
                                        },
                                        isRevealed && styles.wordTileRevealed,
                                    ]}
                                    onPress={() => handleWordTap(index)}
                                    disabled={!canGuess || isRevealed}
                                    activeOpacity={canGuess && !isRevealed ? 0.7 : 1}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Word: ${tile.word}${isRevealed ? `, ${tile.type}` : ''}`}
                                    accessibilityState={{ disabled: !canGuess || isRevealed }}
                                >
                    {isTrap && (
                        <View style={styles.trapIcon}>
                            <Ionicons name="skull" size={12} color={colors.text.inverse} />
                        </View>
                    )}
                                    <Text
                                        style={[
                                            styles.wordText,
                                            isRevealed && styles.wordTextRevealed,
                                        ]}
                                        numberOfLines={1}
                                        adjustsFontSizeToFit
                                        minimumFontScale={0.7}
                                    >
                                        {tile.word}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </Animated.View>

                {/* ---- Clue Area (Spymaster) ---- */}
                {canGiveClue && (
                    <Animated.View entering={FadeInDown.delay(300).duration(500)}>
                        <GlassCard style={styles.clueCard} padding="md">
                            <Text style={styles.clueCardTitle}>Give a Clue</Text>
                            <View style={styles.clueInputRow}>
                                <TextInput
                                    style={styles.clueInput}
                                    placeholder="One word..."
                                    placeholderTextColor={colors.text.muted}
                                    value={clueText}
                                    onChangeText={(t) => setClueText(t.replace(/\s+/g, '').slice(0, 20))}
                                    maxLength={20}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    accessibilityLabel="Clue word input"
                                />
                                {/* Number Picker */}
                                <View style={styles.numberPicker}>
                                    <TouchableOpacity
                                        style={styles.numberBtn}
                                        onPress={() => {
                                            Haptics.selectionAsync();
                                            setClueNumber((n) => Math.max(1, n - 1));
                                        }}
                                        accessibilityRole="button"
                                        accessibilityLabel="Decrease number"
                                    >
                                        <Ionicons name="remove" size={16} color={colors.text.primary} />
                                    </TouchableOpacity>
                                    <Text style={styles.numberValue}>{clueNumber}</Text>
                                    <TouchableOpacity
                                        style={styles.numberBtn}
                                        onPress={() => {
                                            Haptics.selectionAsync();
                                            setClueNumber((n) => Math.min(5, n + 1));
                                        }}
                                        accessibilityRole="button"
                                        accessibilityLabel="Increase number"
                                    >
                                        <Ionicons name="add" size={16} color={colors.text.primary} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <Button
                                title="Give Clue"
                                onPress={handleGiveClue}
                                disabled={!clueText.trim()}
                                icon="send"
                                fullWidth
                                style={{ marginTop: spacing.md }}
                            />
                        </GlassCard>
                    </Animated.View>
                )}

                {/* ---- Clue Display (Guessers) ---- */}
                {phase === 'guessing' && currentClue && (
                    <Animated.View entering={FadeInDown.delay(300).duration(500)}>
                        <GlassCard style={styles.clueDisplayCard} padding="md">
                            <Text style={styles.clueDisplayLabel}>Current Clue</Text>
                            <View style={styles.clueDisplayRow}>
                                <Text
                                    style={[
                                        styles.clueDisplayText,
                                        { color: TEAM_COLORS[currentTeam] },
                                    ]}
                                    accessibilityLabel={`Clue: ${currentClue}, ${currentClueNumber} words`}
                                >
                                    {currentClue}
                                </Text>
                                <View
                                    style={[
                                        styles.clueNumberBadge,
                                        { backgroundColor: TEAM_COLORS[currentTeam] + '20' },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.clueNumberText,
                                            { color: TEAM_COLORS[currentTeam] },
                                        ]}
                                    >
                                        {currentClueNumber}
                                    </Text>
                                </View>
                            </View>
                            {guessesRemaining > 0 && (
                                <Text style={styles.guessesRemainingText}>
                                    {guessesRemaining} guess{guessesRemaining !== 1 ? 'es' : ''} remaining
                                </Text>
                            )}
                        </GlassCard>
                    </Animated.View>
                )}

                {/* ---- Waiting for Spymaster ---- */}
                {phase === 'clue' && !isSpymaster && isMyTurn && (
                    <Animated.View entering={FadeInDown.delay(300).duration(500)}>
                        <GlassCard style={styles.waitingCard} padding="md">
                            <Ionicons name="hourglass" size={22} color={colors.gold[400]} />
                            <Text style={styles.waitingText}>
                                Waiting for your Spymaster's clue...
                            </Text>
                        </GlassCard>
                    </Animated.View>
                )}

                {/* ---- Opponent's Turn ---- */}
                {!isMyTurn && !gameOver && (
                    <Animated.View entering={FadeInDown.delay(300).duration(500)}>
                        <GlassCard style={styles.waitingCard} padding="md">
                            <Ionicons name="eye" size={22} color={colors.text.muted} />
                            <Text style={styles.waitingText}>
                                Team {currentTeam === 'A' ? 'A' : 'B'} is playing...
                            </Text>
                        </GlassCard>
                    </Animated.View>
                )}

                {/* ---- End Turn Button ---- */}
                {canGuess && guessesRemaining >= 0 && (
                    <Animated.View entering={FadeInDown.delay(350).duration(400)}>
                        <Button
                            title="End Turn"
                            onPress={handleEndTurn}
                            variant="secondary"
                            icon="stop-circle"
                            fullWidth
                            style={styles.endTurnButton}
                        />
                    </Animated.View>
                )}

                {/* ---- Game Over ---- */}
                {gameOver && winner && (
                    <Animated.View entering={FadeInDown.delay(200).duration(600)}>
                        <GlassCard
                            style={[
                                styles.gameOverCard,
                                { borderColor: TEAM_COLORS[winner] + '40' },
                            ]}
                            padding="lg"
                        >
                            <Ionicons
                                name="trophy"
                                size={40}
                                color={colors.gold[400]}
                            />
                            <Text style={styles.gameOverTitle}>Game Over!</Text>
                            <Text
                                style={[
                                    styles.gameOverWinner,
                                    { color: TEAM_COLORS[winner] },
                                ]}
                            >
                                Team {winner} Wins!
                            </Text>
                        </GlassCard>
                    </Animated.View>
                )}

                {/* ---- Active Team Indicator Bar ---- */}
                <Animated.View entering={FadeInDown.delay(400).duration(500)}>
                    <View style={styles.teamBarContainer}>
                        <View
                            style={[
                                styles.teamBar,
                                {
                                    backgroundColor: TEAM_COLORS[currentTeam] + '20',
                                    borderColor: TEAM_COLORS[currentTeam] + '40',
                                },
                            ]}
                        >
                            <View
                                style={[styles.teamBarDot, { backgroundColor: TEAM_COLORS[currentTeam] }]}
                            />
                            <Text
                                style={[styles.teamBarText, { color: TEAM_COLORS[currentTeam] }]}
                            >
                                Team {currentTeam}'s Turn
                            </Text>
                        </View>
                    </View>
                </Animated.View>

                {/* ---- Player List ---- */}
                <Animated.View entering={FadeInDown.delay(500).duration(500)}>
                    <GlassCard style={styles.playersCard} padding="md">
                        <Text style={styles.playersTitle}>Players</Text>
                        {players.map((player) => (
                            <View key={player.id} style={styles.playerRow}>
                                <Text style={styles.playerName}>{player.name}</Text>
                                <Text style={styles.playerScore}>{player.score}</Text>
                            </View>
                        ))}
                    </GlassCard>
                </Animated.View>

                <View style={{ height: spacing['3xl'] }} />
            </ScrollView>
        </View>
        </ErrorBoundary>
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
        paddingHorizontal: GRID_PADDING,
        paddingTop: spacing.md,
    },

    // ---- Top Bar ----
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    teamScoreCard: {
        flex: 1,
        alignItems: 'center',
        gap: spacing.xxs,
        borderWidth: 1,
    },
    teamScoreCardActive: {
        backgroundColor: colors.surface.glass,
    },
    teamDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    teamLabel: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
    },
    teamScore: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
    },
    roundCenter: {
        alignItems: 'center',
        gap: spacing.xs,
    },
    roundNumber: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.muted,
    },
    turnIndicator: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },

    // ---- My Info ----
    myInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.lg,
        flexWrap: 'wrap',
    },
    myTeamBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs + 2,
        borderRadius: 8,
        borderWidth: 1,
    },
    myTeamDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    myTeamText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
    },
    spymasterBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xxs,
        backgroundColor: colors.surface.goldSubtle,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs + 2,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.gold[500] + '30',
    },
    spymasterText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.gold[400],
    },
    turnBadge: {
        backgroundColor: colors.emerald[500] + '15',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs + 2,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.emerald[500] + '30',
    },
    turnBadgeText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.emerald[400],
    },

    // ---- Word Grid ----
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: GRID_GAP,
        marginBottom: spacing.lg,
    },
    wordTile: {
        width: TILE_WIDTH,
        height: TILE_HEIGHT,
        borderRadius: 8,
        backgroundColor: colors.surface.glass,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xxs + 1,
        overflow: 'hidden',
    },
    wordTileRevealed: {
        opacity: 0.85,
    },
    trapIcon: {
        position: 'absolute',
        top: 3,
        right: 3,
    },
    wordText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.text.primary,
        textAlign: 'center',
    },
    wordTextRevealed: {
        color: colors.text.inverse,
        fontWeight: '700',
    },

    // ---- Clue Card (Spymaster) ----
    clueCard: {
        marginBottom: spacing.lg,
    },
    clueCardTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
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
    numberPicker: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.obsidian[800],
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        overflow: 'hidden',
    },
    numberBtn: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
    },
    numberValue: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.gold[400],
        minWidth: 24,
        textAlign: 'center',
    },

    // ---- Clue Display ----
    clueDisplayCard: {
        marginBottom: spacing.lg,
    },
    clueDisplayLabel: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: spacing.sm,
    },
    clueDisplayRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
        marginBottom: spacing.sm,
    },
    clueDisplayText: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
    },
    clueNumberBadge: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    clueNumberText: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
    },
    guessesRemainingText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        textAlign: 'center',
    },

    // ---- Waiting ----
    waitingCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    waitingText: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        flex: 1,
    },

    // ---- End Turn ----
    endTurnButton: {
        marginBottom: spacing.lg,
    },

    // ---- Game Over ----
    gameOverCard: {
        alignItems: 'center',
        marginBottom: spacing.xl,
        borderWidth: 1,
    },
    gameOverTitle: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
    },
    gameOverWinner: {
        fontSize: typography.fontSize['3xl'],
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
    },

    // ---- Team Bar ----
    teamBarContainer: {
        marginBottom: spacing.lg,
    },
    teamBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: 10,
        borderWidth: 1,
    },
    teamBarDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    teamBarText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
    },

    // ---- Players Card ----
    playersCard: {
        marginBottom: spacing.lg,
    },
    playersTitle: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: spacing.md,
    },
    playerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
    },
    playerName: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
    },
    playerScore: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.gold[400],
    },
});
