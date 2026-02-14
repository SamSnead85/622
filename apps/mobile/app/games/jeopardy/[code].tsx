// ============================================
// Jeopardy — Host-as-display game board
// Host phone shows the board (castable to TV),
// players use their phones as controllers
// ============================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, TextInput,
} from 'react-native';
import Animated, {
    FadeIn, FadeInDown, ZoomIn, useSharedValue, useAnimatedStyle,
    withTiming, withSpring, withSequence, withRepeat, Easing,
} from 'react-native-reanimated';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { typography, spacing } from '@zerog/ui';
import { LoadingView } from '../../../components';
import { useGameStore } from '../../../stores';
import { socketManager } from '../../../lib/socket';

// ============================================
// Constants & Palette
// ============================================

const { width: SW } = Dimensions.get('window');
const COLS = 6;
const ROWS = 5;
const GAP = 3;
const PAD = spacing.sm;
const CW = (SW - PAD * 2 - GAP * (COLS - 1)) / COLS;
const CH = 48;

const J = {
    bg: '#060CE9', bgDark: '#030872', cell: '#1111CC', played: '#0A0A4A',
    gold: '#FFD700', goldDim: '#B8960F', white: '#FFFFFF',
    red: '#FF2D2D', glow: '#FF6B6B', green: '#22C55E', wrong: '#EF4444',
};

// ============================================
// Types
// ============================================

interface BoardCell { categoryIndex: number; clueIndex: number; value: number; played: boolean }
interface ActiveClue { categoryIndex: number; clueIndex: number; clue: string; value: number }
interface JeopardyCategory { name: string; clues: { clue: string; answer: string; value: number }[] }
type Phase = 'board' | 'clue' | 'buzzer' | 'answer' | 'final_category' | 'final_wager' | 'final_answer' | 'final_reveal';

// ============================================
// Pulsing Buzzer Button
// ============================================

function BuzzerButton({ onPress, disabled }: { onPress: () => void; disabled: boolean }) {
    const pulse = useSharedValue(1);
    useEffect(() => {
        pulse.value = disabled
            ? withTiming(1, { duration: 200 })
            : withRepeat(withSequence(
                withTiming(1.06, { duration: 600, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
            ), -1, true);
    }, [disabled, pulse]);

    const anim = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

    return (
        <Animated.View style={[{ marginBottom: spacing.lg }, anim]}>
            <TouchableOpacity
                style={[s.buzzer, disabled && { opacity: 0.5, shadowOpacity: 0 }]}
                onPress={onPress} disabled={disabled} activeOpacity={0.7}
                accessibilityRole="button" accessibilityLabel="Buzz in"
            >
                <LinearGradient colors={disabled ? ['#555', '#333'] : [J.glow, J.red]} style={s.buzzerGrad}>
                    <Ionicons name="hand-left" size={48} color={J.white} />
                    <Text style={s.buzzerText}>BUZZ!</Text>
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );
}

// ============================================
// Board Cell
// ============================================

function Cell({ value, played, onPress }: { value: number; played: boolean; onPress: () => void }) {
    const op = useSharedValue(0);
    useEffect(() => { op.value = withTiming(1, { duration: 400 }); }, [op]);
    const anim = useAnimatedStyle(() => ({ opacity: op.value }));

    return (
        <Animated.View style={[{ width: CW, height: CH }, anim]}>
            <TouchableOpacity
                style={[s.cell, played && { backgroundColor: J.played }]}
                onPress={onPress} disabled={played} activeOpacity={0.7}
                accessibilityLabel={played ? `${value}, played` : `${value}`}
            >
                {!played && <Text style={s.cellVal}>${value}</Text>}
            </TouchableOpacity>
        </Animated.View>
    );
}

// ============================================
// Scoreboard
// ============================================

function Scores({ players }: { players: { id: string; name: string; score: number; isHost: boolean }[] }) {
    const list = players.filter((p) => !p.isHost).sort((a, b) => b.score - a.score);
    if (!list.length) return null;
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.xs }}>
            {list.map((p) => (
                <View key={p.id} style={s.scoreCard}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: J.white, opacity: 0.8 }} numberOfLines={1}>{p.name.split(' ')[0]}</Text>
                    <Text style={[s.scoreVal, p.score < 0 && { color: J.wrong }]}>{p.score < 0 ? `-$${Math.abs(p.score)}` : `$${p.score}`}</Text>
                </View>
            ))}
        </ScrollView>
    );
}

