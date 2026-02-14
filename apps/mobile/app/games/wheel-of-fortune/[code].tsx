// ============================================
// Wheel of Fortune — Multiplayer Word Puzzle Game
// Host: wheel + puzzle board (castable to TV)
// Player: spin, guess letters, solve phrases
// ============================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    ScrollView, Dimensions, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import Animated, {
    FadeInDown, FadeIn, FadeOut, ZoomIn,
    useSharedValue, useAnimatedStyle,
    withTiming, withSpring, withSequence, withDelay, Easing,
} from 'react-native-reanimated';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { typography, spacing } from '@zerog/ui';
import { GlassCard, LoadingView } from '../../../components';
import { useGameStore } from '../../../stores';
import { useTheme } from '../../../contexts/ThemeContext';
import { socketManager } from '../../../lib/socket';

const { width: SW } = Dimensions.get('window');
const WHEEL_SIZE = Math.min(SW - spacing.lg * 2, 280);
const TILE_SIZE = 32;
const TILE_GAP = 3;
const VOWEL_COST = 250;
const CONSONANTS = 'BCDFGHJKLMNPQRSTVWXYZ'.split('');
const VOWELS = 'AEIOU'.split('');

type Phase = 'spin' | 'letter' | 'solve' | 'waiting' | 'between';

const SEGMENTS = [
    { value: 500, color: '#E74C3C', label: '500' }, { value: 600, color: '#3498DB', label: '600' },
    { value: 700, color: '#2ECC71', label: '700' }, { value: 800, color: '#F39C12', label: '800' },
    { value: 900, color: '#9B59B6', label: '900' }, { value: 300, color: '#1ABC9C', label: '300' },
    { value: 0, color: '#000000', label: 'BANKRUPT' }, { value: 500, color: '#E67E22', label: '500' },
    { value: 400, color: '#2980B9', label: '400' }, { value: 1000, color: '#27AE60', label: '1000' },
    { value: -1, color: '#ECF0F1', label: 'LOSE\nTURN' }, { value: 350, color: '#C0392B', label: '350' },
    { value: 450, color: '#8E44AD', label: '450' }, { value: 550, color: '#16A085', label: '550' },
    { value: 650, color: '#D35400', label: '650' }, { value: 2500, color: '#F1C40F', label: '2500' },
];

// ---- Helpers ----
const col = (c: Record<string, unknown> | undefined, key: string, fb: string) =>
    ((c as Record<string, string> | undefined)?.[key] ?? fb);

// ---- Letter Tile ----
function LetterTile({ letter, revealed, isSpace }: { letter: string; revealed: boolean; isSpace: boolean }) {
    const { colors: c } = useTheme();
    if (isSpace) return <View style={s.tileSpacer} />;
    const bg = revealed ? c.surface.glass : col(c.azure, '600', '#2563eb');
    const bc = revealed ? col(c.gold, '500', '#eab308') + '60' : col(c.azure, '500', '#3b82f6') + '40';
    return (
        <Animated.View entering={revealed ? FadeIn.duration(400) : undefined}
            style={[s.tile, { backgroundColor: bg, borderColor: bc }]}>
            <Text style={[s.tileLetter, {
                color: revealed ? c.text.primary : 'transparent',
                textShadowColor: revealed ? col(c.gold, '500', '#eab308') + '40' : 'transparent',
                textShadowRadius: revealed ? 6 : 0,
            }]}>{letter}</Text>
        </Animated.View>
    );
}

