// ============================================
// Infiltrator — Social Deduction Game
// Find the spy, protect the secret word
// ============================================

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { ScreenHeader, GlassCard, Button, LoadingView } from '../../../components';
import { useGameStore, useAuthStore } from '../../../stores';
import { socketManager } from '../../../lib/socket';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// Types
// ============================================

type Phase = 'role_reveal' | 'questioning' | 'voting' | 'reveal' | 'guess_word' | 'waiting';

interface QAExchange {
    questionerId: string;
    questionerName: string;
    targetId: string;
    targetName: string;
    question: string;
    answer?: string;
}

interface VoteResult {
    playerId: string;
    name: string;
    votes: number;
}

// ============================================
// Infiltrator Game Screen
// ============================================

export default function InfiltratorGameScreen() {
    const router = useRouter();
    const { code } = useLocalSearchParams<{ code: string }>();
    const gameStore = useGameStore();
    const authStore = useAuthStore();
    const myUserId = authStore.user?.id;
    const scrollRef = useRef<ScrollView>(null);

    // ---- Game State ----
    const [phase, setPhase] = useState<Phase>('waiting');
    const [isInfiltrator, setIsInfiltrator] = useState(false);
    const [secretWord, setSecretWord] = useState('');
    const [questionRound, setQuestionRound] = useState(1);
    const [totalQuestionRounds, setTotalQuestionRounds] = useState(3);
    const [currentQuestionerId, setCurrentQuestionerId] = useState<string | null>(null);
    const [currentTargetId, setCurrentTargetId] = useState<string | null>(null);
    const [qaHistory, setQaHistory] = useState<QAExchange[]>([]);
    const [questionText, setQuestionText] = useState('');
    const [answerText, setAnswerText] = useState('');
    const [timer, setTimer] = useState(60);
    const [selectedVote, setSelectedVote] = useState<string | null>(null);
    const [hasVoted, setHasVoted] = useState(false);
    const [voteResults, setVoteResults] = useState<VoteResult[]>([]);
    const [infiltratorId, setInfiltratorId] = useState<string | null>(null);
    const [infiltratorCaught, setInfiltratorCaught] = useState(false);
    const [wordGuess, setWordGuess] = useState('');
    const [hasGuessedWord, setHasGuessedWord] = useState(false);
    const [revealComplete, setRevealComplete] = useState(false);

    // ---- Animation Values ----
    const roleCardScale = useSharedValue(0);
    const roleCardOpacity = useSharedValue(0);
    const revealScale = useSharedValue(0);

    // ---- Derived Data ----
    const players = gameStore.players;
    const round = gameStore.round;
    const totalRounds = gameStore.totalRounds;

    const isQuestioner = currentQuestionerId === myUserId;
    const isTarget = currentTargetId === myUserId;

    const currentQuestioner = useMemo(
        () => players.find((p) => p.userId === currentQuestionerId || p.id === currentQuestionerId),
        [players, currentQuestionerId],
    );
    const currentTarget = useMemo(
        () => players.find((p) => p.userId === currentTargetId || p.id === currentTargetId),
        [players, currentTargetId],
    );

    // ---- Timer Countdown ----
    useEffect(() => {
        if (phase !== 'questioning' || timer <= 0) return;
        const interval = setInterval(() => {
            setTimer((t) => {
                if (t <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return t - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [phase]);

    // ---- Socket Listeners ----
    useEffect(() => {
        const unsubs = [
            socketManager.on('game:update', (data) => {
                gameStore.updateFromDelta(data);

                const gd = data.gameData;
                if (gd) {
                    if (gd.phase) setPhase(gd.phase);
                    if (gd.isInfiltrator !== undefined) setIsInfiltrator(gd.isInfiltrator);
                    if (gd.secretWord) setSecretWord(gd.secretWord);
                    if (gd.questionRound) setQuestionRound(gd.questionRound);
                    if (gd.totalQuestionRounds) setTotalQuestionRounds(gd.totalQuestionRounds);
                    if (gd.currentQuestionerId) setCurrentQuestionerId(gd.currentQuestionerId);
                    if (gd.currentTargetId) setCurrentTargetId(gd.currentTargetId);
                    if (gd.timer !== undefined) setTimer(gd.timer);
                    if (gd.infiltratorId) setInfiltratorId(gd.infiltratorId);
                    if (gd.infiltratorCaught !== undefined) setInfiltratorCaught(gd.infiltratorCaught);

                    if (gd.qaHistory) {
                        setQaHistory(gd.qaHistory);
                    } else if (gd.newQA) {
                        setQaHistory((prev) => [...prev, gd.newQA]);
                    }

                    if (gd.voteResults) setVoteResults(gd.voteResults);
                }
            }),
            socketManager.on('game:round-start', (data) => {
                // Reset round state
                setPhase('role_reveal');
                setQaHistory([]);
                setQuestionText('');
                setAnswerText('');
                setSelectedVote(null);
                setHasVoted(false);
                setVoteResults([]);
                setWordGuess('');
                setHasGuessedWord(false);
                setRevealComplete(false);
                setTimer(60);

                // Animate role card in
                roleCardScale.value = 0;
                roleCardOpacity.value = 0;
                roleCardScale.value = withSpring(1, { damping: 12, stiffness: 120 });
                roleCardOpacity.value = withTiming(1, { duration: 800 });

                if (data.gameData) {
                    if (data.gameData.isInfiltrator !== undefined) setIsInfiltrator(data.gameData.isInfiltrator);
                    if (data.gameData.secretWord) setSecretWord(data.gameData.secretWord);
                    if (data.gameData.phase) setPhase(data.gameData.phase);
                    if (data.gameData.questionRound) setQuestionRound(data.gameData.questionRound);
                    if (data.gameData.totalQuestionRounds) setTotalQuestionRounds(data.gameData.totalQuestionRounds);
                }
            }),
            socketManager.on('game:round-end', (data) => {
                gameStore.setRoundEnd(data);
                setPhase('reveal');

                revealScale.value = withSequence(
                    withSpring(1.2, { damping: 8 }),
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
            if (gd.phase) setPhase(gd.phase);
            if (gd.isInfiltrator !== undefined) setIsInfiltrator(gd.isInfiltrator);
            if (gd.secretWord) setSecretWord(gd.secretWord);
            if (gd.questionRound) setQuestionRound(gd.questionRound);
            if (gd.currentQuestionerId) setCurrentQuestionerId(gd.currentQuestionerId);
            if (gd.currentTargetId) setCurrentTargetId(gd.currentTargetId);
            if (gd.qaHistory) setQaHistory(gd.qaHistory);
            if (gd.infiltratorId) setInfiltratorId(gd.infiltratorId);
        }

        // Initial role reveal animation
        roleCardScale.value = withSpring(1, { damping: 12, stiffness: 120 });
        roleCardOpacity.value = withTiming(1, { duration: 800 });
    }, []);

    // ---- Actions ----
    const handleSendQuestion = useCallback(() => {
        const q = questionText.trim();
        if (!q) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        gameStore.sendAction('question', { question: q });
        setQuestionText('');
    }, [questionText, gameStore]);

    const handleSendAnswer = useCallback(() => {
        const a = answerText.trim();
        if (!a) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        gameStore.sendAction('answer', { answer: a });
        setAnswerText('');
    }, [answerText, gameStore]);

    const handleVote = useCallback(() => {
        if (!selectedVote || hasVoted) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        gameStore.sendAction('vote', { playerId: selectedVote });
        setHasVoted(true);
    }, [selectedVote, hasVoted, gameStore]);

    const handleGuessWord = useCallback(() => {
        const guess = wordGuess.trim();
        if (!guess || hasGuessedWord) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        gameStore.sendAction('guess_word', { word: guess });
        setHasGuessedWord(true);
    }, [wordGuess, hasGuessedWord, gameStore]);

    // ---- Animated Styles ----
    const roleCardAnimStyle = useAnimatedStyle(() => ({
        transform: [{ scale: roleCardScale.value }],
        opacity: roleCardOpacity.value,
    }));

    const revealAnimStyle = useAnimatedStyle(() => ({
        transform: [{ scale: revealScale.value }],
    }));

    // ---- Loading State ----
    if (gameStore.status === 'idle') {
        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={[colors.obsidian[900], colors.obsidian[800], colors.obsidian[900]]}
                    style={StyleSheet.absoluteFill}
                />
                <ScreenHeader title="Infiltrator" showBack noBorder />
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
            <ScreenHeader title="Infiltrator" showBack noBorder />

            <ScrollView
                ref={scrollRef}
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ---- Round Counter ---- */}
                <Animated.View entering={FadeInDown.delay(100).duration(500)}>
                    <View style={styles.topBar}>
                        <GlassCard style={styles.roundBadge} padding="sm">
                            <Text style={styles.roundText}>
                                Round {round}/{totalRounds}
                            </Text>
                        </GlassCard>

                        {phase === 'questioning' && (
                            <GlassCard style={styles.timerBadge} padding="sm">
                                <Ionicons
                                    name="time"
                                    size={14}
                                    color={timer <= 10 ? colors.coral[500] : colors.text.muted}
                                />
                                <Text
                                    style={[
                                        styles.timerText,
                                        timer <= 10 && styles.timerTextUrgent,
                                    ]}
                                >
                                    {timer}s
                                </Text>
                            </GlassCard>
                        )}
                    </View>
                </Animated.View>

                {/* ---- Role Reveal ---- */}
                {phase === 'role_reveal' && (
                    <Animated.View style={roleCardAnimStyle}>
                        <GlassCard
                            style={[
                                styles.roleCard,
                                isInfiltrator ? styles.roleCardInfiltrator : styles.roleCardCitizen,
                            ]}
                            padding="lg"
                        >
                            <View style={styles.roleIconContainer}>
                                <Ionicons
                                    name={isInfiltrator ? 'eye-off' : 'shield-checkmark'}
                                    size={48}
                                    color={isInfiltrator ? colors.coral[400] : colors.gold[400]}
                                />
                            </View>

                            {isInfiltrator ? (
                                <>
                                    <Text style={styles.roleTitle}>You are the Infiltrator</Text>
                                    <Text style={styles.roleSubtitle}>
                                        Blend in and figure out the secret word. Don't get caught!
                                    </Text>
                                </>
                            ) : (
                                <>
                                    <Text style={styles.roleTitle}>Citizen</Text>
                                    <Text style={styles.roleSubtitle}>The secret word is:</Text>
                                    <Text
                                        style={styles.secretWordText}
                                        accessibilityLabel={`Secret word: ${secretWord}`}
                                    >
                                        {secretWord}
                                    </Text>
                                    <Text style={styles.roleHint}>
                                        Answer questions carefully — the Infiltrator is listening!
                                    </Text>
                                </>
                            )}
                        </GlassCard>
                    </Animated.View>
                )}

                {/* ---- Question Phase ---- */}
                {phase === 'questioning' && (
                    <Animated.View entering={FadeInDown.delay(200).duration(500)}>
                        {/* Current Turn Indicator */}
                        <GlassCard style={styles.turnCard} padding="md">
                            <Text style={styles.turnLabel}>Question Round {questionRound}/{totalQuestionRounds}</Text>
                            <View style={styles.turnPlayers}>
                                <View style={styles.turnPlayerItem}>
                                    <Ionicons name="chatbubble" size={16} color={colors.azure[400]} />
                                    <Text style={styles.turnPlayerName}>
                                        {isQuestioner ? 'Your turn to ask' : currentQuestioner?.name || '...'}
                                    </Text>
                                </View>
                                <Ionicons name="arrow-forward" size={14} color={colors.text.muted} />
                                <View style={styles.turnPlayerItem}>
                                    <Ionicons name="person" size={16} color={colors.emerald[400]} />
                                    <Text style={styles.turnPlayerName}>
                                        {isTarget ? 'You answer' : currentTarget?.name || '...'}
                                    </Text>
                                </View>
                            </View>
                        </GlassCard>

                        {/* Q&A History */}
                        {qaHistory.length > 0 && (
                            <View style={styles.qaContainer}>
                                <Text style={styles.qaTitle}>Conversation</Text>
                                {qaHistory.map((qa, index) => (
                                    <Animated.View
                                        key={index}
                                        entering={FadeInDown.delay(index * 50).duration(300)}
                                    >
                                        {/* Question Bubble */}
                                        <View style={styles.qaBubbleRow}>
                                            <View style={[styles.qaBubble, styles.questionBubble]}>
                                                <Text style={styles.qaBubbleName}>
                                                    {qa.questionerName}
                                                </Text>
                                                <Text style={styles.qaBubbleText}>
                                                    {qa.question}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Answer Bubble */}
                                        {qa.answer && (
                                            <View style={[styles.qaBubbleRow, styles.answerRow]}>
                                                <View style={[styles.qaBubble, styles.answerBubble]}>
                                                    <Text style={styles.qaBubbleName}>
                                                        {qa.targetName}
                                                    </Text>
                                                    <Text style={styles.qaBubbleText}>
                                                        {qa.answer}
                                                    </Text>
                                                </View>
                                            </View>
                                        )}
                                    </Animated.View>
                                ))}
                            </View>
                        )}

                        {/* Input Area */}
                        {isQuestioner && (
                            <GlassCard style={styles.inputCard} padding="md">
                                <Text style={styles.inputLabel}>Ask a question</Text>
                                <View style={styles.inputRow}>
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Type your question..."
                                        placeholderTextColor={colors.text.muted}
                                        value={questionText}
                                        onChangeText={setQuestionText}
                                        maxLength={200}
                                        multiline={false}
                                        returnKeyType="send"
                                        onSubmitEditing={handleSendQuestion}
                                        accessibilityLabel="Question input"
                                    />
                                    <Button
                                        title="Ask"
                                        onPress={handleSendQuestion}
                                        disabled={!questionText.trim()}
                                        icon="send"
                                        size="sm"
                                    />
                                </View>
                            </GlassCard>
                        )}

                        {isTarget && (
                            <GlassCard style={styles.inputCard} padding="md">
                                <Text style={styles.inputLabel}>Your answer</Text>
                                <View style={styles.inputRow}>
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Type your answer..."
                                        placeholderTextColor={colors.text.muted}
                                        value={answerText}
                                        onChangeText={setAnswerText}
                                        maxLength={200}
                                        multiline={false}
                                        returnKeyType="send"
                                        onSubmitEditing={handleSendAnswer}
                                        accessibilityLabel="Answer input"
                                    />
                                    <Button
                                        title="Answer"
                                        onPress={handleSendAnswer}
                                        disabled={!answerText.trim()}
                                        icon="send"
                                        size="sm"
                                    />
                                </View>
                            </GlassCard>
                        )}

                        {!isQuestioner && !isTarget && (
                            <GlassCard style={styles.observerCard} padding="md">
                                <Ionicons name="eye" size={22} color={colors.text.muted} />
                                <Text style={styles.observerText}>
                                    Watching the exchange...
                                </Text>
                            </GlassCard>
                        )}
                    </Animated.View>
                )}

                {/* ---- Vote Phase ---- */}
                {phase === 'voting' && (
                    <Animated.View entering={FadeInDown.delay(200).duration(500)}>
                        <Text style={styles.voteHeader}>Who is the Infiltrator?</Text>
                        <Text style={styles.voteSubheader}>
                            Discuss and cast your vote carefully
                        </Text>

                        <View style={styles.voteGrid}>
                            {players
                                .filter((p) => p.userId !== myUserId && p.id !== myUserId)
                                .map((player, index) => {
                                    const isSelected = selectedVote === (player.userId || player.id);
                                    const voteCount = voteResults.find(
                                        (v) => v.playerId === (player.userId || player.id),
                                    )?.votes;

                                    return (
                                        <Animated.View
                                            key={player.id}
                                            entering={FadeInDown.delay(100 + index * 80).duration(400)}
                                        >
                                            <TouchableOpacity
                                                style={[
                                                    styles.voteCard,
                                                    isSelected && styles.voteCardSelected,
                                                    hasVoted && !isSelected && styles.voteCardDimmed,
                                                ]}
                                                onPress={() => {
                                                    if (hasVoted) return;
                                                    Haptics.selectionAsync();
                                                    setSelectedVote(player.userId || player.id);
                                                }}
                                                disabled={hasVoted}
                                                activeOpacity={0.7}
                                                accessibilityRole="button"
                                                accessibilityLabel={`Vote for ${player.name}`}
                                                accessibilityState={{ selected: isSelected }}
                                            >
                                                <View style={styles.voteCardInner}>
                                                    <View
                                                        style={[
                                                            styles.voteAvatar,
                                                            isSelected && styles.voteAvatarSelected,
                                                        ]}
                                                    >
                                                        <Ionicons
                                                            name="person"
                                                            size={24}
                                                            color={
                                                                isSelected
                                                                    ? colors.coral[400]
                                                                    : colors.text.muted
                                                            }
                                                        />
                                                    </View>
                                                    <Text
                                                        style={[
                                                            styles.votePlayerName,
                                                            isSelected && styles.votePlayerNameSelected,
                                                        ]}
                                                        numberOfLines={1}
                                                    >
                                                        {player.name}
                                                    </Text>
                                                    {voteCount !== undefined && (
                                                        <View style={styles.voteBadge}>
                                                            <Text style={styles.voteBadgeText}>
                                                                {voteCount} vote{voteCount !== 1 ? 's' : ''}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </TouchableOpacity>
                                        </Animated.View>
                                    );
                                })}
                        </View>

                        {!hasVoted && (
                            <Button
                                title="Submit Vote"
                                onPress={handleVote}
                                disabled={!selectedVote}
                                icon="checkmark-circle"
                                fullWidth
                                style={styles.submitVoteButton}
                            />
                        )}

                        {hasVoted && (
                            <GlassCard style={styles.votedCard} padding="md">
                                <Ionicons name="checkmark-circle" size={24} color={colors.emerald[400]} />
                                <Text style={styles.votedText}>
                                    Vote submitted! Waiting for others...
                                </Text>
                            </GlassCard>
                        )}
                    </Animated.View>
                )}

                {/* ---- Reveal Phase ---- */}
                {phase === 'reveal' && (
                    <Animated.View entering={FadeInDown.delay(200).duration(600)}>
                        <Animated.View style={revealAnimStyle}>
                            <GlassCard
                                style={[
                                    styles.revealCard,
                                    infiltratorCaught ? styles.revealCardCaught : styles.revealCardEscaped,
                                ]}
                                padding="lg"
                            >
                                <Text style={styles.revealLabel}>The Infiltrator was...</Text>
                                <Text style={styles.revealName}>
                                    {players.find(
                                        (p) => p.userId === infiltratorId || p.id === infiltratorId,
                                    )?.name || 'Unknown'}
                                </Text>

                                <View style={styles.revealBadge}>
                                    <Ionicons
                                        name={infiltratorCaught ? 'lock-closed' : 'exit'}
                                        size={20}
                                        color={
                                            infiltratorCaught
                                                ? colors.emerald[400]
                                                : colors.coral[400]
                                        }
                                    />
                                    <Text
                                        style={[
                                            styles.revealBadgeText,
                                            {
                                                color: infiltratorCaught
                                                    ? colors.emerald[400]
                                                    : colors.coral[400],
                                            },
                                        ]}
                                    >
                                        {infiltratorCaught ? 'Caught!' : 'Escaped!'}
                                    </Text>
                                </View>

                                <Text style={styles.revealSecretWord}>
                                    Secret word: <Text style={styles.revealSecretWordValue}>{secretWord}</Text>
                                </Text>
                            </GlassCard>
                        </Animated.View>
                    </Animated.View>
                )}

                {/* ---- Infiltrator Word Guess (if caught) ---- */}
                {phase === 'guess_word' && isInfiltrator && (
                    <Animated.View entering={FadeInDown.delay(300).duration(500)}>
                        <GlassCard style={styles.guessWordCard} padding="md">
                            <Ionicons name="help-circle" size={28} color={colors.gold[400]} />
                            <Text style={styles.guessWordTitle}>
                                Last Chance!
                            </Text>
                            <Text style={styles.guessWordSubtitle}>
                                Guess the secret word for partial points
                            </Text>
                            <View style={styles.inputRow}>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Type your guess..."
                                    placeholderTextColor={colors.text.muted}
                                    value={wordGuess}
                                    onChangeText={setWordGuess}
                                    maxLength={50}
                                    autoCapitalize="none"
                                    returnKeyType="send"
                                    onSubmitEditing={handleGuessWord}
                                    accessibilityLabel="Word guess input"
                                />
                                <Button
                                    title="Guess"
                                    onPress={handleGuessWord}
                                    disabled={!wordGuess.trim() || hasGuessedWord}
                                    icon="send"
                                    size="sm"
                                />
                            </View>
                        </GlassCard>
                    </Animated.View>
                )}

                {phase === 'guess_word' && !isInfiltrator && (
                    <Animated.View entering={FadeInDown.delay(300).duration(500)}>
                        <GlassCard style={styles.observerCard} padding="md">
                            <Ionicons name="hourglass" size={22} color={colors.gold[400]} />
                            <Text style={styles.observerText}>
                                The Infiltrator is trying to guess the word...
                            </Text>
                        </GlassCard>
                    </Animated.View>
                )}

                {/* ---- Scoreboard ---- */}
                <Animated.View entering={FadeInDown.delay(400).duration(500)}>
                    <GlassCard style={styles.scoresCard} padding="md">
                        <Text style={styles.scoresTitle}>Scoreboard</Text>
                        {[...players]
                            .sort((a, b) => b.score - a.score)
                            .map((player, index) => {
                                const isInf = player.userId === infiltratorId || player.id === infiltratorId;
                                return (
                                    <View key={player.id} style={styles.scoreboardRow}>
                                        <Text style={styles.scoreboardRank}>#{index + 1}</Text>
                                        <View style={styles.scoreboardNameRow}>
                                            <Text style={styles.scoreboardName}>{player.name}</Text>
                                            {isInf && phase === 'reveal' && (
                                                <View style={styles.infiltratorTag}>
                                                    <Ionicons name="eye-off" size={10} color={colors.coral[400]} />
                                                </View>
                                            )}
                                        </View>
                                        <Text style={styles.scoreboardPoints}>{player.score}</Text>
                                    </View>
                                );
                            })}
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
    timerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    timerText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.secondary,
    },
    timerTextUrgent: {
        color: colors.coral[500],
    },

    // ---- Role Reveal ----
    roleCard: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    roleCardCitizen: {
        borderColor: colors.gold[500] + '30',
        backgroundColor: colors.surface.goldSubtle,
    },
    roleCardInfiltrator: {
        borderColor: colors.coral[500] + '30',
        backgroundColor: colors.surface.coralSubtle,
    },
    roleIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.obsidian[800],
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    roleTitle: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    roleSubtitle: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    secretWordText: {
        fontSize: typography.fontSize['3xl'],
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.gold[400],
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    roleHint: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        textAlign: 'center',
        fontStyle: 'italic',
    },

    // ---- Question Phase ----
    turnCard: {
        marginBottom: spacing.lg,
    },
    turnLabel: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: spacing.sm,
    },
    turnPlayers: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    turnPlayerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        flex: 1,
    },
    turnPlayerName: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
        flex: 1,
    },

    // ---- Q&A Chat ----
    qaContainer: {
        marginBottom: spacing.lg,
    },
    qaTitle: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: spacing.md,
    },
    qaBubbleRow: {
        flexDirection: 'row',
        marginBottom: spacing.sm,
    },
    answerRow: {
        justifyContent: 'flex-end',
    },
    qaBubble: {
        maxWidth: '80%',
        borderRadius: 14,
        padding: spacing.md,
    },
    questionBubble: {
        backgroundColor: colors.obsidian[700],
        borderBottomLeftRadius: 4,
    },
    answerBubble: {
        backgroundColor: colors.surface.azureSubtle,
        borderBottomRightRadius: 4,
        marginLeft: 'auto',
    },
    qaBubbleName: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.text.muted,
        marginBottom: spacing.xxs,
    },
    qaBubbleText: {
        fontSize: typography.fontSize.base,
        color: colors.text.primary,
        lineHeight: 22,
    },

    // ---- Input Card ----
    inputCard: {
        marginBottom: spacing.lg,
    },
    inputLabel: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.text.secondary,
        marginBottom: spacing.sm,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    textInput: {
        flex: 1,
        backgroundColor: colors.obsidian[800],
        borderRadius: 12,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        fontSize: typography.fontSize.base,
        color: colors.text.primary,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },

    // ---- Observer ----
    observerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    observerText: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        flex: 1,
    },

    // ---- Vote Phase ----
    voteHeader: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
        textAlign: 'center',
        marginBottom: spacing.xs,
    },
    voteSubheader: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },
    voteGrid: {
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    voteCard: {
        backgroundColor: colors.surface.glass,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        padding: spacing.md,
    },
    voteCardSelected: {
        borderColor: colors.coral[500],
        backgroundColor: colors.surface.coralSubtle,
    },
    voteCardDimmed: {
        opacity: 0.5,
    },
    voteCardInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    voteAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.obsidian[700],
        alignItems: 'center',
        justifyContent: 'center',
    },
    voteAvatarSelected: {
        backgroundColor: colors.coral[500] + '20',
    },
    votePlayerName: {
        fontSize: typography.fontSize.lg,
        fontWeight: '600',
        color: colors.text.primary,
        flex: 1,
    },
    votePlayerNameSelected: {
        color: colors.coral[400],
    },
    voteBadge: {
        backgroundColor: colors.obsidian[700],
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderRadius: 8,
    },
    voteBadgeText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.text.secondary,
    },
    submitVoteButton: {
        marginBottom: spacing.lg,
    },
    votedCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    votedText: {
        fontSize: typography.fontSize.base,
        color: colors.emerald[400],
        flex: 1,
    },

    // ---- Reveal ----
    revealCard: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    revealCardCaught: {
        borderColor: colors.emerald[500] + '30',
    },
    revealCardEscaped: {
        borderColor: colors.coral[500] + '30',
    },
    revealLabel: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        marginBottom: spacing.sm,
    },
    revealName: {
        fontSize: typography.fontSize['3xl'],
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    revealBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: 12,
        backgroundColor: colors.obsidian[800],
        marginBottom: spacing.lg,
    },
    revealBadgeText: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
    },
    revealSecretWord: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
    },
    revealSecretWordValue: {
        fontWeight: '700',
        color: colors.gold[400],
    },

    // ---- Guess Word ----
    guessWordCard: {
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    guessWordTitle: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.gold[400],
        marginTop: spacing.sm,
        marginBottom: spacing.xs,
    },
    guessWordSubtitle: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        marginBottom: spacing.lg,
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
    infiltratorTag: {
        backgroundColor: colors.coral[500] + '20',
        borderRadius: 6,
        padding: 2,
    },
    scoreboardPoints: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.gold[400],
    },
});
