// ============================================
// Family Feud — Team vs Team Survey Game
// Host display (castable to TV) + Player controller
// ============================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    ScrollView, Dimensions, KeyboardAvoidingView, Platform,
} from 'react-native';
import Animated, {
    FadeInDown, FadeIn, FadeOut, ZoomIn,
    useSharedValue, useAnimatedStyle,
    withTiming, withSpring, withSequence, withRepeat, Easing, interpolate,
} from 'react-native-reanimated';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '@zerog/ui';
import { GlassCard, LoadingView, ErrorBoundary } from '../../../components';
import { useGameStore } from '../../../stores';
import { useTheme } from '../../../contexts/ThemeContext';
import { socketManager } from '../../../lib/socket';

const { width: SW } = Dimensions.get('window');
const SLOT_W = (SW - spacing.lg * 2 - spacing.md) / 2;

interface SurveyAnswer { answer: string; points: number }
interface TeamData { name: string; playerIds: string[]; score: number }
interface Teams { team1: TeamData; team2: TeamData }
type Phase = 'team_setup' | 'faceoff' | 'faceoff_buzz' | 'play' | 'steal' | 'round_result';

// ---- Strike Overlay ----
function StrikeOverlay({ count }: { count: number }) {
    if (count === 0) return null;
    return (
        <Animated.View entering={ZoomIn.duration(300).springify()} exiting={FadeOut.duration(400)} style={st.strikeOverlay} pointerEvents="none">
            <View style={st.strikeRow}>
                {Array.from({ length: count }).map((_, i) => (
                    <Animated.View key={i} entering={ZoomIn.delay(i * 100).duration(250).springify()}>
                        <Text style={st.strikeX}>✕</Text>
                    </Animated.View>
                ))}
            </View>
        </Animated.View>
    );
}

// ---- Answer Slot with Flip ----
function AnswerSlot({ index, answer, points, revealed }: { index: number; answer: string; points: number; revealed: boolean }) {
    const { colors: c } = useTheme();
    const flip = useSharedValue(revealed ? 1 : 0);
    useEffect(() => { if (revealed) flip.value = withSpring(1, { damping: 12, stiffness: 200 }); }, [revealed, flip]);

    const front = useAnimatedStyle(() => ({
        transform: [{ perspective: 800 }, { rotateY: `${interpolate(flip.value, [0, 1], [0, 180])}deg` }],
        opacity: flip.value < 0.5 ? 1 : 0, backfaceVisibility: 'hidden' as const,
    }));
    const back = useAnimatedStyle(() => ({
        transform: [{ perspective: 800 }, { rotateY: `${interpolate(flip.value, [0, 1], [180, 360])}deg` }],
        opacity: flip.value >= 0.5 ? 1 : 0, backfaceVisibility: 'hidden' as const,
    }));

    return (
        <View style={st.slotWrap}>
            <Animated.View style={[st.slotCard, front]}>
                <LinearGradient colors={[c.azure[600] ?? colors.azure[600], c.azure[500] ?? colors.azure[500]]} style={st.slotGrad}>
                    <Text style={st.slotNum}>{index + 1}</Text>
                </LinearGradient>
            </Animated.View>
            <Animated.View style={[st.slotCard, back]}>
                <LinearGradient colors={[colors.gold[600], colors.gold[500]]} style={st.slotGrad}>
                    <Text style={st.slotAns} numberOfLines={1}>{answer}</Text>
                    <View style={st.slotPtsBg}><Text style={st.slotPts}>{points}</Text></View>
                </LinearGradient>
            </Animated.View>
        </View>
    );
}