// ---- Puzzle Board ----
function PuzzleBoard({ phrase, revealedLetters, category }: {
    phrase: string; revealedLetters: Set<string>; category: string;
}) {
    const { colors: c } = useTheme();
    const maxPerRow = Math.floor((SW - spacing.lg * 2) / (TILE_SIZE + TILE_GAP));
    const rows: string[][] = [];
    let row: string[] = [], len = 0;
    for (const word of phrase.split(' ')) {
        if (len > 0 && len + 1 + word.length > maxPerRow) { rows.push(row); row = []; len = 0; }
        if (len > 0) { row.push(' '); len++; }
        for (const ch of word) { row.push(ch); }
        len += word.length;
    }
    if (row.length) rows.push(row);

    return (
        <View style={s.puzzleBoard}>
            <View style={[s.categoryBadge, { backgroundColor: col(c.gold, '500', '#eab308') + '15', borderColor: col(c.gold, '500', '#eab308') + '30' }]}>
                <Text style={[s.categoryText, { color: col(c.gold, '400', '#facc15') }]}>{category}</Text>
            </View>
            {rows.map((r, ri) => (
                <View key={ri} style={s.puzzleRow}>
                    {r.map((ch, ci) => (
                        <LetterTile key={`${ri}-${ci}`} letter={ch.toUpperCase()}
                            revealed={ch === ' ' || revealedLetters.has(ch.toUpperCase())} isSpace={ch === ' '} />
                    ))}
                </View>
            ))}
        </View>
    );
}

// ---- Scoreboard ----
function Scoreboard({ players, currentPlayerId }: {
    players: Array<{ id: string; name: string; score: number; isConnected: boolean }>; currentPlayerId: string | null;
}) {
    const { colors: c } = useTheme();
    return (
        <View style={s.scoreboard}>
            {players.filter(p => p.isConnected).map(p => {
                const active = p.id === currentPlayerId;
                return (
                    <View key={p.id} style={[s.scoreCard, {
                        backgroundColor: active ? col(c.gold, '500', '#eab308') + '15' : c.surface.glass,
                        borderColor: active ? col(c.gold, '500', '#eab308') + '40' : c.border.subtle,
                    }]}>
                        {active && <Ionicons name="caret-down" size={14} color={col(c.gold, '400', '#facc15')} />}
                        <Text style={[s.scorePlayerName, { color: c.text.primary }]} numberOfLines={1}>{p.name}</Text>
                        <Text style={[s.scoreValue, { color: active ? col(c.gold, '400', '#facc15') : c.text.secondary }]}>
                            ${p.score.toLocaleString()}</Text>
                    </View>
                );
            })}
        </View>
    );
}

// ---- Result Banner ----
function ResultBanner({ result, c }: { result: string; c: ReturnType<typeof useTheme>['colors'] }) {
    const cfg = result === 'correct'
        ? { icon: 'checkmark-circle' as const, ck: 'emerald', fb4: '#34d399', fb5: '#10b981', text: 'Correct!' }
        : result === 'bankrupt'
            ? { icon: 'skull' as const, ck: 'coral', fb4: '#f87171', fb5: '#ef4444', text: 'BANKRUPT!' }
            : { icon: 'close-circle' as const, ck: 'amber', fb4: '#fbbf24', fb5: '#f59e0b', text: 'Not in the puzzle' };
    const c4 = col(c[cfg.ck as keyof typeof c] as Record<string, string>, '400', cfg.fb4);
    const c5 = col(c[cfg.ck as keyof typeof c] as Record<string, string>, '500', cfg.fb5);
    return (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(300)}>
            <View style={[s.resultBanner, { backgroundColor: c5 + '15', borderColor: c5 + '40' }]}>
                <Ionicons name={cfg.icon} size={18} color={c4} />
                <Text style={[s.resultText, { color: c4 }]}>{cfg.text}</Text>
            </View>
        </Animated.View>
    );
}

