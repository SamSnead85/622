import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Share, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { typography, spacing } from '@zerog/ui';
import { useTheme } from '../../contexts/ThemeContext';
import { ScreenHeader, ErrorBoundary } from '../../components';
import { socketManager } from '../../lib/socket';
import { useAuthStore } from '../../stores';

const PARTY_GAMES = [
    { type: 'jeopardy', name: 'Jeopardy!', icon: 'help-circle', desc: 'Classic quiz show with categories and buzzer', minPlayers: 2, maxPlayers: 12 },
    { type: 'wheel-of-fortune', name: 'Wheel of Fortune', icon: 'sync-circle', desc: 'Spin the wheel, guess letters, solve puzzles', minPlayers: 2, maxPlayers: 8 },
    { type: 'family-feud', name: 'Family Feud', icon: 'people-circle', desc: 'Team vs team — name the top survey answers', minPlayers: 4, maxPlayers: 16 },
] as const;

const QUESTION_PACKS = [
    { id: 'general', name: 'General Knowledge', icon: 'globe', desc: 'Geography, science, history, pop culture' },
    { id: 'islamic', name: 'Islamic Knowledge', icon: 'moon', desc: 'Quran, prophets, history, culture' },
    { id: 'all', name: 'Mix of Everything', icon: 'shuffle', desc: 'Random mix from all categories' },
] as const;