// ---- Team Score ----
function TeamScore({ name, score, active, accent, side }: { name: string; score: number; active: boolean; accent: string; side: 'left' | 'right' }) {
    const pulse = useSharedValue(0);
    useEffect(() => {
        pulse.value = active
            ? withRepeat(withSequence(withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }), withTiming(0, { duration: 800 })), -1, false)
            : withTiming(0, { duration: 300 });
    }, [active, pulse]);

    const glow = useAnimatedStyle(() => ({
        borderColor: active ? accent + Math.round(interpolate(pulse.value, [0, 1], [40, 80])).toString(16).padStart(2, '0') : colors.border.subtle,
        shadowOpacity: interpolate(pulse.value, [0, 1], [0, 0.4]),
    }));

    return (
        <Animated.View style={[st.tScoreCard, { alignItems: side === 'left' ? 'flex-start' : 'flex-end' }, glow, { shadowColor: accent }]}>
            <Text style={[st.tName, { color: accent }]} numberOfLines={1}>{name}</Text>
            <Text style={st.tScore}>{score}</Text>
            {active && (
                <Animated.View entering={FadeIn.duration(200)} style={[st.ctrlBadge, { backgroundColor: accent + '20' }]}>
                    <Ionicons name="game-controller" size={10} color={accent} />
                    <Text style={[st.ctrlText, { color: accent }]}>Control</Text>
                </Animated.View>
            )}
        </Animated.View>
    );
}

// ---- Buzzer ----
function BuzzerButton({ onBuzz, disabled }: { onBuzz: () => void; disabled: boolean }) {
    const scale = useSharedValue(1);
    const pulse = useSharedValue(0);
    useEffect(() => { if (!disabled) pulse.value = withRepeat(withSequence(withTiming(1, { duration: 600 }), withTiming(0, { duration: 600 })), -1, false); }, [disabled, pulse]);
    const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
    const ring = useAnimatedStyle(() => ({ opacity: interpolate(pulse.value, [0, 1], [0.3, 0.7]), transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.15]) }] }));

    return (
        <View style={st.buzzWrap}>
            <Animated.View style={[st.buzzRing, ring]} />
            <Animated.View style={anim}>
                <TouchableOpacity onPress={() => { if (disabled) return; scale.value = withSequence(withSpring(0.85, { damping: 15 }), withSpring(1, { damping: 10 })); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); onBuzz(); }} disabled={disabled} activeOpacity={0.8} style={[st.buzzBtn, disabled && st.buzzOff]} accessibilityRole="button" accessibilityLabel="Buzz in">
                    <LinearGradient colors={disabled ? [colors.obsidian[600], colors.obsidian[500]] : [colors.coral[500], colors.coral[400]]} style={st.buzzGrad}>
                        <Ionicons name="flash" size={32} color={disabled ? colors.text.muted : '#fff'} />
                        <Text style={[st.buzzText, disabled && { color: colors.text.muted }]}>BUZZ!</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
}