// ---- Letter Keyboard ----
function LetterKeyboard({ usedLetters, onSelect, isVowelMode }: {
    usedLetters: Set<string>; onSelect: (l: string) => void; isVowelMode: boolean;
}) {
    const { colors: c } = useTheme();
    const letters = isVowelMode ? VOWELS : CONSONANTS;
    return (
        <View style={s.keyboard}>
            <Text style={[s.kbLabel, { color: c.text.muted }]}>{isVowelMode ? 'VOWELS' : 'CONSONANTS'}</Text>
            <View style={s.kbGrid}>
                {letters.map(l => {
                    const used = usedLetters.has(l);
                    return (
                        <TouchableOpacity key={l} disabled={used} onPress={() => !used && onSelect(l)}
                            activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={`Letter ${l}`}
                            style={[s.keyBtn, {
                                backgroundColor: used ? (c.obsidian?.[700] ?? '#334155') : col(c.azure, '600', '#2563eb') + '30',
                                borderColor: used ? c.border.subtle : col(c.azure, '500', '#3b82f6') + '50',
                                opacity: used ? 0.4 : 1,
                            }]}>
                            <Text style={[s.keyText, { color: used ? c.text.muted : c.text.primary }]}>{l}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

// ============================================
// Main Screen
// ============================================

export default function WheelOfFortuneScreen() {
    const router = useRouter();
    const { code } = useLocalSearchParams<{ code: string }>();
    const insets = useSafeAreaInsets();
    const { colors: c } = useTheme();
    const gs = useGameStore();

    const [phrase, setPhrase] = useState('');
    const [category, setCategory] = useState('');
    const [revealedLetters, setRevealedLetters] = useState<Set<string>>(new Set());
    const [usedLetters, setUsedLetters] = useState<Set<string>>(new Set());
    const [currentPlayerId, setCurPlayer] = useState<string | null>(null);
    const [spinValue, setSpinValue] = useState<number | null>(null);
    const [phase, setPhase] = useState<Phase>('waiting');
    const [showSolve, setShowSolve] = useState(false);
    const [solveGuess, setSolveGuess] = useState('');
    const [isVowelMode, setIsVowelMode] = useState(false);
    const [lastResult, setLastResult] = useState<string | null>(null);
    const [roundWinner, setRoundWinner] = useState<string | null>(null);

    const isMountedRef = useRef(true);
    const resultTORef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { players, isHost, myPlayerId } = gs;
    const isMyTurn = currentPlayerId === myPlayerId;
    const myScore = players.find(p => p.id === myPlayerId)?.score ?? 0;

    const wheelRot = useSharedValue(0);
    const spinScale = useSharedValue(1);
    const glowOp = useSharedValue(0);

    // Pulsing spin button
    useEffect(() => {
        if (isMyTurn && phase === 'spin') {
            const pulse = () => {
                spinScale.value = withSequence(
                    withTiming(1.05, { duration: 600, easing: Easing.inOut(Easing.ease) }),
                    withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
                );
            };
            pulse();
            const id = setInterval(pulse, 1200);
            return () => clearInterval(id);
        }
    }, [isMyTurn, phase, spinScale]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; if (resultTORef.current) clearTimeout(resultTORef.current); };
    }, []);

    // Sync initial game data
    useEffect(() => {
        const gd = gs.gameData;
        if (gd) {
            if (gd.phrase) setPhrase(gd.phrase as string);
            if (gd.category) setCategory(gd.category as string);
            if (gd.revealedLetters) setRevealedLetters(new Set(gd.revealedLetters as string[]));
            if (gd.usedLetters) setUsedLetters(new Set(gd.usedLetters as string[]));
            if (gd.currentPlayerId) setCurPlayer(gd.currentPlayerId as string);
            if (gd.phase) setPhase(gd.phase as Phase);
            if (gd.spinValue !== undefined) setSpinValue(gd.spinValue as number | null);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Socket listeners
    useEffect(() => {
        const applyGD = (gd: Record<string, unknown>) => {
            if (gd.phrase !== undefined) setPhrase(gd.phrase as string);
            if (gd.category !== undefined) setCategory(gd.category as string);
            if (gd.revealedLetters) setRevealedLetters(new Set(gd.revealedLetters as string[]));
            if (gd.usedLetters) setUsedLetters(new Set(gd.usedLetters as string[]));
            if (gd.currentPlayerId !== undefined) setCurPlayer(gd.currentPlayerId as string);
            if (gd.phase !== undefined) setPhase(gd.phase as Phase);
            if (gd.spinValue !== undefined) setSpinValue(gd.spinValue as number | null);
        };

        const showResult = (r: string) => {
            setLastResult(r);
            if (r === 'correct') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                glowOp.value = withSequence(withTiming(1, { duration: 200 }), withDelay(600, withTiming(0, { duration: 400 })));
            } else if (r === 'bankrupt') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (resultTORef.current) clearTimeout(resultTORef.current);
            resultTORef.current = setTimeout(() => { if (isMountedRef.current) setLastResult(null); }, 2000);
        };

        const unsubs = [
            socketManager.on('game:update', (data: Record<string, unknown>) => {
                if (!isMountedRef.current) return;
                gs.updateFromDelta(data);
                const gd = data.gameData as Record<string, unknown> | undefined;
                if (gd) {
                    applyGD(gd);
                    if (gd.wheelResult !== undefined) {
                        wheelRot.value = withTiming(wheelRot.value + 720 + Math.random() * 360, { duration: 3000, easing: Easing.out(Easing.cubic) });
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    }
                    if (gd.lastResult !== undefined) showResult(gd.lastResult as string);
                }
            }),
            socketManager.on('game:round-start', (data: Record<string, unknown>) => {
                if (!isMountedRef.current) return;
                setRevealedLetters(new Set()); setUsedLetters(new Set());
                setSpinValue(null); setLastResult(null); setRoundWinner(null);
                setIsVowelMode(false); setSolveGuess('');
                const gd = data.gameData as Record<string, unknown> | undefined;
                if (gd) applyGD(gd);
            }),
            socketManager.on('game:round-end', (data: Record<string, unknown>) => {
                if (!isMountedRef.current) return;
                gs.setRoundEnd(data);
                const gd = data.gameData as Record<string, unknown> | undefined;
                if (gd?.winner) setRoundWinner(gd.winner as string);
                setPhase('between');
            }),
            socketManager.on('game:ended', (data: Record<string, unknown>) => {
                if (!isMountedRef.current) return;
                gs.setGameEnded(data); router.replace(`/games/results/${code}`);
            }),
            socketManager.on('game:error', (data: Record<string, unknown>) => {
                if (!isMountedRef.current) return;
                gs.setError((data as { message: string }).message);
            }),
        ];
        return () => unsubs.forEach(fn => fn());
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [code]);

    const handleSpin = useCallback(() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); gs.sendAction('spin', {}); }, [gs]);
    const handleLetter = useCallback((l: string) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); gs.sendAction('guess_letter', { letter: l }); setIsVowelMode(false); }, [gs]);
    const handleSolve = useCallback(() => {
        const g = solveGuess.trim(); if (!g) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); gs.sendAction('solve', { guess: g }); setShowSolve(false); setSolveGuess('');
    }, [solveGuess, gs]);
    const handleLeave = useCallback(() => { gs.leaveGame(); router.replace('/games'); }, [gs, router]);

    const wheelStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${wheelRot.value}deg` }] }));
    const spinBtnStyle = useAnimatedStyle(() => ({ transform: [{ scale: spinScale.value }] }));
    const glowStyle = useAnimatedStyle(() => ({ opacity: glowOp.value }));

    const gold4 = col(c.gold, '400', '#facc15');
    const gold5 = col(c.gold, '500', '#eab308');
    const em4 = col(c.emerald, '400', '#34d399');
    const em5 = col(c.emerald, '500', '#10b981');
    const bg9 = c.obsidian?.[900] ?? '#0f172a';
    const bg8 = c.obsidian?.[800] ?? '#1e293b';
    const curName = players.find(p => p.id === currentPlayerId)?.name ?? '...';

    if (!phrase && gs.status === 'idle') {
        return <LinearGradient colors={[bg9, bg8]} style={s.flex}><LoadingView message="Connecting to game..." /></LinearGradient>;
    }

    // ---- Shared header ----
    const Header = (
        <View style={[s.topBar, { paddingTop: insets.top + spacing.sm }]}>
            <TouchableOpacity onPress={handleLeave} style={[s.leaveBtn, { backgroundColor: c.surface.glass }]}>
                <Ionicons name="close" size={22} color={c.text.secondary} />
            </TouchableOpacity>
            {isHost ? (
                <Text style={[s.gameTitle, { color: gold4 }]}>WHEEL OF FORTUNE</Text>
            ) : (
                <View style={s.row}><Ionicons name="star" size={14} color={gold5} />
                    <Text style={[s.playerScore, { color: gold4 }]}>${myScore.toLocaleString()}</Text></View>
            )}
            <View style={[s.roundBadge, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}>
                <Text style={[s.roundText, { color: c.text.primary }]}>R{gs.round}/{gs.totalRounds}</Text>
            </View>
        </View>
    );

    // ============================================
    // HOST VIEW
    // ============================================
    if (isHost) return (
        <LinearGradient colors={[bg9, bg8, bg9]} style={s.flex}>
            {Header}
            <ScrollView style={s.flex} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
                {/* Wheel */}
                <Animated.View entering={FadeInDown.delay(100).duration(500)}>
                    <View style={s.wheelWrap}>
                        <Animated.View style={[s.wheel, wheelStyle]}>
                            <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={s.wheelInner}>
                                {SEGMENTS.map((seg, i) => (
                                    <View key={i} style={[s.slice, { backgroundColor: seg.color,
                                        transform: [{ rotate: `${(i / SEGMENTS.length) * 360}deg` }] }]}>
                                        <Text style={[s.sliceText, { color: seg.value === -1 ? '#1a1a2e' : '#fff' }]}
                                            numberOfLines={2} adjustsFontSizeToFit>{seg.label}</Text>
                                    </View>
                                ))}
                            </LinearGradient>
                        </Animated.View>
                        <View style={s.pointer}><Ionicons name="caret-down" size={28} color={gold4} /></View>
                        {spinValue != null && spinValue > 0 && (
                            <Animated.View entering={ZoomIn.duration(300)} style={[s.spinBubble, { backgroundColor: gold5 + '20', borderColor: gold5 + '50' }]}>
                                <Text style={[s.spinBubbleText, { color: gold4 }]}>${spinValue}</Text>
                            </Animated.View>
                        )}
                    </View>
                </Animated.View>
                <Animated.View style={[s.glow, glowStyle, { backgroundColor: em5 + '08' }]} pointerEvents="none" />
                <Animated.View entering={FadeInDown.delay(200).duration(500)}>
                    <PuzzleBoard phrase={phrase} revealedLetters={revealedLetters} category={category} />
                </Animated.View>
                <View style={[s.curBar, { backgroundColor: gold5 + '10', borderColor: gold5 + '30' }]}>
                    <Ionicons name="person" size={16} color={gold4} />
                    <Text style={[s.curBarText, { color: c.text.primary }]}>
                        {curName}{phase === 'spin' ? ' — Spin!' : phase === 'letter' ? ' — Pick a letter' : ''}</Text>
                </View>
                {lastResult && <ResultBanner result={lastResult} c={c} />}
                {roundWinner && (
                    <Animated.View entering={ZoomIn.duration(400)}>
                        <GlassCard style={s.winnerCard} padding="md">
                            <Ionicons name="trophy" size={32} color={gold4} />
                            <Text style={[s.winnerText, { color: gold4 }]}>{roundWinner} solved it!</Text>
                        </GlassCard>
                    </Animated.View>
                )}
                <Scoreboard players={players} currentPlayerId={currentPlayerId} />
                <View style={{ height: spacing['3xl'] }} />
            </ScrollView>
        </LinearGradient>
    );

    // ============================================
    // PLAYER VIEW
    // ============================================
    return (
        <LinearGradient colors={[bg9, bg8, bg9]} style={s.flex}>
            {Header}
            <ScrollView style={s.flex} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
                <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                    <PuzzleBoard phrase={phrase} revealedLetters={revealedLetters} category={category} />
                </Animated.View>
                {/* Turn indicator */}
                <View style={[s.turnInd, {
                    backgroundColor: isMyTurn ? em5 + '15' : c.surface.glass,
                    borderColor: isMyTurn ? em5 + '40' : c.border.subtle,
                }]}>
                    <Ionicons name={isMyTurn ? 'game-controller' : 'time-outline'} size={18}
                        color={isMyTurn ? em4 : c.text.muted} />
                    <Text style={[s.turnText, { color: isMyTurn ? em4 : c.text.muted }]}>
                        {isMyTurn ? 'Your Turn!' : `${curName}'s turn`}</Text>
                </View>
                {/* Spin value */}
                {isMyTurn && spinValue != null && spinValue > 0 && phase === 'letter' && (
                    <Animated.View entering={ZoomIn.duration(300)}>
                        <View style={[s.spinResult, { backgroundColor: gold5 + '15', borderColor: gold5 + '40' }]}>
                            <Text style={[s.spinResultLbl, { color: c.text.muted }]}>YOU SPUN</Text>
                            <Text style={[s.spinResultVal, { color: gold4 }]}>${spinValue}</Text>
                            <Text style={[s.spinResultHint, { color: c.text.secondary }]}>per letter found</Text>
                        </View>
                    </Animated.View>
                )}
                {lastResult && <ResultBanner result={lastResult} c={c} />}
                {/* SPIN button */}
                {isMyTurn && phase === 'spin' && (
                    <Animated.View entering={ZoomIn.duration(400).springify()} style={spinBtnStyle}>
                        <TouchableOpacity style={[s.spinBtn, { shadowColor: gold5 }]} onPress={handleSpin}
                            activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Spin the wheel">
                            <LinearGradient colors={[gold5, c.amber?.[600] ?? '#d97706']} style={s.spinBtnGrad}>
                                <Ionicons name="refresh" size={28} color="#1a1a2e" />
                                <Text style={s.spinBtnText}>SPIN</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>
                )}
                {/* Letter selection */}
                {isMyTurn && phase === 'letter' && (
                    <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                        <LetterKeyboard usedLetters={usedLetters} onSelect={handleLetter} isVowelMode={isVowelMode} />
                        <View style={s.vowelRow}>
                            {!isVowelMode ? (
                                <TouchableOpacity disabled={myScore < VOWEL_COST} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setIsVowelMode(true); }}
                                    style={[s.vowelBtn, { backgroundColor: col(c.azure, '600', '#2563eb') + '20', borderColor: col(c.azure, '500', '#3b82f6') + '40', opacity: myScore >= VOWEL_COST ? 1 : 0.5 }]}
                                    accessibilityRole="button" accessibilityLabel={`Buy a vowel for $${VOWEL_COST}`}>
                                    <Ionicons name="cash-outline" size={16} color={col(c.azure, '400', '#60a5fa')} />
                                    <Text style={[s.vowelBtnText, { color: col(c.azure, '400', '#60a5fa') }]}>Buy Vowel (${VOWEL_COST})</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity onPress={() => setIsVowelMode(false)}
                                    style={[s.vowelBtn, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}>
                                    <Ionicons name="arrow-back" size={16} color={c.text.secondary} />
                                    <Text style={[s.vowelBtnText, { color: c.text.secondary }]}>Back to Consonants</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </Animated.View>
                )}
                {/* Solve button */}
                {isMyTurn && (phase === 'spin' || phase === 'letter') && (
                    <TouchableOpacity style={[s.solveBtn, { backgroundColor: em5 + '20', borderColor: em5 + '40' }]}
                        onPress={() => setShowSolve(true)} activeOpacity={0.7} accessibilityRole="button">
                        <Ionicons name="bulb" size={20} color={em4} />
                        <Text style={[s.solveBtnText, { color: em4 }]}>SOLVE PUZZLE</Text>
                    </TouchableOpacity>
                )}
                {/* Waiting */}
                {!isMyTurn && (
                    <GlassCard style={s.waitCard} padding="md">
                        <Ionicons name="hourglass" size={24} color={c.text.muted} />
                        <Text style={[s.waitText, { color: c.text.secondary }]}>Waiting for {curName}</Text>
                    </GlassCard>
                )}
                {roundWinner && (
                    <Animated.View entering={ZoomIn.duration(400)}>
                        <GlassCard style={s.winnerCard} padding="md">
                            <Ionicons name="trophy" size={28} color={gold4} />
                            <Text style={[s.winnerText, { color: gold4 }]}>{roundWinner} solved it!</Text>
                        </GlassCard>
                    </Animated.View>
                )}
                <Scoreboard players={players} currentPlayerId={currentPlayerId} />
                <View style={{ height: spacing['3xl'] }} />
            </ScrollView>
            {/* Solve Modal */}
            <Modal visible={showSolve} transparent animationType="slide">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalOv}>
                    <View style={[s.modalBox, { backgroundColor: bg8, borderColor: c.border.subtle }]}>
                        <Text style={[s.modalTitle, { color: c.text.primary }]}>Solve the Puzzle</Text>
                        <TextInput style={[s.solveInput, { backgroundColor: c.obsidian?.[700] ?? '#334155', borderColor: c.border.subtle, color: c.text.primary }]}
                            placeholder="Type your answer..." placeholderTextColor={c.text.muted}
                            value={solveGuess} onChangeText={setSolveGuess} autoCapitalize="characters" autoFocus />
                        <View style={s.modalBtns}>
                            <TouchableOpacity style={[s.mBtn, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}
                                onPress={() => { setShowSolve(false); setSolveGuess(''); }}>
                                <Text style={[s.mBtnText, { color: c.text.secondary }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[s.mBtn, { backgroundColor: em5, opacity: solveGuess.trim() ? 1 : 0.5 }]}
                                onPress={handleSolve} disabled={!solveGuess.trim()}>
                                <Text style={[s.mBtnText, { color: '#fff' }]}>Submit</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </LinearGradient>
    );
}

// ============================================
// Styles
// ============================================

const s = StyleSheet.create({
    flex: { flex: 1 },
    content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },

    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
    leaveBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    gameTitle: { fontSize: typography.fontSize.lg, fontWeight: '700', fontFamily: 'Inter-Bold', letterSpacing: 2 },
    playerScore: { fontSize: typography.fontSize.xl, fontWeight: '700', fontFamily: 'Inter-Bold' },
    roundBadge: { borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderWidth: 1 },
    roundText: { fontSize: typography.fontSize.sm, fontWeight: '700', fontFamily: 'Inter-Bold' },

    wheelWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg, height: WHEEL_SIZE + 40 },
    wheel: { width: WHEEL_SIZE, height: WHEEL_SIZE, borderRadius: WHEEL_SIZE / 2, overflow: 'hidden' },
    wheelInner: { width: WHEEL_SIZE, height: WHEEL_SIZE, borderRadius: WHEEL_SIZE / 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    slice: { position: 'absolute', width: WHEEL_SIZE * 0.38, height: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 3, top: WHEEL_SIZE * 0.08, left: WHEEL_SIZE / 2 - (WHEEL_SIZE * 0.38) / 2, transformOrigin: `${(WHEEL_SIZE * 0.38) / 2}px ${WHEEL_SIZE / 2 - WHEEL_SIZE * 0.08}px` },
    sliceText: { fontSize: 8, fontWeight: '700', fontFamily: 'Inter-Bold', textAlign: 'center' },
    pointer: { position: 'absolute', top: -4, zIndex: 10 },
    spinBubble: { position: 'absolute', bottom: -8, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 16, borderWidth: 1 },
    spinBubbleText: { fontSize: typography.fontSize.lg, fontWeight: '700', fontFamily: 'Inter-Bold' },

    puzzleBoard: { alignItems: 'center', marginBottom: spacing.lg, paddingVertical: spacing.md },
    categoryBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 12, borderWidth: 1, marginBottom: spacing.md },
    categoryText: { fontSize: typography.fontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.5 },
    puzzleRow: { flexDirection: 'row', justifyContent: 'center', gap: TILE_GAP, marginBottom: TILE_GAP },
    tile: { width: TILE_SIZE, height: TILE_SIZE * 1.2, borderRadius: 4, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    tileSpacer: { width: TILE_SIZE * 0.5, height: TILE_SIZE * 1.2 },
    tileLetter: { fontSize: typography.fontSize.lg, fontWeight: '700', fontFamily: 'Inter-Bold', textShadowOffset: { width: 0, height: 0 } },

    scoreboard: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
    scoreCard: { flex: 1, minWidth: 80, alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: 12, borderWidth: 1, gap: 2 },
    scorePlayerName: { fontSize: typography.fontSize.xs, fontWeight: '600', textAlign: 'center' },
    scoreValue: { fontSize: typography.fontSize.base, fontWeight: '700', fontFamily: 'Inter-Bold' },

    curBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 12, borderWidth: 1, marginBottom: spacing.md },
    curBarText: { fontSize: typography.fontSize.base, fontWeight: '600' },

    resultBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 12, borderWidth: 1, marginBottom: spacing.md },
    resultText: { fontSize: typography.fontSize.base, fontWeight: '700', fontFamily: 'Inter-Bold' },

    winnerCard: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
    winnerText: { fontSize: typography.fontSize.xl, fontWeight: '700', fontFamily: 'Inter-Bold' },

    glow: { ...StyleSheet.absoluteFillObject, zIndex: 50 },

    turnInd: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 12, borderWidth: 1, marginBottom: spacing.md },
    turnText: { fontSize: typography.fontSize.base, fontWeight: '600' },

    spinResult: { alignItems: 'center', paddingVertical: spacing.md, borderRadius: 16, borderWidth: 1, marginBottom: spacing.md },
    spinResultLbl: { fontSize: typography.fontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
    spinResultVal: { fontSize: 36, fontWeight: '700', fontFamily: 'Inter-Bold' },
    spinResultHint: { fontSize: typography.fontSize.xs, marginTop: 2 },

    spinBtn: { alignSelf: 'center', borderRadius: 40, marginBottom: spacing.lg, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
    spinBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg, paddingHorizontal: spacing['2xl'], borderRadius: 40 },
    spinBtnText: { fontSize: typography.fontSize['2xl'], fontWeight: '700', fontFamily: 'Inter-Bold', color: '#1a1a2e', letterSpacing: 3 },

    keyboard: { marginBottom: spacing.md },
    kbLabel: { fontSize: typography.fontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm, textAlign: 'center' },
    kbGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.xs },
    keyBtn: { width: 40, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    keyText: { fontSize: typography.fontSize.lg, fontWeight: '700', fontFamily: 'Inter-Bold' },

    vowelRow: { alignItems: 'center', marginBottom: spacing.md },
    vowelBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: 12, borderWidth: 1 },
    vowelBtnText: { fontSize: typography.fontSize.sm, fontWeight: '600' },

    solveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: 14, borderWidth: 1, marginBottom: spacing.lg },
    solveBtnText: { fontSize: typography.fontSize.base, fontWeight: '700', fontFamily: 'Inter-Bold', letterSpacing: 1 },

    waitCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
    waitText: { fontSize: typography.fontSize.base, flex: 1 },

    modalOv: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
    modalBox: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, borderWidth: 1, borderBottomWidth: 0 },
    modalTitle: { fontSize: typography.fontSize.xl, fontWeight: '700', fontFamily: 'Inter-Bold', marginBottom: spacing.lg, textAlign: 'center' },
    solveInput: { borderRadius: 14, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, fontSize: typography.fontSize.lg, fontWeight: '600', borderWidth: 1, marginBottom: spacing.lg, textAlign: 'center', letterSpacing: 2 },
    modalBtns: { flexDirection: 'row', gap: spacing.md },
    mBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
    mBtnText: { fontSize: typography.fontSize.base, fontWeight: '700', fontFamily: 'Inter-Bold' },
});