export default function PartySetupScreen() {
    const { colors: c } = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const params = useLocalSearchParams<{ type?: string }>();
    const user = useAuthStore(s => s.user);

    const [selectedGame, setSelectedGame] = useState(params.type || '');
    const [selectedPack, setSelectedPack] = useState('general');
    const [rounds, setRounds] = useState('5');
    const [isCreating, setIsCreating] = useState(false);

    const handleCreate = useCallback(async () => {
        if (!selectedGame || isCreating) return;
        setIsCreating(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            socketManager.emit('game:create', {
                type: selectedGame,
                playerName: user?.displayName || user?.username || 'Host',
                avatarUrl: user?.avatarUrl,
                settings: {
                    pack: selectedPack,
                    rounds: parseInt(rounds, 10) || 5,
                    hostMode: true,
                },
            });

            // Listen for game created response
            const handler = (data: Record<string, unknown>) => {
                socketManager.off('game:created', handler);
                const code = data.code as string;
                if (code) {
                    router.replace(`/games/${selectedGame}/${code}`);
                }
            };
            socketManager.on('game:created', handler);

            // Timeout fallback
            setTimeout(() => {
                socketManager.off('game:created', handler);
                setIsCreating(false);
            }, 10000);
        } catch {
            setIsCreating(false);
            Alert.alert('Error', 'Failed to create game. Please try again.');
        }
    }, [selectedGame, selectedPack, rounds, isCreating, user, router]);

    const handleShare = useCallback(async (code: string) => {
        try {
            await Share.share({
                message: `Join my ${selectedGame} game on 0G! 🎮\n\nhttps://0gravity.ai/game/${code}`,
            });
        } catch {
            // Share cancelled
        }
    }, [selectedGame]);

    return (
        <ErrorBoundary>
        <View style={[styles.container, { backgroundColor: c.background }]}>
            <ScreenHeader title="Game Night Setup" />
            <ScrollView
                contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Step 1: Choose Game */}
                <Animated.View entering={FadeInDown.delay(100).duration(300)}>
                    <Text style={[styles.stepLabel, { color: c.text.muted }]}>CHOOSE A GAME</Text>
                    <View style={styles.gameGrid}>
                        {PARTY_GAMES.map((game) => {
                            const isActive = selectedGame === game.type;
                            return (
                                <TouchableOpacity
                                    key={game.type}
                                    style={[
                                        styles.gameCard,
                                        { backgroundColor: c.surface.glass, borderColor: c.border.subtle },
                                        isActive && { borderColor: c.gold[500], backgroundColor: c.surface.goldSubtle },
                                    ]}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setSelectedGame(game.type);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name={game.icon as keyof typeof Ionicons.glyphMap} size={32} color={isActive ? c.gold[500] : c.text.secondary} />
                                    <Text style={[styles.gameName, { color: isActive ? c.gold[400] : c.text.primary }]}>{game.name}</Text>
                                    <Text style={[styles.gameDesc, { color: c.text.muted }]} numberOfLines={2}>{game.desc}</Text>
                                    <Text style={[styles.gamePlayers, { color: c.text.muted }]}>{game.minPlayers}-{game.maxPlayers} players</Text>
                                    {isActive && <Ionicons name="checkmark-circle" size={20} color={c.gold[500]} style={styles.checkIcon} />}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </Animated.View>

                {/* Step 2: Question Pack */}
                {selectedGame && (
                    <Animated.View entering={FadeInDown.delay(200).duration(300)}>
                        <Text style={[styles.stepLabel, { color: c.text.muted }]}>QUESTION PACK</Text>
                        {QUESTION_PACKS.map((pack) => {
                            const isActive = selectedPack === pack.id;
                            return (
                                <TouchableOpacity
                                    key={pack.id}
                                    style={[
                                        styles.packRow,
                                        { backgroundColor: c.surface.glass, borderColor: c.border.subtle },
                                        isActive && { borderColor: c.gold[500] },
                                    ]}
                                    onPress={() => setSelectedPack(pack.id)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name={pack.icon as keyof typeof Ionicons.glyphMap} size={24} color={isActive ? c.gold[500] : c.text.secondary} />
                                    <View style={styles.packText}>
                                        <Text style={[styles.packName, { color: c.text.primary }]}>{pack.name}</Text>
                                        <Text style={[styles.packDesc, { color: c.text.muted }]}>{pack.desc}</Text>
                                    </View>
                                    {isActive && <Ionicons name="checkmark-circle" size={20} color={c.gold[500]} />}
                                </TouchableOpacity>
                            );
                        })}
                    </Animated.View>
                )}

                {/* Step 3: Rounds */}
                {selectedGame && (
                    <Animated.View entering={FadeInDown.delay(300).duration(300)}>
                        <Text style={[styles.stepLabel, { color: c.text.muted }]}>NUMBER OF ROUNDS</Text>
                        <View style={[styles.roundsRow, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}>
                            {['3', '5', '7', '10'].map((r) => (
                                <TouchableOpacity
                                    key={r}
                                    style={[
                                        styles.roundBtn,
                                        { borderColor: c.border.subtle },
                                        rounds === r && { backgroundColor: c.gold[500], borderColor: c.gold[500] },
                                    ]}
                                    onPress={() => setRounds(r)}
                                >
                                    <Text style={[styles.roundText, { color: rounds === r ? '#fff' : c.text.secondary }]}>{r}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Animated.View>
                )}

                {/* Create Button */}
                {selectedGame && (
                    <Animated.View entering={FadeInDown.delay(400).duration(300)}>
                        <TouchableOpacity
                            style={[styles.createBtn, { backgroundColor: c.gold[500], opacity: isCreating ? 0.6 : 1 }]}
                            onPress={handleCreate}
                            disabled={isCreating}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="game-controller" size={24} color="#fff" />
                            <Text style={styles.createText}>{isCreating ? 'Creating...' : 'Create Game Room'}</Text>
                        </TouchableOpacity>
                        <Text style={[styles.hint, { color: c.text.muted }]}>
                            Share the room link with friends — no account needed to join!
                        </Text>
                    </Animated.View>
                )}
            </ScrollView>
        </View>
        </ErrorBoundary>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
    stepLabel: { fontSize: typography.fontSize.xs, fontWeight: '700', letterSpacing: 1, marginBottom: spacing.sm, marginTop: spacing.lg },
    gameGrid: { gap: spacing.sm },
    gameCard: { borderRadius: 14, borderWidth: 1, padding: spacing.md, flexDirection: 'column', gap: 6 },
    gameName: { fontSize: typography.fontSize.md, fontWeight: '700' },
    gameDesc: { fontSize: typography.fontSize.sm, lineHeight: 18 },
    gamePlayers: { fontSize: typography.fontSize.xs, fontWeight: '500' },
    checkIcon: { position: 'absolute', top: 12, right: 12 },
    packRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: 12, borderWidth: 1, marginBottom: spacing.xs },
    packText: { flex: 1 },
    packName: { fontSize: typography.fontSize.sm, fontWeight: '600' },
    packDesc: { fontSize: typography.fontSize.xs },
    roundsRow: { flexDirection: 'row', gap: spacing.sm, padding: spacing.sm, borderRadius: 12, borderWidth: 1 },
    roundBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
    roundText: { fontSize: typography.fontSize.md, fontWeight: '700' },
    createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: 16, borderRadius: 14, marginTop: spacing.xl },
    createText: { fontSize: typography.fontSize.md, fontWeight: '700', color: '#fff' },
    hint: { fontSize: typography.fontSize.xs, textAlign: 'center', marginTop: spacing.sm },
});