// ---- Host Board View (TV) ----
function HostBoardView({ question, answers, revealedAnswers, strikes, teams, controllingTeam, phase, round, totalRounds }: {
    question: string; answers: SurveyAnswer[]; revealedAnswers: boolean[]; strikes: number; teams: Teams; controllingTeam: string | null; phase: Phase; round: number; totalRounds: number;
}) {
    const { colors: c } = useTheme();
    const insets = useSafeAreaInsets();
    const rPts = useMemo(() => answers.reduce((s, a, i) => (revealedAnswers[i] ? s + a.points : s), 0), [answers, revealedAnswers]);

    return (
        <View style={[st.hostBox, { paddingTop: insets.top + spacing.sm }]}>
            <Animated.View entering={FadeIn.duration(300)} style={st.roundRow}>
                <View style={st.roundBadge}><Text style={st.roundLbl}>Round {round}/{totalRounds}</Text></View>
                {rPts > 0 && <View style={st.rPtsBadge}><Ionicons name="star" size={12} color={colors.gold[500]} /><Text style={st.rPtsText}>{rPts} pts</Text></View>}
            </Animated.View>

            <View style={st.teamsRow}>
                <TeamScore name={teams.team1.name} score={teams.team1.score} active={controllingTeam === 'team1'} accent={colors.gold[500]} side="left" />
                <View style={st.vsBox}><Text style={st.vsText}>VS</Text></View>
                <TeamScore name={teams.team2.name} score={teams.team2.score} active={controllingTeam === 'team2'} accent={colors.coral[400]} side="right" />
            </View>

            <Animated.View entering={FadeInDown.delay(100).duration(400)} style={st.qCard}>
                <LinearGradient colors={[c.azure[700] ?? colors.azure[700], c.azure[800] ?? colors.azure[800]]} style={st.qGrad}>
                    <Text style={st.qText}>{question}</Text>
                </LinearGradient>
            </Animated.View>

            <View style={st.board}>
                {answers.map((a, i) => <AnswerSlot key={i} index={i} answer={a.answer} points={a.points} revealed={revealedAnswers[i] ?? false} />)}
            </View>

            <View style={st.strikesRow}>
                {[0, 1, 2].map(i => (
                    <View key={i} style={[st.strikeInd, i < strikes && st.strikeOn]}>
                        <Text style={[st.strikeIndText, i < strikes && st.strikeOnText]}>✕</Text>
                    </View>
                ))}
            </View>

            {(phase === 'faceoff' || phase === 'faceoff_buzz') && (
                <Animated.View entering={FadeIn.duration(300)} style={st.phaseBadge}>
                    <Ionicons name={phase === 'faceoff' ? 'flash' : 'radio'} size={16} color={phase === 'faceoff' ? colors.amber[400] : colors.coral[400]} />
                    <Text style={st.phaseText}>{phase === 'faceoff' ? 'FACE-OFF' : 'BUZZ IN!'}</Text>
                </Animated.View>
            )}
            {phase === 'steal' && (
                <Animated.View entering={FadeIn.duration(300)} style={[st.phaseBadge, { backgroundColor: colors.coral[500] + '20' }]}>
                    <Ionicons name="swap-horizontal" size={16} color={colors.coral[400]} />
                    <Text style={[st.phaseText, { color: colors.coral[400] }]}>STEAL!</Text>
                </Animated.View>
            )}
            <StrikeOverlay count={strikes} />
        </View>
    );
}