// ============================================
// Main Screen
// ============================================

export default function JeopardyScreen() {
    const router = useRouter();
    const { code } = useLocalSearchParams<{ code: string }>();
    const insets = useSafeAreaInsets();
    const gs = useGameStore();

    const [hasBuzzed, setHasBuzzed] = useState(false);
    const [wagerInput, setWagerInput] = useState('');
    const [finalAnswer, setFinalAnswer] = useState('');
    const [finalSubmitted, setFinalSubmitted] = useState(false);
    const [wagerSubmitted, setWagerSubmitted] = useState(false);
    const [revealed, setRevealed] = useState<Set<string>>(new Set());
    const isMountedRef = useRef(true);

    // Derived
    const { gameData: gd, players, isHost } = gs;
    const phase = (gd?.phase as Phase) ?? 'board';
    const board = (gd?.board as BoardCell[][]) ?? [];
    const cats = (gd?.categories as JeopardyCategory[]) ?? [];
    const clue = gd?.activeClue as ActiveClue | null;
    const buzzerOpen = (gd?.buzzerOpen as boolean) ?? false;
    const buzzedId = gd?.buzzedPlayerId as string | null;
    const played = (gd?.cluesPlayed as number) ?? 0;
    const total = (gd?.totalClues as number) ?? 30;
    const fj = gd?.finalJeopardy as { category: string; clue: string; answer: string } | null;
    const fWagers = (gd?.finalWagers as Record<string, number>) ?? {};
    const fAnswers = (gd?.finalAnswers as Record<string, string>) ?? {};
    const buzzedPlayer = buzzedId ? players.find((p) => p.id === buzzedId) : null;
    const me = players.find((p) => p.id === gs.myPlayerId);
    const myScore = me?.score ?? 0;
    const nonHost = players.filter((p) => !p.isHost && p.isConnected);

    // Mount guard
    useEffect(() => { isMountedRef.current = true; return () => { isMountedRef.current = false; }; }, []);

    // Socket listeners
    useEffect(() => {
        const unsubs = [
            socketManager.on('game:state', (d: Record<string, unknown>) => { if (isMountedRef.current) gs.updateFromState(d as Partial<typeof gs>); }),
            socketManager.on('game:update', (d: Record<string, unknown>) => { if (isMountedRef.current) gs.updateFromDelta(d); }),
            socketManager.on('game:action', (_d: Record<string, unknown>) => {}),
            socketManager.on('game:round-start', (_d: Record<string, unknown>) => {}),
            socketManager.on('game:round-end', (d: Record<string, unknown>) => { if (isMountedRef.current) gs.setRoundEnd(d); }),
            socketManager.on('game:ended', (d: Record<string, unknown>) => { if (isMountedRef.current) { gs.setGameEnded(d); router.replace(`/games/results/${code}`); } }),
            socketManager.on('game:error', (d: { message: string }) => { if (isMountedRef.current) gs.setError(d.message); }),
        ];
        return () => unsubs.forEach((fn) => fn());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [code]);

    // Reset state on phase change
    useEffect(() => {
        if (phase === 'board' || phase === 'clue') setHasBuzzed(false);
        if (phase === 'final_wager') { setWagerInput(''); setWagerSubmitted(false); }
        if (phase === 'final_answer') { setFinalAnswer(''); setFinalSubmitted(false); }
        if (phase === 'final_reveal') setRevealed(new Set());
    }, [phase]);

    // ---- Actions ----
    const act = useCallback((a: string, p: Record<string, unknown>) => gs.sendAction(a, p), [gs]);
    const leave = useCallback(() => { gs.leaveGame(); router.replace('/games'); }, [gs, router]);

    const buzz = useCallback(() => {
        if (hasBuzzed) return;
        setHasBuzzed(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        act('buzz', {});
    }, [hasBuzzed, act]);

    const submitWager = useCallback(() => {
        const w = Math.max(0, Math.min(parseInt(wagerInput, 10) || 0, Math.max(0, myScore)));
        act('final_wager', { wager: w });
        setWagerSubmitted(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, [wagerInput, myScore, act]);

    const submitFinal = useCallback(() => {
        if (!finalAnswer.trim()) return;
        act('final_answer', { answer: finalAnswer.trim() });
        setFinalSubmitted(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, [finalAnswer, act]);

    const judgeFinal = useCallback((tid: string, correct: boolean) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        act('judge_final', { targetPlayerId: tid, correct });
        setRevealed((prev) => new Set(prev).add(tid));
    }, [act]);

    // ---- Loading ----
    if (cats.length === 0) {
        return (
            <LinearGradient colors={[J.bgDark, J.bg]} style={s.flex}>
                <LoadingView message="Loading Jeopardy board..." />
            </LinearGradient>
        );
    }

    // ---- Shared sub-components ----
    const Header = ({ right }: { right?: React.ReactNode }) => (
        <View style={[s.header, { paddingTop: insets.top + spacing.xs }]}>
            <TouchableOpacity onPress={leave} style={s.closeBtn}>
                <Ionicons name="close" size={22} color={J.white} />
            </TouchableOpacity>
            {right}
        </View>
    );

    const ClueDisplay = ({ showCategory = true }: { showCategory?: boolean }) => clue ? (
        <>
            {showCategory && <Text style={s.clueCat}>{cats[clue.categoryIndex]?.name.toUpperCase()}</Text>}
            <Text style={s.clueVal}>${clue.value}</Text>
            <Text style={s.clueTxt}>{clue.clue}</Text>
        </>
    ) : null;

    const MiniScores = () => (
        <View style={{ marginTop: spacing.xl, width: '100%', gap: spacing.xs + 2 }}>
            {players.filter((p) => !p.isHost).sort((a, b) => b.score - a.score).slice(0, 5).map((p, i) => (
                <View key={p.id} style={s.miniRow}>
                    <Text style={s.miniRank}>{i + 1}.</Text>
                    <Text style={[s.miniName, p.id === gs.myPlayerId && { color: J.gold }]} numberOfLines={1}>{p.name}</Text>
                    <Text style={[s.miniVal, p.score < 0 && { color: J.wrong }]}>${p.score}</Text>
                </View>
            ))}
        </View>
    );

    // ================================================================
    // HOST VIEW
    // ================================================================
    if (isHost) {
        return (
            <LinearGradient colors={[J.bgDark, J.bg, J.bgDark]} style={s.flex}>
                <Header right={
                    <>
                        <Text style={s.title}>JEOPARDY!</Text>
                        <Text style={s.prog}>{played}/{total}</Text>
                    </>
                } />

                {/* Board */}
                {phase === 'board' && (
                    <Animated.View entering={FadeIn.duration(400)} style={s.boardWrap}>
                        <View style={s.catRow}>
                            {cats.slice(0, COLS).map((c, i) => (
                                <View key={i} style={[s.catCell, { width: CW }]}>
                                    <Text style={s.catText} numberOfLines={2}>{c.name.toUpperCase()}</Text>
                                </View>
                            ))}
                        </View>
                        {Array.from({ length: ROWS }).map((_, ri) => (
                            <View key={ri} style={s.row}>
                                {board.slice(0, COLS).map((col, ci) => (
                                    <Cell key={`${ci}-${ri}`} value={col[ri]?.value ?? (ri + 1) * 200} played={col[ri]?.played ?? false}
                                        onPress={() => act('select_clue', { categoryIndex: ci, clueIndex: ri })} />
                                ))}
                            </View>
                        ))}
                        {played >= total - 5 && (
                            <TouchableOpacity style={s.finalBtn} onPress={() => act('start_final', {})}>
                                <Text style={s.finalBtnTxt}>FINAL JEOPARDY</Text>
                            </TouchableOpacity>
                        )}
                    </Animated.View>
                )}

                {/* Clue */}
                {phase === 'clue' && clue && (
                    <Animated.View entering={FadeIn.duration(500)} style={s.center}>
                        <ClueDisplay />
                        <TouchableOpacity style={s.openBuzzer} onPress={() => act('open_buzzer', {})}>
                            <Ionicons name="radio-outline" size={24} color={J.white} />
                            <Text style={s.openBuzzerTxt}>OPEN BUZZER</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* Buzzer open */}
                {phase === 'buzzer' && clue && (
                    <Animated.View entering={FadeIn.duration(300)} style={s.center}>
                        <ClueDisplay />
                        <Animated.View entering={ZoomIn.duration(300).springify()} style={s.buzzerBadge}>
                            <Ionicons name="radio" size={20} color={J.red} />
                            <Text style={s.buzzerBadgeTxt}>BUZZER OPEN</Text>
                        </Animated.View>
                        <TouchableOpacity style={s.skipBtn} onPress={() => act('skip_clue', {})}>
                            <Text style={{ fontSize: typography.fontSize.sm, fontWeight: '600', color: J.white, opacity: 0.7 }}>Skip / Time Up</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* Answer judging */}
                {phase === 'answer' && clue && buzzedPlayer && (
                    <Animated.View entering={FadeIn.duration(300)} style={s.center}>
                        <ClueDisplay />
                        <Animated.View entering={ZoomIn.duration(400).springify()} style={s.buzzedCard}>
                            <Ionicons name="hand-left" size={28} color={J.gold} />
                            <Text style={s.buzzedName}>{buzzedPlayer.name}</Text>
                        </Animated.View>
                        <View style={s.judgeRow}>
                            <TouchableOpacity style={[s.judgeBtn, { backgroundColor: J.green }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); act('judge_answer', { correct: true }); }}>
                                <Ionicons name="checkmark" size={28} color={J.white} /><Text style={s.judgeTxt}>Correct</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[s.judgeBtn, { backgroundColor: J.wrong }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); act('judge_answer', { correct: false }); }}>
                                <Ionicons name="close" size={28} color={J.white} /><Text style={s.judgeTxt}>Incorrect</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                )}

                {/* Final: category */}
                {phase === 'final_category' && fj && (
                    <Animated.View entering={FadeIn.duration(600)} style={s.center}>
                        <Text style={s.fjLabel}>FINAL JEOPARDY!</Text>
                        <Text style={s.fjCat}>{fj.category}</Text>
                        <TouchableOpacity style={s.openBuzzer} onPress={() => act('reveal_final_category', {})}>
                            <Text style={s.openBuzzerTxt}>REVEAL CLUE</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* Final: wager wait */}
                {phase === 'final_wager' && fj && (
                    <Animated.View entering={FadeIn.duration(400)} style={s.center}>
                        <Text style={s.fjLabel}>FINAL JEOPARDY!</Text>
                        <Text style={s.fjCat}>{fj.category}</Text>
                        <Text style={s.waitTxt}>Players are placing wagers...</Text>
                        <Text style={s.waitSub}>{Object.keys(fWagers).length} / {nonHost.length} wagered</Text>
                    </Animated.View>
                )}

                {/* Final: answer wait */}
                {phase === 'final_answer' && fj && (
                    <Animated.View entering={FadeIn.duration(400)} style={s.center}>
                        <Text style={s.fjLabel}>FINAL JEOPARDY!</Text>
                        <Text style={s.fjCat}>{fj.category}</Text>
                        <Text style={s.clueTxt}>{fj.clue}</Text>
                        <Text style={s.waitTxt}>Players are answering...</Text>
                        <Text style={s.waitSub}>{Object.keys(fAnswers).length} / {nonHost.length} answered</Text>
                    </Animated.View>
                )}

                {/* Final: reveal */}
                {phase === 'final_reveal' && fj && (
                    <Animated.View entering={FadeIn.duration(400)} style={[s.center, { paddingTop: spacing.xl, justifyContent: 'flex-start' }]}>
                        <Text style={s.fjLabel}>FINAL JEOPARDY!</Text>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: J.white, textAlign: 'center', marginBottom: spacing.sm, opacity: 0.8 }}>{fj.clue}</Text>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: J.green, textAlign: 'center', marginBottom: spacing.lg, fontFamily: 'Inter-Bold' }}>Correct: {fj.answer}</Text>
                        <ScrollView style={{ flex: 1, width: '100%' }} contentContainerStyle={{ gap: spacing.sm }}>
                            {players.filter((p) => !p.isHost).sort((a, b) => b.score - a.score).map((p) => (
                                <View key={p.id} style={s.fjRow}>
                                    <View style={{ flex: 1, marginRight: spacing.sm }}>
                                        <Text style={s.fjRowName}>{p.name}</Text>
                                        <Text style={{ fontSize: 14, color: J.white, opacity: 0.7, marginTop: 2 }}>"{fAnswers[p.id] ?? '(no answer)'}"</Text>
                                        <Text style={{ fontSize: 12, color: J.goldDim, marginTop: 2 }}>Wager: ${fWagers[p.id] ?? 0}</Text>
                                    </View>
                                    {!revealed.has(p.id) ? (
                                        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                                            <TouchableOpacity style={[s.fjJudge, { backgroundColor: J.green }]} onPress={() => judgeFinal(p.id, true)}>
                                                <Ionicons name="checkmark" size={20} color={J.white} />
                                            </TouchableOpacity>
                                            <TouchableOpacity style={[s.fjJudge, { backgroundColor: J.wrong }]} onPress={() => judgeFinal(p.id, false)}>
                                                <Ionicons name="close" size={20} color={J.white} />
                                            </TouchableOpacity>
                                        </View>
                                    ) : <Ionicons name="checkmark-done" size={22} color={J.gold} />}
                                </View>
                            ))}
                        </ScrollView>
                        <TouchableOpacity style={s.endBtn} onPress={() => act('end_game', {})}>
                            <Text style={s.endBtnTxt}>END GAME</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* Scoreboard */}
                {(phase === 'board' || phase === 'final_reveal') && (
                    <View style={{ paddingHorizontal: spacing.sm, paddingTop: spacing.xs, paddingBottom: insets.bottom + spacing.xs }}>
                        <Scores players={players} />
                    </View>
                )}
            </LinearGradient>
        );
    }

    // ================================================================
    // PLAYER VIEW
    // ================================================================
    return (
        <LinearGradient colors={[J.bgDark, J.bg, J.bgDark]} style={s.flex}>
            <View style={[s.header, { paddingTop: insets.top + spacing.xs }]}>
                <TouchableOpacity onPress={leave} style={s.closeBtn}>
                    <Ionicons name="close" size={22} color={J.white} />
                </TouchableOpacity>
                <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: J.white, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 1 }}>Score</Text>
                    <Text style={[s.pScore, myScore < 0 && { color: J.wrong }]}>{myScore < 0 ? `-$${Math.abs(myScore)}` : `$${myScore}`}</Text>
                </View>
                <View style={s.progBadge}><Text style={s.prog}>{played}/{total}</Text></View>
            </View>

            {/* Board phase — watch the board */}
            {phase === 'board' && (
                <Animated.View entering={FadeIn.duration(400)} style={s.center}>
                    <Ionicons name="tv-outline" size={56} color={J.gold} />
                    <Text style={s.pWaitTitle}>Watch the Board</Text>
                    <Text style={s.pWaitSub}>The host will select a clue. Get ready to buzz in!</Text>
                    <MiniScores />
                </Animated.View>
            )}

            {/* Clue — waiting for buzzer */}
            {phase === 'clue' && clue && (
                <Animated.View entering={FadeIn.duration(400)} style={s.center}>
                    <Text style={s.pClueCat}>{cats[clue.categoryIndex]?.name.toUpperCase()}</Text>
                    <Text style={{ fontSize: 32, fontWeight: '900', color: J.gold, marginBottom: spacing.md, fontFamily: 'Inter-Bold' }}>${clue.value}</Text>
                    <Text style={s.pClueTxt}>{clue.clue}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, opacity: 0.6 }}>
                        <Ionicons name="time-outline" size={24} color={J.goldDim} />
                        <Text style={{ fontSize: typography.fontSize.base, color: J.goldDim }}>Waiting for buzzer...</Text>
                    </View>
                </Animated.View>
            )}

            {/* Buzzer — THE BIG BUTTON */}
            {phase === 'buzzer' && clue && (
                <Animated.View entering={FadeIn.duration(200)} style={[s.center, { paddingHorizontal: spacing.lg }]}>
                    <Text style={s.pClueCat}>{cats[clue.categoryIndex]?.name.toUpperCase()}</Text>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: J.white, textAlign: 'center', marginBottom: spacing.xl, opacity: 0.8, lineHeight: 22 }} numberOfLines={3}>{clue.clue}</Text>
                    <BuzzerButton onPress={buzz} disabled={hasBuzzed} />
                    {hasBuzzed && (
                        <Animated.View entering={FadeInDown.duration(300)}>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: J.gold, fontFamily: 'Inter-Bold' }}>Buzzed in!</Text>
                        </Animated.View>
                    )}
                </Animated.View>
            )}

            {/* Answer — who buzzed */}
            {phase === 'answer' && clue && (
                <Animated.View entering={FadeIn.duration(300)} style={s.center}>
                    <Text style={s.pClueCat}>{cats[clue.categoryIndex]?.name.toUpperCase()}</Text>
                    <Text style={s.pClueTxt}>{clue.clue}</Text>
                    <Animated.View entering={ZoomIn.duration(400).springify()} style={s.pBuzzedCard}>
                        <Ionicons name="hand-left" size={32} color={J.gold} />
                        <Text style={s.pBuzzedName}>{buzzedPlayer?.id === gs.myPlayerId ? "That's you!" : buzzedPlayer?.name ?? 'Someone'}</Text>
                        <Text style={{ fontSize: typography.fontSize.base, color: J.white, opacity: 0.6 }}>is answering...</Text>
                    </Animated.View>
                </Animated.View>
            )}

            {/* Final: category */}
            {phase === 'final_category' && fj && (
                <Animated.View entering={FadeIn.duration(600)} style={s.center}>
                    <Text style={s.fjLabel}>FINAL JEOPARDY!</Text>
                    <Text style={s.fjCat}>{fj.category}</Text>
                    <Text style={s.pWaitSub}>Get ready to place your wager...</Text>
                </Animated.View>
            )}

            {/* Final: wager */}
            {phase === 'final_wager' && fj && (
                <Animated.View entering={FadeIn.duration(400)} style={s.center}>
                    <Text style={s.fjLabel}>FINAL JEOPARDY!</Text>
                    <Text style={s.fjCat}>{fj.category}</Text>
                    {!wagerSubmitted ? (
                        <View style={s.inputArea}>
                            <Text style={s.inputLabel}>Your wager (max ${Math.max(0, myScore)}):</Text>
                            <TextInput style={s.input} value={wagerInput} onChangeText={setWagerInput}
                                keyboardType="number-pad" placeholder="0" placeholderTextColor="#888" maxLength={6} />
                            <TouchableOpacity style={s.submitBtn} onPress={submitWager}>
                                <Text style={s.submitTxt}>LOCK IN WAGER</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <Animated.View entering={ZoomIn.duration(300).springify()} style={{ alignItems: 'center' }}>
                            <Ionicons name="lock-closed" size={40} color={J.gold} />
                            <Text style={s.lockedTxt}>Wager locked!</Text>
                        </Animated.View>
                    )}
                </Animated.View>
            )}

            {/* Final: answer */}
            {phase === 'final_answer' && fj && (
                <Animated.View entering={FadeIn.duration(400)} style={s.center}>
                    <Text style={s.fjLabel}>FINAL JEOPARDY!</Text>
                    <Text style={s.pClueTxt}>{fj.clue}</Text>
                    {!finalSubmitted ? (
                        <View style={s.inputArea}>
                            <Text style={s.inputLabel}>Your answer:</Text>
                            <TextInput style={[s.input, { height: 56 }]} value={finalAnswer} onChangeText={setFinalAnswer}
                                placeholder="What is..." placeholderTextColor="#888" autoCapitalize="sentences"
                                returnKeyType="done" onSubmitEditing={submitFinal} />
                            <TouchableOpacity style={[s.submitBtn, !finalAnswer.trim() && { opacity: 0.5 }]}
                                onPress={submitFinal} disabled={!finalAnswer.trim()}>
                                <Text style={s.submitTxt}>SUBMIT ANSWER</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <Animated.View entering={ZoomIn.duration(300).springify()} style={{ alignItems: 'center' }}>
                            <Ionicons name="lock-closed" size={40} color={J.gold} />
                            <Text style={s.lockedTxt}>Answer submitted!</Text>
                        </Animated.View>
                    )}
                </Animated.View>
            )}

            {/* Final: reveal (player watches) */}
            {phase === 'final_reveal' && fj && (
                <Animated.View entering={FadeIn.duration(400)} style={s.center}>
                    <Text style={s.fjLabel}>FINAL JEOPARDY!</Text>
                    <Text style={s.pWaitSub}>The host is revealing answers...</Text>
                    <MiniScores />
                </Animated.View>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingTop: spacing.sm, paddingBottom: insets.bottom + spacing.xs }}>
                <Ionicons name="people-outline" size={14} color={J.goldDim} />
                <Text style={{ fontSize: typography.fontSize.xs, color: J.goldDim }}>{players.filter((p) => p.isConnected).length} playing</Text>
            </View>
        </LinearGradient>
    );
}

