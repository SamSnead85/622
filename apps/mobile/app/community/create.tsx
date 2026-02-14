import { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView,
    ActivityIndicator, Alert, Platform, KeyboardAvoidingView, Switch,
} from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { typography, spacing } from '@zerog/ui';
import { useTheme } from '../../contexts/ThemeContext';
import { useCommunitiesStore } from '../../stores';
import { apiFetch, apiUpload, API } from '../../lib/api';
import { ScreenHeader } from '../../components';
import { IMAGE_PLACEHOLDER } from '../../lib/imagePlaceholder';

type C = ReturnType<typeof useTheme>['colors'];

const CATEGORIES: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'faith', label: 'Faith', icon: 'moon-outline' },
    { key: 'business', label: 'Business', icon: 'briefcase-outline' },
    { key: 'tech', label: 'Tech', icon: 'code-slash-outline' },
    { key: 'culture', label: 'Culture', icon: 'globe-outline' },
    { key: 'family', label: 'Family', icon: 'people-outline' },
    { key: 'education', label: 'Education', icon: 'school-outline' },
    { key: 'health', label: 'Health', icon: 'fitness-outline' },
    { key: 'sports', label: 'Sports', icon: 'football-outline' },
    { key: 'arts', label: 'Arts', icon: 'color-palette-outline' },
    { key: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

const COLORS = [
    '#D4A84B', '#E67E22', '#E74C3C', '#E91E63',
    '#9B59B6', '#3498DB', '#1ABC9C', '#2ECC71',
    '#27AE60', '#34495E', '#607D8B', '#795548',
];

const STEPS = 3;
const tap = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

// Shared label component
const Label = ({ text, c, mt }: { text: string; c: C; mt?: boolean }) => (
    <Text style={[s.label, { color: c.text.muted }, mt && { marginTop: spacing.lg }]}>{text}</Text>
);

// Shared input styling helper
const inputStyle = (c: C) => [s.input, { backgroundColor: c.surface.glass, borderColor: c.border.subtle, color: c.text.primary }];

// ── Step Indicator ──────────────────────────
function StepIndicator({ current, c }: { current: number; c: C }) {
    return (
        <View style={s.stepRow}>
            {[1, 2, 3].map((n, i) => (
                <View key={n} style={s.stepItem}>
                    <View style={[s.stepDot, {
                        backgroundColor: n <= current ? c.gold[500] : c.surface.glass,
                        borderColor: n === current ? c.gold[400] : 'transparent',
                    }]}>
                        {n < current
                            ? <Ionicons name="checkmark" size={12} color={c.text.inverse} />
                            : <Text style={{ fontSize: 12, fontWeight: '700', color: n === current ? c.text.inverse : c.text.muted }}>{n}</Text>}
                    </View>
                    {i < 2 && <View style={[s.stepLine, { backgroundColor: n < current ? c.gold[500] : c.border.subtle }]} />}
                </View>
            ))}
        </View>
    );
}

// ── Step 1: Basics ──────────────────────────
function StepBasics({ name, setName, tagline, setTagline, category, setCategory, c }: {
    name: string; setName: (v: string) => void; tagline: string; setTagline: (v: string) => void;
    category: string; setCategory: (v: string) => void; c: C;
}) {
    return (
        <Animated.View entering={FadeInRight.duration(250)} exiting={FadeOutLeft.duration(200)} style={s.step}>
            <Label text="Community Name *" c={c} />
            <TextInput style={inputStyle(c)} value={name} onChangeText={setName}
                placeholder="e.g. Muslim Developers" placeholderTextColor={c.text.muted} maxLength={50} autoFocus />
            <Text style={[s.charCount, { color: c.text.muted }]}>{name.length}/50</Text>

            <Label text="Tagline" c={c} mt />
            <TextInput style={inputStyle(c)} value={tagline} onChangeText={setTagline}
                placeholder="A short description of your community" placeholderTextColor={c.text.muted} maxLength={120} />
            <Text style={[s.charCount, { color: c.text.muted }]}>{tagline.length}/120</Text>

            <Label text="Category" c={c} mt />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catScroll}>
                {CATEGORIES.map((cat) => {
                    const on = category === cat.key;
                    return (
                        <TouchableOpacity key={cat.key} activeOpacity={0.7}
                            style={[s.catChip, { backgroundColor: on ? c.gold[500] : c.surface.glass, borderColor: on ? c.gold[400] : c.border.subtle }]}
                            onPress={() => { tap(); setCategory(cat.key); }}>
                            <Ionicons name={cat.icon} size={16} color={on ? c.text.inverse : c.text.secondary} />
                            <Text style={{ fontSize: 13, fontWeight: '500', color: on ? c.text.inverse : c.text.secondary }}>{cat.label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </Animated.View>
    );
}

// ── Step 2: Appearance ──────────────────────
function StepAppearance({ coverUri, setCoverUri, avatarUri, setAvatarUri, brandColor, setBrandColor, customHex, setCustomHex, name, c }: {
    coverUri: string | null; setCoverUri: (v: string | null) => void;
    avatarUri: string | null; setAvatarUri: (v: string | null) => void;
    brandColor: string; setBrandColor: (v: string) => void;
    customHex: string; setCustomHex: (v: string) => void; name: string; c: C;
}) {
    const pick = async (aspect: [number, number], set: (u: string | null) => void) => {
        const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect, quality: 0.85 });
        if (!r.canceled && r.assets[0]) set(r.assets[0].uri);
    };

    const imgProps = { placeholder: IMAGE_PLACEHOLDER.blurhash, transition: IMAGE_PLACEHOLDER.transition, cachePolicy: 'memory-disk' as const };

    return (
        <Animated.View entering={FadeInRight.duration(250)} exiting={FadeOutLeft.duration(200)} style={s.step}>
            <Label text="Cover Photo" c={c} />
            <TouchableOpacity style={[s.coverPick, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}
                onPress={() => pick([3, 1], setCoverUri)} activeOpacity={0.7}>
                {coverUri
                    ? <Image source={{ uri: coverUri }} style={StyleSheet.absoluteFill} contentFit="cover" {...imgProps} />
                    : <View style={s.pickPH}><Ionicons name="image-outline" size={28} color={c.text.muted} />
                        <Text style={{ fontSize: 11, color: c.text.muted }}>Tap to add cover (3:1)</Text></View>}
            </TouchableOpacity>

            <Label text="Avatar / Logo" c={c} mt />
            <TouchableOpacity style={[s.avatarPick, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}
                onPress={() => pick([1, 1], setAvatarUri)} activeOpacity={0.7}>
                {avatarUri
                    ? <Image source={{ uri: avatarUri }} style={{ width: 80, height: 80, borderRadius: 40 }} contentFit="cover" {...imgProps} />
                    : <View style={s.pickPH}><Ionicons name="person-circle-outline" size={28} color={c.text.muted} />
                        <Text style={{ fontSize: 11, color: c.text.muted }}>Tap to add avatar</Text></View>}
            </TouchableOpacity>

            <Label text="Brand Color" c={c} mt />
            <View style={s.colorGrid}>
                {COLORS.map((hex) => (
                    <TouchableOpacity key={hex} onPress={() => { tap(); setBrandColor(hex); setCustomHex(''); }}
                        style={[s.swatch, { backgroundColor: hex }, brandColor === hex && { borderWidth: 3, borderColor: c.text.primary }]} />
                ))}
            </View>
            <View style={[s.hexRow, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: c.text.muted, marginRight: 2 }}>#</Text>
                <TextInput style={{ flex: 1, fontSize: 15, color: c.text.primary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}
                    value={customHex} placeholder="Custom hex" placeholderTextColor={c.text.muted} maxLength={6} autoCapitalize="characters"
                    onChangeText={(v) => { const cl = v.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6); setCustomHex(cl); if (cl.length === 6) setBrandColor(`#${cl}`); }} />
                {brandColor ? <View style={[s.hexDot, { backgroundColor: brandColor }]} /> : null}
            </View>

            <Label text="Preview" c={c} mt />
            <View style={[s.preview, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}>
                <View style={[s.prevCover, { backgroundColor: brandColor || c.surface.glassHover }]}>
                    {coverUri ? <Image source={{ uri: coverUri }} style={StyleSheet.absoluteFill} contentFit="cover" {...imgProps} /> : null}
                </View>
                <View style={s.prevBody}>
                    <View style={[s.prevAvatar, { backgroundColor: brandColor || c.surface.glassHover }]}>
                        {avatarUri
                            ? <Image source={{ uri: avatarUri }} style={{ width: 32, height: 32, borderRadius: 16 }} contentFit="cover" {...imgProps} />
                            : <Text style={{ fontSize: 14, fontWeight: '700', color: c.text.inverse }}>{name ? name[0].toUpperCase() : '?'}</Text>}
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: c.text.primary, flex: 1 }} numberOfLines={1}>{name || 'Community Name'}</Text>
                </View>
            </View>
        </Animated.View>
    );
}

// ── Step 3: Settings ────────────────────────
function StepSettings({ isPrivate, setIsPrivate, approvalRequired, setApprovalRequired, rules, setRules, c }: {
    isPrivate: boolean; setIsPrivate: (v: boolean) => void;
    approvalRequired: boolean; setApprovalRequired: (v: boolean) => void;
    rules: string[]; setRules: (v: string[]) => void; c: C;
}) {
    const updateRule = (i: number, t: string) => { const n = [...rules]; n[i] = t; setRules(n); };

    const Toggle = ({ icon, label, desc, value, onChange, track }: {
        icon: keyof typeof Ionicons.glyphMap; label: string; desc: string;
        value: boolean; onChange: (v: boolean) => void; track: string;
    }) => (
        <View style={[s.toggleRow, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}>
            <View style={s.toggleLeft}>
                <Ionicons name={icon} size={20} color={c.text.secondary} style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: c.text.primary }}>{label}</Text>
                    <Text style={{ fontSize: 13, color: c.text.muted, marginTop: 2 }}>{desc}</Text>
                </View>
            </View>
            <Switch value={value} onValueChange={onChange}
                trackColor={{ false: c.surface.glassHover, true: track }} thumbColor={c.text.primary} />
        </View>
    );

    return (
        <Animated.View entering={FadeInRight.duration(250)} exiting={FadeOutLeft.duration(200)} style={s.step}>
            <Toggle icon="lock-closed-outline" label="Private Community" desc="Only invited members can see content"
                value={isPrivate} onChange={setIsPrivate} track={c.gold[500]} />
            <View style={{ height: spacing.md }} />
            <Toggle icon="shield-checkmark-outline" label="Approval Required" desc="New members need admin approval to join"
                value={approvalRequired} onChange={setApprovalRequired} track={c.amber[500]} />

            <Label text="Community Rules" c={c} mt />
            <Text style={{ fontSize: 13, color: c.text.muted, marginBottom: spacing.md }}>Set expectations for your members</Text>
            {rules.map((rule, i) => (
                <View key={`r-${i}`} style={[s.ruleRow, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: c.text.muted, marginRight: 8 }}>{i + 1}.</Text>
                    <TextInput style={{ flex: 1, fontSize: 15, color: c.text.primary }} value={rule}
                        onChangeText={(t) => updateRule(i, t)} placeholder={`Rule ${i + 1}`} placeholderTextColor={c.text.muted} maxLength={120} />
                </View>
            ))}
            {rules.length < 10 && (
                <TouchableOpacity style={[s.addRule, { borderColor: c.border.subtle }]}
                    onPress={() => setRules([...rules, ''])} activeOpacity={0.7}>
                    <Ionicons name="add-circle-outline" size={18} color={c.gold[500]} />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: c.gold[500] }}>Add Rule</Text>
                </TouchableOpacity>
            )}
        </Animated.View>
    );
}

// ── Main Screen ─────────────────────────────
export default function CreateCommunityScreen() {
    const router = useRouter();
    const { colors: c } = useTheme();
    const { fetchCommunities } = useCommunitiesStore();
    const [step, setStep] = useState(1);

    // Step 1
    const [name, setName] = useState('');
    const [tagline, setTagline] = useState('');
    const [category, setCategory] = useState('');
    // Step 2
    const [coverUri, setCoverUri] = useState<string | null>(null);
    const [avatarUri, setAvatarUri] = useState<string | null>(null);
    const [brandColor, setBrandColor] = useState(COLORS[0]);
    const [customHex, setCustomHex] = useState('');
    // Step 3
    const [isPrivate, setIsPrivate] = useState(false);
    const [approvalRequired, setApprovalRequired] = useState(false);
    const [rules, setRules] = useState<string[]>(['', '', '']);
    const [isCreating, setIsCreating] = useState(false);

    const canProceed = useCallback(() => {
        if (step === 1) return name.trim().length >= 3;
        return true;
    }, [step, name]);

    const handleBack = () => { tap(); step === 1 ? router.back() : setStep((p) => p - 1); };
    const handleNext = () => { if (!canProceed()) return; tap(); setStep((p) => Math.min(p + 1, STEPS)); };

    const handleCreate = async () => {
        if (name.trim().length < 3) { Alert.alert('Name Required', 'Community name must be at least 3 characters.'); return; }
        setIsCreating(true);
        try {
            let uploadedCover: string | undefined;
            let uploadedAvatar: string | undefined;
            if (coverUri) uploadedCover = (await apiUpload(API.uploadCover, coverUri, 'image/jpeg', 'cover.jpg')).url;
            if (avatarUri) uploadedAvatar = (await apiUpload(API.uploadAvatar, avatarUri, 'image/jpeg', 'avatar.jpg')).url;

            const data = await apiFetch<{ community?: { id: string }; id?: string }>(API.communities, {
                method: 'POST',
                body: JSON.stringify({
                    name: name.trim(), description: tagline.trim(), isPublic: !isPrivate, approvalRequired,
                    category: category || undefined, brandColor: brandColor || undefined,
                    coverUrl: uploadedCover, avatarUrl: uploadedAvatar, rules: rules.filter((r) => r.trim()),
                }),
            });
            const id = data.community?.id || data.id;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            fetchCommunities(true);
            router.replace(`/community/${id}`);
        } catch {
            Alert.alert('Creation Failed', 'We couldn\'t create your community. Please check your connection and try again.');
        } finally { setIsCreating(false); }
    };

    const last = step === STEPS;
    const disabled = !canProceed() || isCreating;

    return (
        <View style={[s.root, { backgroundColor: c.background }]}>
            <ScreenHeader title="New Community" onBack={handleBack}
                rightElement={<Text style={{ fontSize: 13, fontWeight: '600', color: c.text.muted }}>{step}/{STEPS}</Text>} />
            <View style={[s.progressTrack, { backgroundColor: c.border.subtle }]}>
                <Animated.View style={[s.progressFill, { width: `${(step / STEPS) * 100}%`, backgroundColor: c.gold[500] }]} />
            </View>
            <StepIndicator current={step} c={c} />

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={100}>
                <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    {step === 1 && <StepBasics name={name} setName={setName} tagline={tagline} setTagline={setTagline} category={category} setCategory={setCategory} c={c} />}
                    {step === 2 && <StepAppearance coverUri={coverUri} setCoverUri={setCoverUri} avatarUri={avatarUri} setAvatarUri={setAvatarUri}
                        brandColor={brandColor} setBrandColor={setBrandColor} customHex={customHex} setCustomHex={setCustomHex} name={name} c={c} />}
                    {step === 3 && <StepSettings isPrivate={isPrivate} setIsPrivate={setIsPrivate} approvalRequired={approvalRequired}
                        setApprovalRequired={setApprovalRequired} rules={rules} setRules={setRules} c={c} />}
                </ScrollView>
            </KeyboardAvoidingView>

            <View style={[s.footer, { borderTopColor: c.border.subtle, backgroundColor: c.background }]}>
                {step > 1 && (
                    <TouchableOpacity style={[s.backBtn, { borderColor: c.border.subtle }]} onPress={handleBack} activeOpacity={0.7}>
                        <Ionicons name="arrow-back" size={18} color={c.text.secondary} />
                        <Text style={{ fontSize: 15, fontWeight: '600', color: c.text.secondary }}>Back</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity style={[s.nextBtn, { backgroundColor: disabled ? c.surface.glassHover : c.gold[500] }, step === 1 && { flex: 1 }]}
                    onPress={last ? handleCreate : handleNext} disabled={disabled} activeOpacity={0.8}>
                    {isCreating ? <ActivityIndicator size="small" color={c.text.inverse} /> : <>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: disabled ? c.text.muted : c.text.inverse }}>{last ? 'Create Community' : 'Next'}</Text>
                        {!last && <Ionicons name="arrow-forward" size={18} color={disabled ? c.text.muted : c.text.inverse} />}
                    </>}
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ── Styles ──────────────────────────────────
const s = StyleSheet.create({
    root: { flex: 1 },
    progressTrack: { height: 3, width: '100%' },
    progressFill: { height: 3, borderRadius: 2 },
    stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
    stepItem: { flexDirection: 'row', alignItems: 'center' },
    stepDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
    stepLine: { width: 40, height: 2, marginHorizontal: 6 },
    scroll: { paddingHorizontal: spacing.lg, paddingBottom: 40 },
    step: { paddingTop: spacing.sm },
    label: { fontSize: typography.fontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.xs },
    input: { borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, fontSize: typography.fontSize.base, borderWidth: 1 },
    charCount: { fontSize: 11, textAlign: 'right', marginTop: 4 },
    catScroll: { gap: spacing.sm, paddingVertical: spacing.xs },
    catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 20, borderWidth: 1 },
    coverPick: { width: '100%', aspectRatio: 3, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', overflow: 'hidden' },
    avatarPick: { width: 80, height: 80, borderRadius: 40, borderWidth: 1, borderStyle: 'dashed', overflow: 'hidden', alignSelf: 'center' },
    pickPH: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
    colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
    swatch: { width: 36, height: 36, borderRadius: 18 },
    hexRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'ios' ? 10 : 6 },
    hexDot: { width: 24, height: 24, borderRadius: 12, marginLeft: spacing.sm },
    preview: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
    prevCover: { width: '100%', height: 60, overflow: 'hidden' },
    prevBody: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, gap: spacing.sm },
    prevAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    toggleRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: spacing.md, borderWidth: 1 },
    toggleLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    ruleRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'ios' ? 10 : 6, marginBottom: spacing.sm },
    addRule: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed' },
    footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, paddingBottom: spacing.xl, borderTopWidth: 1 },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2, borderRadius: 12, borderWidth: 1 },
    nextBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.sm + 4, borderRadius: 12 },
});