// ---- Player Controller ----
function PlayerCtrl({ phase, teams, controllingTeam, myTeam, strikes, hasBuzzed, onJoinTeam, onBuzz, onGuess, onHostAction, isHost, players, round, totalRounds }: {
    phase: Phase; teams: Teams; controllingTeam: string | null; myTeam: string | null; strikes: number; hasBuzzed: boolean;
    onJoinTeam: (t: string) => void; onBuzz: (a: string) => void; onGuess: (a: string) => void; onHostAction: (a: string) => void;
    isHost: boolean; players: Array<{ id: string; name: string }>; round: number; totalRounds: number;
}) {
    const insets = useSafeAreaInsets();
    const [input, setInput] = useState('');
    const canGuess = phase === 'play' ? myTeam === controllingTeam : phase === 'steal' ? myTeam !== controllingTeam : false;
    const getName = useCallback((id: string) => players.find(p => p.id === id)?.name ?? 'Player', [players]);

    const submit = useCallback(() => {
        const v = input.trim();
        if (!v) return;
        phase === 'faceoff_buzz' ? onBuzz(v) : onGuess(v);
        setInput('');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, [input, phase, onBuzz, onGuess]);

    if (phase === 'team_setup') {
        return (
            <ScrollView style={st.pBox} contentContainerStyle={[st.pContent, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl }]}>
                <Animated.Text entering={FadeInDown.duration(400)} style={st.phTitle}>Choose Your Team</Animated.Text>
                {(['team1', 'team2'] as const).map((tk, idx) => {
                    const t = teams[tk]; const mine = myTeam === tk; const ac = idx === 0 ? colors.gold[500] : colors.coral[400];
                    return (
                        <Animated.View key={tk} entering={FadeInDown.delay(100 + idx * 100).duration(400)}>
                            <TouchableOpacity onPress={() => onJoinTeam(tk)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={`Join ${t.name}`}>
                                <GlassCard style={[st.teamCard, mine && { borderColor: ac + '60' }]} padding="md">
                                    <View style={st.tcHead}>
                                        <View style={[st.tcDot, { backgroundColor: ac }]} />
                                        <Text style={[st.tcName, { color: ac }]}>{t.name}</Text>
                                        {mine && <View style={[st.youBadge, { backgroundColor: ac + '20' }]}><Text style={[st.youText, { color: ac }]}>YOU</Text></View>}
                                    </View>
                                    <View style={st.tcMembers}>
                                        {t.playerIds.length === 0
                                            ? <Text style={st.emptyText}>Tap to join</Text>
                                            : t.playerIds.map(pid => <View key={pid} style={st.memChip}><Text style={st.memName}>{getName(pid)}</Text></View>)}
                                    </View>
                                    <Text style={st.tcCount}>{t.playerIds.length} {t.playerIds.length === 1 ? 'player' : 'players'}</Text>
                                </GlassCard>
                            </TouchableOpacity>
                        </Animated.View>
                    );
                })}
                {isHost && (
                    <Animated.View entering={FadeInDown.delay(350).duration(400)}>
                        <TouchableOpacity style={st.hostBtn} onPress={() => onHostAction('start_round')} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Start round">
                            <LinearGradient colors={[colors.gold[600], colors.gold[500]]} style={st.hostBtnGrad}>
                                <Ionicons name="play" size={20} color="#fff" /><Text style={st.hostBtnText}>Start Round</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>
                )}
            </ScrollView>
        );
    }

    return (
        <KeyboardAvoidingView style={st.pBox} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={[st.pContent, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.lg }]} keyboardShouldPersistTaps="handled">
                {/* Mini score bar */}
                <View style={st.miniBar}>
                    <View style={st.miniTeam}><View style={[st.miniDot, { backgroundColor: colors.gold[500] }]} /><Text style={st.miniName} numberOfLines={1}>{teams.team1.name}</Text><Text style={[st.miniPts, { color: colors.gold[500] }]}>{teams.team1.score}</Text></View>
                    <View style={st.miniRnd}><Text style={st.miniRndText}>R{round}/{totalRounds}</Text></View>
                    <View style={st.miniTeam}><Text style={[st.miniPts, { color: colors.coral[400] }]}>{teams.team2.score}</Text><Text style={st.miniName} numberOfLines={1}>{teams.team2.name}</Text><View style={[st.miniDot, { backgroundColor: colors.coral[400] }]} /></View>
                </View>

                {strikes > 0 && <Animated.View entering={FadeIn.duration(200)} style={st.pStrikes}>{[0, 1, 2].map(i => <Text key={i} style={[st.pStrike, i < strikes && st.pStrikeOn]}>✕</Text>)}</Animated.View>}

                {(phase === 'faceoff' || phase === 'faceoff_buzz') && (
                    <Animated.View entering={FadeInDown.duration(400)} style={st.phSec}>
                        <Text style={st.phLbl}>{phase === 'faceoff' ? 'Face-Off Starting...' : 'BUZZ IN!'}</Text>
                        {phase === 'faceoff_buzz' && !hasBuzzed && (
                            <>
                                <BuzzerButton onBuzz={submit} disabled={!input.trim()} />
                                <View style={st.inputRow}><TextInput style={st.guessIn} placeholder="Type your answer..." placeholderTextColor={colors.text.muted} value={input} onChangeText={setInput} onSubmitEditing={submit} returnKeyType="send" autoCapitalize="characters" autoCorrect={false} /></View>
                            </>
                        )}
                        {phase === 'faceoff_buzz' && hasBuzzed && (
                            <Animated.View entering={FadeIn.duration(300)} style={st.waitCard}><Ionicons name="checkmark-circle" size={24} color={colors.emerald[400]} /><Text style={st.waitText}>Buzzed in! Waiting for host...</Text></Animated.View>
                        )}
                        {isHost && phase === 'faceoff' && (
                            <TouchableOpacity style={st.hSmall} onPress={() => onHostAction('open_faceoff')} activeOpacity={0.8}>
                                <LinearGradient colors={[colors.amber[500], colors.amber[400]]} style={st.hSmallGrad}><Ionicons name="flash" size={16} color="#fff" /><Text style={st.hSmallText}>Open Buzzer</Text></LinearGradient>
                            </TouchableOpacity>
                        )}
                    </Animated.View>
                )}

                {(phase === 'play' || phase === 'steal') && (
                    <Animated.View entering={FadeInDown.duration(400)} style={st.phSec}>
                        <Text style={st.phLbl}>{phase === 'steal' ? '🔄 STEAL ATTEMPT!' : canGuess ? 'Your Turn — Guess!' : 'Waiting for other team...'}</Text>
                        {canGuess && (
                            <View style={st.inputRow}>
                                <TextInput style={st.guessIn} placeholder="Type your guess..." placeholderTextColor={colors.text.muted} value={input} onChangeText={setInput} onSubmitEditing={submit} returnKeyType="send" autoCapitalize="characters" autoCorrect={false} />
                                <TouchableOpacity onPress={submit} disabled={!input.trim()} style={[st.sendBtn, !input.trim() && st.sendOff]} accessibilityRole="button" accessibilityLabel="Submit guess">
                                    <Ionicons name="send" size={20} color={input.trim() ? colors.gold[500] : colors.text.muted} />
                                </TouchableOpacity>
                            </View>
                        )}
                    </Animated.View>
                )}

                {phase === 'round_result' && (
                    <Animated.View entering={FadeInDown.duration(400)} style={st.phSec}>
                        <Ionicons name="trophy" size={40} color={colors.gold[500]} />
                        <Text style={st.resTitle}>Round Complete!</Text>
                        <View style={st.resScores}>
                            <View style={st.resTeam}><Text style={[st.resName, { color: colors.gold[500] }]}>{teams.team1.name}</Text><Text style={st.resVal}>{teams.team1.score}</Text></View>
                            <Text style={st.resDash}>—</Text>
                            <View style={st.resTeam}><Text style={[st.resName, { color: colors.coral[400] }]}>{teams.team2.name}</Text><Text style={st.resVal}>{teams.team2.score}</Text></View>
                        </View>
                        {isHost && (
                            <View style={st.hResActs}>
                                <TouchableOpacity style={st.hSmall} onPress={() => onHostAction('next_round')} activeOpacity={0.8}>
                                    <LinearGradient colors={[colors.gold[600], colors.gold[500]]} style={st.hSmallGrad}><Ionicons name="arrow-forward" size={16} color="#fff" /><Text style={st.hSmallText}>Next Round</Text></LinearGradient>
                                </TouchableOpacity>
                                <TouchableOpacity style={st.hSmall} onPress={() => onHostAction('end_game')} activeOpacity={0.8}>
                                    <LinearGradient colors={[colors.obsidian[600], colors.obsidian[500]]} style={st.hSmallGrad}><Ionicons name="stop" size={16} color={colors.text.secondary} /><Text style={[st.hSmallText, { color: colors.text.secondary }]}>End Game</Text></LinearGradient>
                                </TouchableOpacity>
                            </View>
                        )}
                    </Animated.View>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

// ============================================
// Main Screen
// ============================================

export default function FamilyFeudScreen() {
    const router = useRouter();
    const { code } = useLocalSearchParams<{ code: string }>();
    const gameStore = useGameStore();
    const { colors: tc } = useTheme();
    const isMountedRef = useRef(true);

    const { gameData, players, isHost, myPlayerId, round, totalRounds } = gameStore;
    const phase = (gameData?.phase as Phase) ?? 'team_setup';
    const teams = (gameData?.teams as Teams) ?? { team1: { name: 'Team 1', playerIds: [], score: 0 }, team2: { name: 'Team 2', playerIds: [], score: 0 } };
    const curQ = gameData?.currentQuestion as { question: string; answers: SurveyAnswer[] } | null;
    const revealed = (gameData?.revealedAnswers as boolean[]) ?? [];
    const strikes = (gameData?.strikes as number) ?? 0;
    const controlling = (gameData?.controllingTeam as string) ?? null;
    const buzzes = (gameData?.faceoffBuzzes as Record<string, unknown>) ?? {};

    const myTeam = useMemo(() => {
        if (!myPlayerId) return null;
        if (teams.team1.playerIds.includes(myPlayerId)) return 'team1';
        if (teams.team2.playerIds.includes(myPlayerId)) return 'team2';
        return null;
    }, [myPlayerId, teams]);

    const hasBuzzed = useMemo(() => myPlayerId != null && buzzes[myPlayerId] != null, [myPlayerId, buzzes]);

    useEffect(() => { isMountedRef.current = true; return () => { isMountedRef.current = false; }; }, []);

    useEffect(() => {
        const unsubs = [
            socketManager.on('game:update', (data: Record<string, unknown>) => { if (isMountedRef.current) gameStore.updateFromDelta(data); }),
            socketManager.on('game:round-start', (data: Record<string, unknown>) => { if (isMountedRef.current) { gameStore.updateFromDelta(data); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } }),
            socketManager.on('game:round-end', (data: Record<string, unknown>) => { if (isMountedRef.current) gameStore.setRoundEnd(data); }),
            socketManager.on('game:ended', (data: Record<string, unknown>) => { if (isMountedRef.current) { gameStore.setGameEnded(data); router.replace(`/games/results/${code}`); } }),
            socketManager.on('game:error', (data: { message: string }) => { if (isMountedRef.current) gameStore.setError(data.message); }),
        ];
        return () => unsubs.forEach(fn => fn());
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [code]);

    const prevStrikes = useRef(strikes);
    useEffect(() => { if (strikes > prevStrikes.current) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); prevStrikes.current = strikes; }, [strikes]);

    const handleJoinTeam = useCallback((team: string) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); gameStore.sendAction('join_team', { team }); }, [gameStore]);
    const handleBuzz = useCallback((answer: string) => { gameStore.sendAction('faceoff_buzz', { answer }); }, [gameStore]);
    const handleGuess = useCallback((answer: string) => { gameStore.sendAction('guess', { answer }); }, [gameStore]);
    const handleHostAction = useCallback((action: string) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); gameStore.sendAction(action, {}); }, [gameStore]);
    const handleLeave = useCallback(() => { gameStore.leaveGame(); router.replace('/games'); }, [gameStore, router]);

    if (!gameData || Object.keys(gameData).length === 0) {
        return <ErrorBoundary><LinearGradient colors={[tc.obsidian[900], tc.obsidian[800]]} style={st.grad}><LoadingView message="Loading Family Feud..." /></LinearGradient></ErrorBoundary>;
    }

    const ctrlProps = { phase, teams, controllingTeam: controlling, myTeam, strikes, hasBuzzed, onJoinTeam: handleJoinTeam, onBuzz: handleBuzz, onGuess: handleGuess, onHostAction: handleHostAction, isHost, players, round, totalRounds };
    const leaveBtn = (abs?: boolean) => (
        <TouchableOpacity onPress={handleLeave} style={abs ? st.leaveBtnAbs : st.leaveBtn} accessibilityRole="button" accessibilityLabel="Leave game">
            <Ionicons name="close" size={22} color={colors.text.secondary} />
        </TouchableOpacity>
    );

    if (isHost && curQ && phase !== 'team_setup') {
        return (
            <ErrorBoundary>
            <LinearGradient colors={[tc.obsidian[900], tc.obsidian[800], tc.obsidian[900]]} style={st.grad}>
                <HostBoardView question={curQ.question} answers={curQ.answers} revealedAnswers={revealed} strikes={strikes} teams={teams} controllingTeam={controlling} phase={phase} round={round} totalRounds={totalRounds} />
                <View style={st.hostOverlay}><PlayerCtrl {...ctrlProps} /></View>
                {leaveBtn()}
            </LinearGradient>
            </ErrorBoundary>
        );
    }

    return (
        <ErrorBoundary>
        <LinearGradient colors={[tc.obsidian[900], tc.obsidian[800], tc.obsidian[900]]} style={st.grad}>
            <PlayerCtrl {...ctrlProps} />
            {leaveBtn(true)}
        </LinearGradient>
        </ErrorBoundary>
    );
}