// ============================================
// Styles
// ============================================

const s = StyleSheet.create({
    flex: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingBottom: spacing.xs },
    closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 22, fontWeight: '900', color: J.gold, letterSpacing: 2, fontFamily: 'Inter-Bold' },
    prog: { fontSize: typography.fontSize.sm, fontWeight: '700', color: J.white, opacity: 0.7 },
    progBadge: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },

    // Board
    boardWrap: { flex: 1, paddingHorizontal: PAD, paddingTop: spacing.xs },
    catRow: { flexDirection: 'row', gap: GAP, marginBottom: GAP },
    catCell: { height: 52, backgroundColor: J.cell, borderRadius: 4, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
    catText: { fontSize: 10, fontWeight: '800', color: J.gold, textAlign: 'center', letterSpacing: 0.5, fontFamily: 'Inter-Bold' },
    row: { flexDirection: 'row', gap: GAP, marginBottom: GAP },
    cell: { flex: 1, height: CH, backgroundColor: J.cell, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
    cellVal: { fontSize: 18, fontWeight: '900', color: J.gold, fontFamily: 'Inter-Bold' },

    // Clue overlay
    clueCat: { fontSize: 14, fontWeight: '700', color: J.gold, letterSpacing: 1.5, marginBottom: spacing.sm, textAlign: 'center', fontFamily: 'Inter-Bold' },
    clueVal: { fontSize: 28, fontWeight: '900', color: J.gold, marginBottom: spacing.lg, fontFamily: 'Inter-Bold' },
    clueTxt: { fontSize: 26, fontWeight: '700', color: J.white, textAlign: 'center', lineHeight: 36, marginBottom: spacing.xl, fontFamily: 'Inter-Bold' },

    // Host controls
    openBuzzer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: J.red, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: 16 },
    openBuzzerTxt: { fontSize: 18, fontWeight: '800', color: J.white, letterSpacing: 1, fontFamily: 'Inter-Bold' },
    buzzerBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: 'rgba(255,45,45,0.15)', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 12, borderWidth: 1, borderColor: J.red + '40', marginBottom: spacing.lg },
    buzzerBadgeTxt: { fontSize: 16, fontWeight: '800', color: J.red, letterSpacing: 1, fontFamily: 'Inter-Bold' },
    skipBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)' },
    buzzedCard: { alignItems: 'center', gap: spacing.sm, backgroundColor: 'rgba(255,215,0,0.1)', paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, borderRadius: 16, borderWidth: 1, borderColor: J.gold + '30', marginBottom: spacing.lg },
    buzzedName: { fontSize: 24, fontWeight: '800', color: J.gold, fontFamily: 'Inter-Bold' },
    judgeRow: { flexDirection: 'row', gap: spacing.lg },
    judgeBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: 14 },
    judgeTxt: { fontSize: 18, fontWeight: '800', color: J.white, fontFamily: 'Inter-Bold' },

    // Final Jeopardy
    fjLabel: { fontSize: 20, fontWeight: '900', color: J.gold, letterSpacing: 2, marginBottom: spacing.lg, textAlign: 'center', fontFamily: 'Inter-Bold' },
    fjCat: { fontSize: 30, fontWeight: '800', color: J.white, textAlign: 'center', marginBottom: spacing.xl, fontFamily: 'Inter-Bold' },
    waitTxt: { fontSize: 18, fontWeight: '600', color: J.white, opacity: 0.8, marginTop: spacing.lg },
    waitSub: { fontSize: typography.fontSize.sm, color: J.goldDim, marginTop: spacing.xs },
    finalBtn: { alignSelf: 'center', marginTop: spacing.md, backgroundColor: J.gold, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm + 2, borderRadius: 12 },
    finalBtnTxt: { fontSize: 14, fontWeight: '800', color: J.bgDark, letterSpacing: 1, fontFamily: 'Inter-Bold' },
    fjRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
    fjRowName: { fontSize: 16, fontWeight: '700', color: J.white, fontFamily: 'Inter-Bold' },
    fjJudge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    endBtn: { backgroundColor: J.gold, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: 14, marginTop: spacing.lg, marginBottom: spacing.md },
    endBtnTxt: { fontSize: 16, fontWeight: '800', color: J.bgDark, letterSpacing: 1, fontFamily: 'Inter-Bold' },

    // Scoreboard
    scoreCard: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, alignItems: 'center', minWidth: 70 },
    scoreVal: { fontSize: 16, fontWeight: '800', color: J.gold, fontFamily: 'Inter-Bold' },

    // Player
    pScore: { fontSize: 22, fontWeight: '900', color: J.gold, fontFamily: 'Inter-Bold' },
    pWaitTitle: { fontSize: 22, fontWeight: '800', color: J.white, marginTop: spacing.lg, fontFamily: 'Inter-Bold' },
    pWaitSub: { fontSize: typography.fontSize.base, color: J.white, opacity: 0.6, textAlign: 'center', marginTop: spacing.sm, lineHeight: 22 },
    pClueCat: { fontSize: 12, fontWeight: '700', color: J.gold, letterSpacing: 1.5, marginBottom: spacing.sm, textAlign: 'center' },
    pClueTxt: { fontSize: 20, fontWeight: '700', color: J.white, textAlign: 'center', lineHeight: 28, marginBottom: spacing.lg, fontFamily: 'Inter-Bold' },
    pBuzzedCard: { alignItems: 'center', gap: spacing.sm, backgroundColor: 'rgba(255,215,0,0.08)', paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, borderRadius: 16, borderWidth: 1, borderColor: J.gold + '20' },
    pBuzzedName: { fontSize: 22, fontWeight: '800', color: J.gold, fontFamily: 'Inter-Bold' },

    // Mini scores
    miniRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8 },
    miniRank: { fontSize: 14, fontWeight: '700', color: J.goldDim, width: 24 },
    miniName: { flex: 1, fontSize: 14, fontWeight: '600', color: J.white },
    miniVal: { fontSize: 14, fontWeight: '800', color: J.gold, fontFamily: 'Inter-Bold' },

    // Buzzer button
    buzzer: { width: 180, height: 180, borderRadius: 90, overflow: 'hidden', elevation: 8, shadowColor: J.red, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 16 },
    buzzerGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    buzzerText: { fontSize: 24, fontWeight: '900', color: J.white, marginTop: spacing.xs, letterSpacing: 2, fontFamily: 'Inter-Bold' },

    // Input areas (Final Jeopardy player)
    inputArea: { width: '100%', alignItems: 'center', marginTop: spacing.lg },
    inputLabel: { fontSize: typography.fontSize.base, fontWeight: '600', color: J.white, opacity: 0.8, marginBottom: spacing.sm },
    input: { width: '80%', height: 48, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, borderWidth: 1, borderColor: J.gold + '40', color: J.white, fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: spacing.md },
    submitBtn: { backgroundColor: J.gold, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: 14 },
    submitTxt: { fontSize: 16, fontWeight: '800', color: J.bgDark, letterSpacing: 1, fontFamily: 'Inter-Bold' },
    lockedTxt: { fontSize: 18, fontWeight: '700', color: J.gold, marginTop: spacing.sm, textAlign: 'center', fontFamily: 'Inter-Bold' },
});