// ============================================
// Styles
// ============================================

const st = StyleSheet.create({
    grad: { flex: 1 },
    // Host
    hostBox: { flex: 1, paddingHorizontal: spacing.lg },
    roundRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.md },
    roundBadge: { backgroundColor: colors.surface.glass, borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderWidth: 1, borderColor: colors.border.subtle },
    roundLbl: { fontSize: typography.fontSize.sm, fontWeight: '700', color: colors.text.primary, fontFamily: 'Inter-Bold' },
    rPtsBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.gold[500] + '15', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 10 },
    rPtsText: { fontSize: typography.fontSize.sm, fontWeight: '700', color: colors.gold[500], fontFamily: 'Inter-Bold' },
    teamsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
    tScoreCard: { flex: 1, backgroundColor: colors.surface.glass, borderRadius: 14, padding: spacing.md, borderWidth: 1, borderColor: colors.border.subtle, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
    tName: { fontSize: typography.fontSize.sm, fontWeight: '700', fontFamily: 'Inter-Bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
    tScore: { fontSize: 36, fontWeight: '800', fontFamily: 'Inter-Bold', color: colors.text.primary, letterSpacing: -1 },
    ctrlBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 8, marginTop: 4 },
    ctrlText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    vsBox: { paddingHorizontal: spacing.sm },
    vsText: { fontSize: typography.fontSize.sm, fontWeight: '800', color: colors.text.muted, fontFamily: 'Inter-Bold' },
    qCard: { marginBottom: spacing.md, borderRadius: 16, overflow: 'hidden' },
    qGrad: { padding: spacing.lg, borderRadius: 16, alignItems: 'center' },
    qText: { fontSize: 20, fontWeight: '700', fontFamily: 'Inter-Bold', color: '#fff', textAlign: 'center', lineHeight: 28 },
    // Board
    board: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
    slotWrap: { width: SLOT_W, height: 52, position: 'relative' },
    slotCard: { ...StyleSheet.absoluteFillObject, borderRadius: 12, overflow: 'hidden' },
    slotGrad: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md, gap: spacing.sm },
    slotNum: { fontSize: 22, fontWeight: '800', fontFamily: 'Inter-Bold', color: '#fff', opacity: 0.9 },
    slotAns: { flex: 1, fontSize: typography.fontSize.base, fontWeight: '700', fontFamily: 'Inter-Bold', color: '#fff', textTransform: 'uppercase' },
    slotPtsBg: { backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 2 },
    slotPts: { fontSize: typography.fontSize.sm, fontWeight: '800', fontFamily: 'Inter-Bold', color: '#fff' },
    // Strikes
    strikesRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md, marginBottom: spacing.md },
    strikeInd: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface.glass, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border.subtle },
    strikeOn: { backgroundColor: colors.coral[500] + '30', borderColor: colors.coral[500] + '60' },
    strikeIndText: { fontSize: 18, fontWeight: '800', color: colors.text.muted },
    strikeOnText: { color: colors.coral[400] },
    strikeOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
    strikeRow: { flexDirection: 'row', gap: spacing.lg },
    strikeX: { fontSize: 80, fontWeight: '900', color: colors.coral[500], textShadowColor: colors.coral[500], textShadowRadius: 20 },
    phaseBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, backgroundColor: colors.amber[500] + '20', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 12, alignSelf: 'center' },
    phaseText: { fontSize: typography.fontSize.lg, fontWeight: '800', fontFamily: 'Inter-Bold', color: colors.amber[400], letterSpacing: 2 },
    // Player
    pBox: { flex: 1 },
    pContent: { paddingHorizontal: spacing.lg },
    phTitle: { fontSize: 24, fontWeight: '800', fontFamily: 'Inter-Bold', color: colors.text.primary, textAlign: 'center', marginBottom: spacing.xl },
    teamCard: { marginBottom: spacing.md },
    tcHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
    tcDot: { width: 10, height: 10, borderRadius: 5 },
    tcName: { fontSize: typography.fontSize.lg, fontWeight: '700', fontFamily: 'Inter-Bold', flex: 1 },
    youBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 6 },
    youText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    tcMembers: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
    memChip: { backgroundColor: colors.surface.glass, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 8, borderWidth: 1, borderColor: colors.border.subtle },
    memName: { fontSize: typography.fontSize.xs, fontWeight: '600', color: colors.text.secondary },
    emptyText: { fontSize: typography.fontSize.sm, color: colors.text.muted, fontStyle: 'italic' },
    tcCount: { fontSize: typography.fontSize.xs, color: colors.text.muted },
    hostBtn: { borderRadius: 14, overflow: 'hidden', marginTop: spacing.md },
    hostBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md + 2, borderRadius: 14 },
    hostBtnText: { fontSize: typography.fontSize.lg, fontWeight: '700', fontFamily: 'Inter-Bold', color: '#fff' },
    // Mini bar
    miniBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md, backgroundColor: colors.surface.glass, borderRadius: 12, padding: spacing.sm, borderWidth: 1, borderColor: colors.border.subtle },
    miniTeam: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
    miniDot: { width: 8, height: 8, borderRadius: 4 },
    miniName: { fontSize: typography.fontSize.xs, fontWeight: '600', color: colors.text.secondary, flex: 1 },
    miniPts: { fontSize: typography.fontSize.lg, fontWeight: '800', fontFamily: 'Inter-Bold' },
    miniRnd: { backgroundColor: colors.obsidian[700], paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 6 },
    miniRndText: { fontSize: 10, fontWeight: '700', color: colors.text.muted },
    pStrikes: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.md },
    pStrike: { fontSize: 24, fontWeight: '800', color: colors.obsidian[600] },
    pStrikeOn: { color: colors.coral[500] },
    phSec: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg },
    phLbl: { fontSize: typography.fontSize.xl, fontWeight: '800', fontFamily: 'Inter-Bold', color: colors.text.primary, textAlign: 'center' },
    // Buzzer
    buzzWrap: { alignItems: 'center', justifyContent: 'center', marginVertical: spacing.md },
    buzzRing: { position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 3, borderColor: colors.coral[500] },
    buzzBtn: { width: 120, height: 120, borderRadius: 60, overflow: 'hidden' },
    buzzOff: { opacity: 0.5 },
    buzzGrad: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
    buzzText: { fontSize: typography.fontSize.lg, fontWeight: '900', fontFamily: 'Inter-Bold', color: '#fff', letterSpacing: 2 },
    // Input
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, width: '100%' },
    guessIn: { flex: 1, backgroundColor: colors.surface.glass, borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text.primary, borderWidth: 1, borderColor: colors.border.subtle },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.gold[500] + '20', alignItems: 'center', justifyContent: 'center' },
    sendOff: { opacity: 0.4 },
    waitCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface.glass, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: 14 },
    waitText: { fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text.secondary },
    hSmall: { borderRadius: 12, overflow: 'hidden' },
    hSmallGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2, borderRadius: 12 },
    hSmallText: { fontSize: typography.fontSize.sm, fontWeight: '700', fontFamily: 'Inter-Bold', color: '#fff' },
    // Result
    resTitle: { fontSize: 22, fontWeight: '800', fontFamily: 'Inter-Bold', color: colors.text.primary, marginTop: spacing.sm },
    resScores: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: spacing.md },
    resTeam: { alignItems: 'center', gap: spacing.xs },
    resName: { fontSize: typography.fontSize.sm, fontWeight: '700', fontFamily: 'Inter-Bold', textTransform: 'uppercase', letterSpacing: 1 },
    resVal: { fontSize: 36, fontWeight: '800', fontFamily: 'Inter-Bold', color: colors.text.primary },
    resDash: { fontSize: 24, fontWeight: '700', color: colors.text.muted },
    hResActs: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
    // Layout
    hostOverlay: { maxHeight: 200, borderTopWidth: 1, borderTopColor: colors.border.subtle },
    leaveBtn: { position: 'absolute', top: 0, right: spacing.lg, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface.glass, alignItems: 'center', justifyContent: 'center', zIndex: 50 },
    leaveBtnAbs: { position: 'absolute', top: spacing.xl, right: spacing.lg, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface.glass, alignItems: 'center', justifyContent: 'center', zIndex: 50 },
});
