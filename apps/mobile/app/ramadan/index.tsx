// ============================================
// Ramadan Hub — Flagship seasonal feature
// Iftar/Suhoor countdown, Quran progress,
// Fasting tracker, Charity tracker, Taraweeh,
// Daily verse & dua, Community integration
// ============================================

import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Share,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
    FadeInDown,
    FadeIn,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing, shadows } from '@zerog/ui';
import { ScreenHeader, GlassCard } from '../../components';

// ─── Constants ────────────────────────────────────────────────────
const RAMADAN_START = new Date(2026, 1, 18); // Feb 18, 2026
const RAMADAN_END = new Date(2026, 2, 19);   // Mar 19, 2026 (30 days)
const TOTAL_DAYS = 30;
const QURAN_STORAGE_KEY = '@ramadan-quran-progress';
const PRAYER_CACHE_KEY = '@ramadan-prayer-cache';
const FASTING_KEY = '@ramadan-fasting';
const CHARITY_KEY = '@ramadan-charity';
const TARAWEEH_KEY = '@ramadan-taraweeh';

// ─── 30 Daily Duas for Ramadan ───────────────────────────────────
const DAILY_DUAS: ReadonlyArray<{ arabic: string; english: string }> = [
    { arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْهُدَى وَالتُّقَى وَالْعَفَافَ وَالْغِنَى', english: 'O Allah, I ask You for guidance, piety, chastity, and self-sufficiency.' },
    { arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ', english: 'Our Lord, give us good in this world and good in the Hereafter, and save us from the Fire.' },
    { arabic: 'اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي', english: 'O Allah, You are the Pardoner and You love to pardon, so pardon me.' },
    { arabic: 'رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي', english: 'My Lord, expand for me my chest and ease for me my task.' },
    { arabic: 'اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ', english: 'O Allah, help me to remember You, thank You, and worship You well.' },
    { arabic: 'رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا', english: 'Our Lord, let not our hearts deviate after You have guided us.' },
    { arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ', english: 'O Allah, I seek refuge in You from worry and grief.' },
    { arabic: 'رَبِّ زِدْنِي عِلْمًا', english: 'My Lord, increase me in knowledge.' },
    { arabic: 'اللَّهُمَّ اغْفِرْ لِي وَارْحَمْنِي وَاهْدِنِي وَارْزُقْنِي', english: 'O Allah, forgive me, have mercy on me, guide me, and provide for me.' },
    { arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ', english: 'O Allah, I ask You for well-being in this world and the Hereafter.' },
    { arabic: 'رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنتَ السَّمِيعُ الْعَلِيمُ', english: 'Our Lord, accept from us. Indeed You are the Hearing, the Knowing.' },
    { arabic: 'اللَّهُمَّ بَارِكْ لَنَا فِي رَمَضَانَ', english: 'O Allah, bless us in Ramadan.' },
    { arabic: 'اللَّهُمَّ أَجِرْنِي مِنَ النَّارِ', english: 'O Allah, save me from the Fire.' },
    { arabic: 'اللَّهُمَّ تَقَبَّلْ صِيَامَنَا وَقِيَامَنَا', english: 'O Allah, accept our fasting and our prayers.' },
    { arabic: 'رَبِّ اجْعَلْنِي مُقِيمَ الصَّلَاةِ وَمِن ذُرِّيَّتِي', english: 'My Lord, make me an establisher of prayer, and from my descendants.' },
    { arabic: 'اللَّهُمَّ اجْعَلْ الْقُرْآنَ رَبِيعَ قَلْبِي', english: 'O Allah, make the Quran the spring of my heart.' },
    { arabic: 'اللَّهُمَّ ارْزُقْنِي حُسْنَ الْخَاتِمَةِ', english: 'O Allah, grant me a good ending.' },
    { arabic: 'اللَّهُمَّ اهْدِنِي فِيمَنْ هَدَيْتَ', english: 'O Allah, guide me among those You have guided.' },
    { arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْجَنَّةَ وَمَا قَرَّبَ إِلَيْهَا', english: 'O Allah, I ask You for Paradise and whatever brings me closer to it.' },
    { arabic: 'اللَّهُمَّ بَلِّغْنَا لَيْلَةَ الْقَدْرِ', english: 'O Allah, let us reach the Night of Decree.' },
    { arabic: 'رَبَّنَا اغْفِرْ لَنَا ذُنُوبَنَا وَإِسْرَافَنَا فِي أَمْرِنَا', english: 'Our Lord, forgive us our sins and our excesses in our affairs.' },
    { arabic: 'اللَّهُمَّ اجْعَلْنَا مِنْ عُتَقَائِكَ مِنَ النَّارِ', english: 'O Allah, make us among those You free from the Fire.' },
    { arabic: 'اللَّهُمَّ ثَبِّتْنِي عَلَى دِينِكَ', english: 'O Allah, keep me steadfast on Your religion.' },
    { arabic: 'اللَّهُمَّ اغْفِرْ لِي مَا قَدَّمْتُ وَمَا أَخَّرْتُ', english: 'O Allah, forgive me what I have done and what I have yet to do.' },
    { arabic: 'رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ', english: 'Our Lord, grant us from our spouses and offspring comfort to our eyes.' },
    { arabic: 'اللَّهُمَّ أَحْسِنْ عَاقِبَتَنَا فِي الْأُمُورِ كُلِّهَا', english: 'O Allah, make our end good in all matters.' },
    { arabic: 'اللَّهُمَّ اجْعَلْنِي شَاكِرًا لَكَ ذَاكِرًا لَكَ', english: 'O Allah, make me grateful to You and remembering of You.' },
    { arabic: 'اللَّهُمَّ لَا تَحْرِمْنِي خَيْرَ مَا عِنْدَكَ بِشَرِّ مَا عِنْدِي', english: 'O Allah, do not deprive me of the good You have because of the bad I have.' },
    { arabic: 'اللَّهُمَّ أَعْتِقْ رَقَبَتِي مِنَ النَّارِ', english: 'O Allah, free my neck from the Fire.' },
    { arabic: 'اللَّهُمَّ تَقَبَّلْ مِنَّا رَمَضَانَ وَبَلِّغْنَا رَمَضَانَ الْقَادِمَ', english: 'O Allah, accept our Ramadan and let us reach the next Ramadan.' },
];

// ─── Curated Ramadan Verses ──────────────────────────────────────
const RAMADAN_VERSES: ReadonlyArray<{ arabic: string; english: string; ref: string }> = [
    { arabic: 'شَهْرُ رَمَضَانَ الَّذِي أُنزِلَ فِيهِ الْقُرْآنُ هُدًى لِّلنَّاسِ', english: 'The month of Ramadan in which the Quran was revealed, a guidance for mankind.', ref: '2:185' },
    { arabic: 'يَا أَيُّهَا الَّذِينَ آمَنُوا كُتِبَ عَلَيْكُمُ الصِّيَامُ كَمَا كُتِبَ عَلَى الَّذِينَ مِن قَبْلِكُمْ لَعَلَّكُمْ تَتَّقُونَ', english: 'O you who believe, fasting is prescribed for you as it was prescribed for those before you, that you may become righteous.', ref: '2:183' },
    { arabic: 'وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ أُجِيبُ دَعْوَةَ الدَّاعِ إِذَا دَعَانِ', english: 'And when My servants ask you about Me, indeed I am near. I respond to the call of the caller when he calls upon Me.', ref: '2:186' },
    { arabic: 'إِنَّا أَنزَلْنَاهُ فِي لَيْلَةِ الْقَدْرِ', english: 'Indeed, We sent it down during the Night of Decree.', ref: '97:1' },
    { arabic: 'لَيْلَةُ الْقَدْرِ خَيْرٌ مِّنْ أَلْفِ شَهْرٍ', english: 'The Night of Decree is better than a thousand months.', ref: '97:3' },
    { arabic: 'وَلَا تَأْكُلُوا أَمْوَالَكُم بَيْنَكُم بِالْبَاطِلِ', english: 'And do not consume one another\'s wealth unjustly.', ref: '2:188' },
    { arabic: 'فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي وَلَا تَكْفُرُونِ', english: 'So remember Me; I will remember you. And be grateful to Me and do not deny Me.', ref: '2:152' },
    { arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ', english: 'Our Lord, give us in this world good and in the Hereafter good and protect us from the punishment of the Fire.', ref: '2:201' },
    { arabic: 'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ', english: 'Indeed, Allah is with the patient.', ref: '2:153' },
    { arabic: 'وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ', english: 'And whoever relies upon Allah — then He is sufficient for him.', ref: '65:3' },
    { arabic: 'ادْعُونِي أَسْتَجِبْ لَكُمْ', english: 'Call upon Me; I will respond to you.', ref: '40:60' },
    { arabic: 'وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰ', english: 'And your Lord is going to give you, and you will be satisfied.', ref: '93:5' },
    { arabic: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا', english: 'For indeed, with hardship comes ease.', ref: '94:5' },
    { arabic: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا', english: 'Indeed, with hardship comes ease.', ref: '94:6' },
    { arabic: 'وَنَحْنُ أَقْرَبُ إِلَيْهِ مِنْ حَبْلِ الْوَرِيدِ', english: 'And We are closer to him than his jugular vein.', ref: '50:16' },
    { arabic: 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ', english: 'Verily, in the remembrance of Allah do hearts find rest.', ref: '13:28' },
    { arabic: 'وَاصْبِرْ فَإِنَّ اللَّهَ لَا يُضِيعُ أَجْرَ الْمُحْسِنِينَ', english: 'And be patient, for indeed Allah does not allow the reward of the doers of good to be lost.', ref: '11:115' },
    { arabic: 'إِنَّ اللَّهَ لَا يُغَيِّرُ مَا بِقَوْمٍ حَتَّىٰ يُغَيِّرُوا مَا بِأَنفُسِهِمْ', english: 'Indeed, Allah will not change the condition of a people until they change what is in themselves.', ref: '13:11' },
    { arabic: 'وَاللَّهُ يُحِبُّ الْمُحْسِنِينَ', english: 'And Allah loves the doers of good.', ref: '3:134' },
    { arabic: 'قُلْ يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَىٰ أَنفُسِهِمْ لَا تَقْنَطُوا مِن رَّحْمَةِ اللَّهِ', english: 'Say, O My servants who have transgressed against themselves, do not despair of the mercy of Allah.', ref: '39:53' },
    { arabic: 'وَرَحْمَتِي وَسِعَتْ كُلَّ شَيْءٍ', english: 'And My mercy encompasses all things.', ref: '7:156' },
    { arabic: 'رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي', english: 'My Lord, expand for me my breast and ease for me my task.', ref: '20:25-26' },
    { arabic: 'وَقُل رَّبِّ زِدْنِي عِلْمًا', english: 'And say, My Lord, increase me in knowledge.', ref: '20:114' },
    { arabic: 'رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنتَ السَّمِيعُ الْعَلِيمُ', english: 'Our Lord, accept from us. Indeed You are the Hearing, the Knowing.', ref: '2:127' },
    { arabic: 'وَتُوبُوا إِلَى اللَّهِ جَمِيعًا أَيُّهَ الْمُؤْمِنُونَ لَعَلَّكُمْ تُفْلِحُونَ', english: 'And turn to Allah in repentance, all of you, O believers, that you might succeed.', ref: '24:31' },
    { arabic: 'يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ', english: 'O you who believe, seek help through patience and prayer.', ref: '2:153' },
    { arabic: 'وَلَا تَهِنُوا وَلَا تَحْزَنُوا وَأَنتُمُ الْأَعْلَوْنَ إِن كُنتُم مُّؤْمِنِينَ', english: 'So do not weaken and do not grieve, for you will be superior if you are believers.', ref: '3:139' },
    { arabic: 'وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا', english: 'And whoever fears Allah — He will make a way out for him.', ref: '65:2' },
    { arabic: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ', english: 'Sufficient for us is Allah, and He is the best Disposer of affairs.', ref: '3:173' },
    { arabic: 'رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِن لَّدُنكَ رَحْمَةً', english: 'Our Lord, let not our hearts deviate after You have guided us and grant us from Yourself mercy.', ref: '3:8' },
];

// ─── Daily Quran Reading Plan (1 juz per day) ────────────────────
const QURAN_READING_PLAN: ReadonlyArray<{ juz: number; surah: string; pages: string }> = [
    { juz: 1, surah: 'Al-Fatiha 1 — Al-Baqarah 141', pages: '1-21' },
    { juz: 2, surah: 'Al-Baqarah 142 — Al-Baqarah 252', pages: '22-41' },
    { juz: 3, surah: 'Al-Baqarah 253 — Ali Imran 92', pages: '42-61' },
    { juz: 4, surah: 'Ali Imran 93 — An-Nisa 23', pages: '62-81' },
    { juz: 5, surah: 'An-Nisa 24 — An-Nisa 147', pages: '82-101' },
    { juz: 6, surah: 'An-Nisa 148 — Al-Ma\'idah 81', pages: '102-121' },
    { juz: 7, surah: 'Al-Ma\'idah 82 — Al-An\'am 110', pages: '122-141' },
    { juz: 8, surah: 'Al-An\'am 111 — Al-A\'raf 87', pages: '142-161' },
    { juz: 9, surah: 'Al-A\'raf 88 — Al-Anfal 40', pages: '162-181' },
    { juz: 10, surah: 'Al-Anfal 41 — At-Tawbah 92', pages: '182-201' },
    { juz: 11, surah: 'At-Tawbah 93 — Hud 5', pages: '202-221' },
    { juz: 12, surah: 'Hud 6 — Yusuf 52', pages: '222-241' },
    { juz: 13, surah: 'Yusuf 53 — Ibrahim 52', pages: '242-261' },
    { juz: 14, surah: 'Al-Hijr 1 — An-Nahl 128', pages: '262-281' },
    { juz: 15, surah: 'Al-Isra 1 — Al-Kahf 74', pages: '282-301' },
    { juz: 16, surah: 'Al-Kahf 75 — Ta-Ha 135', pages: '302-321' },
    { juz: 17, surah: 'Al-Anbiya 1 — Al-Hajj 78', pages: '322-341' },
    { juz: 18, surah: 'Al-Mu\'minun 1 — Al-Furqan 20', pages: '342-361' },
    { juz: 19, surah: 'Al-Furqan 21 — An-Naml 55', pages: '362-381' },
    { juz: 20, surah: 'An-Naml 56 — Al-Ankabut 45', pages: '382-401' },
    { juz: 21, surah: 'Al-Ankabut 46 — Al-Ahzab 30', pages: '402-421' },
    { juz: 22, surah: 'Al-Ahzab 31 — Ya-Sin 27', pages: '422-441' },
    { juz: 23, surah: 'Ya-Sin 28 — Az-Zumar 31', pages: '442-461' },
    { juz: 24, surah: 'Az-Zumar 32 — Fussilat 46', pages: '462-481' },
    { juz: 25, surah: 'Fussilat 47 — Al-Jathiyah 37', pages: '482-501' },
    { juz: 26, surah: 'Al-Ahqaf 1 — Adh-Dhariyat 30', pages: '502-521' },
    { juz: 27, surah: 'Adh-Dhariyat 31 — Al-Hadid 29', pages: '522-541' },
    { juz: 28, surah: 'Al-Mujadila 1 — At-Tahrim 12', pages: '542-561' },
    { juz: 29, surah: 'Al-Mulk 1 — Al-Mursalat 50', pages: '562-581' },
    { juz: 30, surah: 'An-Naba 1 — An-Nas 6', pages: '582-604' },
];

// ─── Types ────────────────────────────────────────────────────────
interface PrayerTimesData {
    fajr: string;
    maghrib: string;
    date: string;
}

interface CountdownState {
    hours: number;
    minutes: number;
    seconds: number;
}

// ─── Helpers ──────────────────────────────────────────────────────
function getRamadanDay(): number {
    const now = new Date();
    const diff = now.getTime() - RAMADAN_START.getTime();
    const day = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, Math.min(day, TOTAL_DAYS));
}

function isDuringRamadan(): boolean {
    const now = new Date();
    return now >= RAMADAN_START && now <= RAMADAN_END;
}

function getDailyVerseIndex(): number {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    return dayOfYear % RAMADAN_VERSES.length;
}

function formatTime12h(time: string | null | undefined): string {
    if (!time) return '--:--';
    const parts = time.split(':').map(Number);
    const h = parts[0] ?? 0;
    const m = parts[1] ?? 0;
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
}

function padZero(n: number): string {
    return n.toString().padStart(2, '0');
}

function getTimeUntil(targetTime: string | null): CountdownState & { isPast: boolean } {
    if (!targetTime) return { hours: 0, minutes: 0, seconds: 0, isPast: false };
    const now = new Date();
    const parts = targetTime.split(':').map(Number);
    const h = parts[0] ?? 0;
    const m = parts[1] ?? 0;
    const targetSec = h * 3600 + m * 60;
    const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const diff = targetSec - nowSec;

    if (diff <= 0) {
        return { hours: 0, minutes: 0, seconds: 0, isPast: true };
    }
    return {
        hours: Math.floor(diff / 3600),
        minutes: Math.floor((diff % 3600) / 60),
        seconds: diff % 60,
        isPast: false,
    };
}

function getRamadanThird(day: number): 'first' | 'second' | 'last' {
    if (day <= 10) return 'first';
    if (day <= 20) return 'second';
    return 'last';
}

function getThirdLabel(third: 'first' | 'second' | 'last'): string {
    switch (third) {
        case 'first': return 'Mercy (Days 1-10)';
        case 'second': return 'Forgiveness (Days 11-20)';
        case 'last': return 'Salvation (Days 21-30)';
    }
}

// ─── Memoized Sub-Components ──────────────────────────────────────

/** Countdown digit display — memoized to prevent re-render cascades */
const CountdownDigit = memo(function CountdownDigit({
    value,
    label,
    isSeconds,
}: {
    value: number;
    label: string;
    isSeconds?: boolean;
}) {
    return (
        <View style={s.countdownUnit}>
            <Text style={[s.countdownNumber, isSeconds && s.countdownSeconds]}>
                {padZero(value)}
            </Text>
            <Text style={s.countdownUnitLabel}>{label}</Text>
        </View>
    );
});

/** Calendar day cell — memoized (30 of these render) */
const CalendarDayCell = memo(function CalendarDayCell({
    day,
    fasted,
    isToday,
    isFuture,
}: {
    day: number;
    fasted: boolean;
    isToday: boolean;
    isFuture: boolean;
}) {
    return (
        <View
            style={[
                s.calendarDay,
                isToday && s.calendarDayToday,
                fasted && s.calendarDayFasted,
                isFuture && s.calendarDayFuture,
            ]}
        >
            {fasted ? (
                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
            ) : (
                <Text
                    style={[
                        s.calendarDayText,
                        isToday && s.calendarDayTextToday,
                        isFuture && s.calendarDayTextFuture,
                    ]}
                >
                    {day}
                </Text>
            )}
        </View>
    );
});

/** Tracker row — reused for charity and taraweeh */
const TrackerRow = memo(function TrackerRow({
    icon,
    title,
    count,
    total,
    isActive,
    onToggle,
    activeLabel,
    inactiveLabel,
    accentColor,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    count: number;
    total: number;
    isActive: boolean;
    onToggle: () => void;
    activeLabel: string;
    inactiveLabel: string;
    accentColor: string;
}) {
    return (
        <View style={s.trackerSection}>
            <View style={s.trackerHeader}>
                <View style={s.trackerTitleRow}>
                    <Ionicons name={icon} size={18} color={accentColor} />
                    <Text style={s.trackerTitle}>{title}</Text>
                </View>
                <Text style={[s.trackerCount, { color: accentColor }]}>
                    {count}<Text style={s.trackerCountMuted}>/{total}</Text>
                </Text>
            </View>

            <TouchableOpacity
                style={[
                    s.trackerToggle,
                    isActive && { borderColor: accentColor + '30', backgroundColor: accentColor + '08' },
                ]}
                onPress={onToggle}
                activeOpacity={0.7}
                accessibilityRole="switch"
                accessibilityLabel={`${title}, ${isActive ? 'done' : 'not done'}`}
            >
                <Ionicons
                    name={isActive ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={isActive ? accentColor : colors.text.muted}
                />
                <Text style={[s.trackerToggleText, isActive && { color: accentColor }]}>
                    {isActive ? activeLabel : inactiveLabel}
                </Text>
            </TouchableOpacity>

            {/* Mini progress bar */}
            <View style={s.trackerProgressOuter}>
                <View
                    style={[
                        s.trackerProgressInner,
                        {
                            width: `${Math.max((count / total) * 100, 1)}%` as `${number}%`,
                            backgroundColor: accentColor,
                        },
                    ]}
                />
            </View>
        </View>
    );
});

/** Community action card */
const CommunityCard = memo(function CommunityCard({
    icon,
    title,
    subtitle,
    onPress,
    gradientColors,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle: string;
    onPress: () => void;
    gradientColors: [string, string];
}) {
    return (
        <TouchableOpacity
            style={s.communityCard}
            onPress={onPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={title}
        >
            <LinearGradient
                colors={gradientColors}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
            <View style={s.communityCardIcon}>
                <Ionicons name={icon} size={22} color={colors.gold[400]} />
            </View>
            <Text style={s.communityCardTitle}>{title}</Text>
            <Text style={s.communityCardSub}>{subtitle}</Text>
        </TouchableOpacity>
    );
});


// ─── Main Screen ──────────────────────────────────────────────────
export default function RamadanHub() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // ─── State ────────────────────────────────────────────────────
    const [prayerTimes, setPrayerTimes] = useState<PrayerTimesData | null>(null);
    const [iftarCountdown, setIftarCountdown] = useState<CountdownState>({ hours: 0, minutes: 0, seconds: 0 });
    const [suhoorCountdown, setSuhoorCountdown] = useState<CountdownState>({ hours: 0, minutes: 0, seconds: 0 });
    const [isPastMaghrib, setIsPastMaghrib] = useState(false);
    const [isPastFajr, setIsPastFajr] = useState(false);
    const [juzCount, setJuzCount] = useState(0);
    const [isLoadingPrayer, setIsLoadingPrayer] = useState(true);
    const [prayerError, setPrayerError] = useState<string | null>(null);
    const [fastingDays, setFastingDays] = useState<Set<number>>(new Set());
    const [charityDays, setCharityDays] = useState<Set<number>>(new Set());
    const [taraweehDays, setTaraweehDays] = useState<Set<number>>(new Set());

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ─── Derived values (memoized) ────────────────────────────────
    const isRamadan = useMemo(() => isDuringRamadan(), []);
    const ramadanDay = useMemo(() => getRamadanDay(), []);
    const daysLeft = useMemo(() => Math.max(0, TOTAL_DAYS - ramadanDay), [ramadanDay]);
    const verseIndex = useMemo(() => getDailyVerseIndex(), []);
    const dailyVerse = RAMADAN_VERSES[verseIndex] ?? RAMADAN_VERSES[0]!;
    const dailyDua = DAILY_DUAS[(ramadanDay - 1) % DAILY_DUAS.length] ?? DAILY_DUAS[0]!;
    const ramadanThird = useMemo(() => getRamadanThird(ramadanDay), [ramadanDay]);
    const thirdLabel = useMemo(() => getThirdLabel(ramadanThird), [ramadanThird]);
    const todaysReading = QURAN_READING_PLAN[(ramadanDay - 1) % QURAN_READING_PLAN.length] ?? QURAN_READING_PLAN[0]!;
    const progressPercent = useMemo(() => (juzCount / 30) * 100, [juzCount]);
    const juzRemaining = 30 - juzCount;
    const isFastingToday = fastingDays.has(ramadanDay);
    const fastingCount = fastingDays.size;
    const isCharityToday = charityDays.has(ramadanDay);
    const charityCount = charityDays.size;
    const isTaraweehToday = taraweehDays.has(ramadanDay);
    const taraweehCount = taraweehDays.size;
    const ramadanProgress = useMemo(() => (ramadanDay / TOTAL_DAYS) * 100, [ramadanDay]);

    // ─── Load persisted data ──────────────────────────────────────
    useEffect(() => {
        const loadAll = async () => {
            try {
                const [quranStored, fastingStored, charityStored, taraweehStored] = await Promise.all([
                    AsyncStorage.getItem(QURAN_STORAGE_KEY).catch(() => null),
                    AsyncStorage.getItem(FASTING_KEY).catch(() => null),
                    AsyncStorage.getItem(CHARITY_KEY).catch(() => null),
                    AsyncStorage.getItem(TARAWEEH_KEY).catch(() => null),
                ]);

                if (quranStored) {
                    const parsed = parseInt(quranStored, 10);
                    if (!isNaN(parsed)) setJuzCount(parsed);
                }
                if (fastingStored) {
                    try { setFastingDays(new Set(JSON.parse(fastingStored))); } catch { /* corrupted data */ }
                }
                if (charityStored) {
                    try { setCharityDays(new Set(JSON.parse(charityStored))); } catch { /* corrupted data */ }
                }
                if (taraweehStored) {
                    try { setTaraweehDays(new Set(JSON.parse(taraweehStored))); } catch { /* corrupted data */ }
                }
            } catch {
                // AsyncStorage bulk read failure — use defaults
            }
        };
        loadAll();
    }, []);

    // ─── Save Quran progress ──────────────────────────────────────
    const updateJuzCount = useCallback(async (delta: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setJuzCount((prev) => {
            const next = Math.max(0, Math.min(30, prev + delta));
            AsyncStorage.setItem(QURAN_STORAGE_KEY, next.toString()).catch(() => {});
            return next;
        });
    }, []);

    // ─── Toggle helpers ───────────────────────────────────────────
    const toggleSetDay = useCallback(
        (
            setter: React.Dispatch<React.SetStateAction<Set<number>>>,
            storageKey: string,
            day: number,
        ) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setter((prev) => {
                const next = new Set(prev);
                if (next.has(day)) {
                    next.delete(day);
                } else {
                    next.add(day);
                }
                AsyncStorage.setItem(storageKey, JSON.stringify([...next])).catch(() => {});
                return next;
            });
        },
        [],
    );

    const toggleFasting = useCallback(
        () => toggleSetDay(setFastingDays, FASTING_KEY, ramadanDay),
        [ramadanDay, toggleSetDay],
    );
    const toggleCharity = useCallback(
        () => toggleSetDay(setCharityDays, CHARITY_KEY, ramadanDay),
        [ramadanDay, toggleSetDay],
    );
    const toggleTaraweeh = useCallback(
        () => toggleSetDay(setTaraweehDays, TARAWEEH_KEY, ramadanDay),
        [ramadanDay, toggleSetDay],
    );

    // ─── Share dua ────────────────────────────────────────────────
    const shareDua = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            await Share.share({
                message: `${dailyDua.arabic}\n\n"${dailyDua.english}"\n\nDay ${ramadanDay} of Ramadan — Shared from 0G`,
            });
        } catch { /* user cancelled */ }
    }, [dailyDua, ramadanDay]);

    // ─── Share verse ──────────────────────────────────────────────
    const shareVerse = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            await Share.share({
                message: `${dailyVerse.arabic}\n\n"${dailyVerse.english}"\n— Quran ${dailyVerse.ref}\n\nShared from 0G`,
            });
        } catch { /* user cancelled share sheet */ }
    }, [dailyVerse]);

    // ─── Fetch prayer times from Aladhan ──────────────────────────
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                // Check cache first
                const cached = await AsyncStorage.getItem(PRAYER_CACHE_KEY).catch(() => null);
                if (cached) {
                    let parsed: PrayerTimesData | null = null;
                    try { parsed = JSON.parse(cached) as PrayerTimesData; } catch { /* corrupted cache */ }
                    if (parsed?.maghrib && parsed?.fajr && parsed.date === new Date().toDateString()) {
                        if (!cancelled) {
                            setPrayerTimes(parsed);
                            setIsLoadingPrayer(false);
                        }
                        return;
                    }
                }

                const res = await fetch(
                    'https://api.aladhan.com/v1/timingsByCity?city=NewYork&country=US&method=2'
                );
                const json = await res.json();
                if (!cancelled && json.code === 200 && json.data?.timings) {
                    const timings = json.data.timings;
                    const stripTz = (t: string) => t?.replace(/\s*\(.*\)/, '') ?? '';
                    const data: PrayerTimesData = {
                        fajr: stripTz(timings.Fajr),
                        maghrib: stripTz(timings.Maghrib),
                        date: new Date().toDateString(),
                    };
                    setPrayerTimes(data);
                    await AsyncStorage.setItem(PRAYER_CACHE_KEY, JSON.stringify(data)).catch(() => {});
                } else if (!cancelled && !json.data?.timings) {
                    setPrayerError('Could not load prayer times');
                }
            } catch (err) {
                if (!cancelled) {
                    console.error('Failed to fetch prayer times:', err);
                    setPrayerError('Offline — using cached data if available');
                }
            } finally {
                if (!cancelled) setIsLoadingPrayer(false);
            }
        })();

        return () => { cancelled = true; };
    }, []);

    // ─── Live countdown — single interval for both iftar & suhoor ─
    useEffect(() => {
        if (!prayerTimes) return;

        const updateCountdowns = () => {
            const iftarResult = getTimeUntil(prayerTimes.maghrib);
            setIftarCountdown({ hours: iftarResult.hours, minutes: iftarResult.minutes, seconds: iftarResult.seconds });
            setIsPastMaghrib(iftarResult.isPast);

            const suhoorResult = getTimeUntil(prayerTimes.fajr);
            setSuhoorCountdown({ hours: suhoorResult.hours, minutes: suhoorResult.minutes, seconds: suhoorResult.seconds });
            setIsPastFajr(suhoorResult.isPast);
        };

        updateCountdowns();
        intervalRef.current = setInterval(updateCountdowns, 1000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [prayerTimes]);

    const navigate = useCallback((route: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(route as any);
    }, [router]);

    // ─── Calendar grid — memoized to avoid re-creating 30 elements each second
    const calendarGrid = useMemo(() => (
        <View style={s.calendarGrid}>
            {Array.from({ length: TOTAL_DAYS }, (_, i) => {
                const day = i + 1;
                return (
                    <CalendarDayCell
                        key={day}
                        day={day}
                        fasted={fastingDays.has(day)}
                        isToday={day === ramadanDay}
                        isFuture={day > ramadanDay}
                    />
                );
            })}
        </View>
    ), [fastingDays, ramadanDay]);

    return (
        <View style={s.container}>
            {/* Deep gradient background */}
            <LinearGradient
                colors={[colors.obsidian[900], '#0D0B15', colors.obsidian[900]]}
                style={StyleSheet.absoluteFill}
            />

            {/* Warm ambient gold glow at top */}
            <LinearGradient
                colors={[colors.gold[700] + '12', colors.gold[500] + '06', 'transparent']}
                style={s.ambientGlow}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
            />

            {/* Subtle secondary glow bottom-right for depth */}
            <LinearGradient
                colors={['transparent', colors.gold[700] + '04']}
                style={s.ambientGlowBottom}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <ScreenHeader title="Ramadan" showBack />

            <ScrollView
                style={s.scrollView}
                contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                showsVerticalScrollIndicator={false}
            >
                {/* ════════════════════════════════════════════════════
                    1. HERO HEADER — Crescent + Bismillah + Day Counter
                   ════════════════════════════════════════════════════ */}
                <Animated.View entering={FadeInDown.duration(700)} style={s.heroSection}>
                    {/* Crescent moon with glow ring */}
                    <View style={s.crescentContainer}>
                        <LinearGradient
                            colors={[colors.gold[500] + '25', colors.gold[700] + '0A']}
                            style={s.crescentGlow}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        />
                        <View style={s.crescentRing} />
                        <Text style={s.crescentIcon}>☪️</Text>
                    </View>

                    <Text style={s.heroTitle}>Ramadan Mubarak</Text>

                    {/* Decorative bismillah */}
                    <Text style={s.bismillah}>بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</Text>

                    {/* Day badge + third indicator */}
                    <View style={s.dayBadge}>
                        <Ionicons name="calendar-outline" size={14} color={colors.gold[400]} />
                        <Text style={s.dayBadgeText}>
                            {isRamadan ? `Day ${ramadanDay} of ${TOTAL_DAYS}` : 'Ramadan 2026'}
                        </Text>
                    </View>

                    {isRamadan && (
                        <Text style={s.thirdLabel}>{thirdLabel}</Text>
                    )}

                    {/* Ramadan overall progress bar */}
                    {isRamadan && (
                        <View style={s.ramadanProgressContainer}>
                            <View style={s.ramadanProgressOuter}>
                                <LinearGradient
                                    colors={[colors.gold[600], colors.gold[400]]}
                                    style={[s.ramadanProgressInner, { width: `${ramadanProgress}%` as `${number}%` }]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                />
                            </View>
                            <Text style={s.ramadanProgressText}>
                                {daysLeft > 0 ? `${daysLeft} days remaining` : 'Last day of Ramadan'}
                            </Text>
                        </View>
                    )}
                </Animated.View>

                {/* ════════════════════════════════════════════════════
                    2. IFTAR & SUHOOR COUNTDOWNS
                   ════════════════════════════════════════════════════ */}
                <Animated.View entering={FadeInDown.duration(500).delay(100)}>
                    <View style={s.countdownCard}>
                        <LinearGradient
                            colors={[colors.gold[700] + '18', colors.gold[500] + '06', 'transparent']}
                            style={StyleSheet.absoluteFill}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        />

                        {isLoadingPrayer ? (
                            <View style={s.countdownLoadingContainer}>
                                <ActivityIndicator size="small" color={colors.gold[400]} />
                                <Text style={s.countdownLoading}>Loading prayer times...</Text>
                            </View>
                        ) : prayerError && !prayerTimes ? (
                            <View style={s.errorContainer}>
                                <Ionicons name="cloud-offline-outline" size={28} color={colors.text.muted} />
                                <Text style={s.errorText}>{prayerError}</Text>
                                <Text style={s.errorHint}>Prayer times will load when online</Text>
                            </View>
                        ) : (
                            <>
                                {/* Iftar Countdown */}
                                <View style={s.countdownHeader}>
                                    <Ionicons name="moon-outline" size={18} color={colors.gold[400]} />
                                    <Text style={s.countdownLabel}>
                                        {isPastMaghrib ? 'Iftar Time' : 'Time Until Iftar'}
                                    </Text>
                                </View>

                                {isPastMaghrib ? (
                                    <View style={s.iftarReached}>
                                        <Text style={s.iftarReachedEmoji}>🌙</Text>
                                        <Text style={s.iftarReachedText}>Alhamdulillah!</Text>
                                        <Text style={s.iftarReachedSub}>
                                            May your fast be accepted
                                        </Text>
                                    </View>
                                ) : (
                                    <View style={s.countdownTimerRow}>
                                        <CountdownDigit value={iftarCountdown.hours} label="hours" />
                                        <Text style={s.countdownSeparator}>:</Text>
                                        <CountdownDigit value={iftarCountdown.minutes} label="min" />
                                        <Text style={s.countdownSeparator}>:</Text>
                                        <CountdownDigit value={iftarCountdown.seconds} label="sec" isSeconds />
                                    </View>
                                )}

                                {prayerTimes?.maghrib && (
                                    <Text style={s.prayerTimeText}>
                                        Maghrib at {formatTime12h(prayerTimes.maghrib)}
                                    </Text>
                                )}

                                {/* Divider between countdowns */}
                                <View style={s.countdownDivider}>
                                    <View style={s.countdownDividerLine} />
                                    <Ionicons name="star" size={8} color={colors.gold[500] + '40'} />
                                    <View style={s.countdownDividerLine} />
                                </View>

                                {/* Suhoor Countdown */}
                                <View style={s.countdownHeader}>
                                    <Ionicons name="sunny-outline" size={18} color={colors.amber[400]} />
                                    <Text style={s.countdownLabel}>
                                        {isPastFajr ? 'Suhoor Has Passed' : 'Time Until Suhoor Ends'}
                                    </Text>
                                </View>

                                {isPastFajr ? (
                                    <Text style={s.suhoorPastText}>
                                        Fajr has entered — may your fast be blessed
                                    </Text>
                                ) : (
                                    <View style={[s.countdownTimerRow, s.suhoorTimerRow]}>
                                        <CountdownDigit value={suhoorCountdown.hours} label="hours" />
                                        <Text style={s.countdownSeparator}>:</Text>
                                        <CountdownDigit value={suhoorCountdown.minutes} label="min" />
                                        <Text style={s.countdownSeparator}>:</Text>
                                        <CountdownDigit value={suhoorCountdown.seconds} label="sec" isSeconds />
                                    </View>
                                )}

                                {prayerTimes?.fajr && (
                                    <Text style={s.prayerTimeText}>
                                        Fajr at {formatTime12h(prayerTimes.fajr)}
                                    </Text>
                                )}
                            </>
                        )}

                        {/* Gold accent line */}
                        <LinearGradient
                            colors={[colors.gold[600], colors.gold[400], colors.gold[600]]}
                            style={s.countdownAccent}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        />
                    </View>
                </Animated.View>

                {/* ════════════════════════════════════════════════════
                    3. FASTING TRACKER
                   ════════════════════════════════════════════════════ */}
                <Animated.View entering={FadeInDown.duration(500).delay(150)}>
                    <GlassCard style={s.fastingCard}>
                        <View style={s.fastingHeader}>
                            <View style={s.fastingTitleRow}>
                                <Ionicons name="restaurant-outline" size={18} color={colors.gold[400]} />
                                <Text style={s.fastingTitle}>Fasting Tracker</Text>
                            </View>
                            <Text style={s.fastingCount}>
                                {fastingCount}<Text style={s.fastingCountMuted}>/{TOTAL_DAYS}</Text>
                            </Text>
                        </View>

                        {/* Today toggle */}
                        <TouchableOpacity
                            style={[s.fastingToggle, isFastingToday && s.fastingToggleActive]}
                            onPress={toggleFasting}
                            activeOpacity={0.7}
                            accessibilityRole="switch"
                            accessibilityLabel={`Fasting today, ${isFastingToday ? 'yes' : 'no'}`}
                        >
                            <Ionicons
                                name={isFastingToday ? 'checkmark-circle' : 'ellipse-outline'}
                                size={22}
                                color={isFastingToday ? colors.emerald[400] : colors.text.muted}
                            />
                            <Text style={[s.fastingToggleText, isFastingToday && s.fastingToggleTextActive]}>
                                {isFastingToday ? 'Fasting today — MashaAllah!' : 'Fasting today?'}
                            </Text>
                        </TouchableOpacity>

                        {/* Calendar grid */}
                        {calendarGrid}
                    </GlassCard>
                </Animated.View>

                {/* ════════════════════════════════════════════════════
                    4. CHARITY & TARAWEEH TRACKERS
                   ════════════════════════════════════════════════════ */}
                <Animated.View entering={FadeInDown.duration(500).delay(180)}>
                    <GlassCard style={s.trackersCard}>
                        <TrackerRow
                            icon="heart-outline"
                            title="Sadaqah / Charity"
                            count={charityCount}
                            total={TOTAL_DAYS}
                            isActive={isCharityToday}
                            onToggle={toggleCharity}
                            activeLabel="Gave today — JazakAllah Khair!"
                            inactiveLabel="Give sadaqah today?"
                            accentColor={colors.coral[400]}
                        />

                        <View style={s.trackerDivider} />

                        <TrackerRow
                            icon="moon-outline"
                            title="Taraweeh Prayers"
                            count={taraweehCount}
                            total={TOTAL_DAYS}
                            isActive={isTaraweehToday}
                            onToggle={toggleTaraweeh}
                            activeLabel="Prayed Taraweeh — MashaAllah!"
                            inactiveLabel="Prayed Taraweeh tonight?"
                            accentColor={colors.azure[400]}
                        />
                    </GlassCard>
                </Animated.View>

                {/* ════════════════════════════════════════════════════
                    5. DAILY DUA
                   ════════════════════════════════════════════════════ */}
                <Animated.View entering={FadeInDown.duration(500).delay(210)}>
                    <GlassCard style={s.duaCard} gold>
                        <View style={s.duaLabelRow}>
                            <Ionicons name="hand-left-outline" size={15} color={colors.gold[400]} />
                            <Text style={s.duaLabel}>Daily Dua — Day {ramadanDay}</Text>
                        </View>
                        <Text style={s.duaArabic}>{dailyDua.arabic}</Text>
                        <Text style={s.duaEnglish}>"{dailyDua.english}"</Text>
                        <TouchableOpacity
                            style={s.shareButton}
                            onPress={shareDua}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel="Share this dua"
                        >
                            <Ionicons name="share-outline" size={16} color={colors.gold[400]} />
                            <Text style={s.shareButtonText}>Share</Text>
                        </TouchableOpacity>
                    </GlassCard>
                </Animated.View>

                {/* ════════════════════════════════════════════════════
                    6. VERSE OF THE DAY
                   ════════════════════════════════════════════════════ */}
                <Animated.View entering={FadeInDown.duration(500).delay(240)}>
                    <GlassCard style={s.verseCard} gold>
                        <View style={s.verseLabelRow}>
                            <Ionicons name="book-outline" size={15} color={colors.gold[400]} />
                            <Text style={s.verseLabel}>Verse of the Day</Text>
                        </View>

                        {/* Decorative ornament */}
                        <View style={s.verseOrnament}>
                            <View style={s.ornamentLine} />
                            <Ionicons name="star" size={10} color={colors.gold[500] + '60'} />
                            <View style={s.ornamentLine} />
                        </View>

                        <Text style={s.verseArabic}>{dailyVerse.arabic}</Text>

                        <View style={s.verseDivider} />

                        <Text style={s.verseEnglish}>"{dailyVerse.english}"</Text>
                        <Text style={s.verseRef}>— Quran {dailyVerse.ref}</Text>

                        <TouchableOpacity
                            style={s.shareButton}
                            onPress={shareVerse}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel="Share this verse"
                        >
                            <Ionicons name="share-outline" size={16} color={colors.gold[400]} />
                            <Text style={s.shareButtonText}>Share</Text>
                        </TouchableOpacity>
                    </GlassCard>
                </Animated.View>

                {/* ════════════════════════════════════════════════════
                    7. DAILY QURAN READING SUGGESTION
                   ════════════════════════════════════════════════════ */}
                <Animated.View entering={FadeInDown.duration(500).delay(270)}>
                    <GlassCard style={s.readingCard}>
                        <View style={s.readingHeader}>
                            <View style={s.readingTitleRow}>
                                <Ionicons name="reader-outline" size={18} color={colors.gold[400]} />
                                <Text style={s.readingTitle}>Today's Reading</Text>
                            </View>
                            <View style={s.readingJuzBadge}>
                                <Text style={s.readingJuzText}>Juz {todaysReading.juz}</Text>
                            </View>
                        </View>

                        <Text style={s.readingSurah}>{todaysReading.surah}</Text>
                        <Text style={s.readingPages}>Pages {todaysReading.pages}</Text>

                        <TouchableOpacity
                            style={s.readingButton}
                            onPress={() => navigate('/tools/quran')}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel="Open Quran reader"
                        >
                            <LinearGradient
                                colors={[colors.gold[600], colors.gold[500]]}
                                style={StyleSheet.absoluteFill}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            />
                            <Ionicons name="book-outline" size={16} color="#FFFFFF" />
                            <Text style={s.readingButtonText}>Open Quran</Text>
                        </TouchableOpacity>
                    </GlassCard>
                </Animated.View>

                {/* ════════════════════════════════════════════════════
                    8. QURAN PROGRESS TRACKER
                   ════════════════════════════════════════════════════ */}
                <Animated.View entering={FadeInDown.duration(500).delay(300)}>
                    <GlassCard style={s.progressCard}>
                        <View style={s.progressHeader}>
                            <View style={s.progressTitleRow}>
                                <Ionicons name="book" size={18} color={colors.gold[400]} />
                                <Text style={s.progressTitle}>Quran Progress</Text>
                            </View>
                            <Text style={s.progressFraction}>
                                {juzCount}<Text style={s.progressFractionMuted}>/30 juz</Text>
                            </Text>
                        </View>

                        {/* Progress bar */}
                        <View style={s.progressBarOuter}>
                            <LinearGradient
                                colors={[colors.gold[600], colors.gold[400]]}
                                style={[s.progressBarInner, { width: `${Math.max(progressPercent, 1)}%` as `${number}%` }]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            />
                        </View>

                        {/* Status message */}
                        <Text style={s.progressMessage}>
                            {juzCount === 30
                                ? 'MashaAllah! You completed the Quran this Ramadan!'
                                : juzCount === 0
                                  ? 'Start your journey — every ayah counts'
                                  : `${juzRemaining} juz remaining, ${daysLeft} days left — you've got this`}
                        </Text>

                        {/* +/- Buttons */}
                        <View style={s.progressButtons}>
                            <TouchableOpacity
                                style={[s.juzButton, juzCount <= 0 && s.juzButtonDisabled]}
                                onPress={() => updateJuzCount(-1)}
                                disabled={juzCount <= 0}
                                activeOpacity={0.7}
                                accessibilityRole="button"
                                accessibilityLabel="Decrease juz count"
                            >
                                <Ionicons
                                    name="remove"
                                    size={22}
                                    color={juzCount <= 0 ? colors.text.muted : colors.text.primary}
                                />
                            </TouchableOpacity>

                            <View style={s.juzCountDisplay}>
                                <Text style={s.juzCountText}>{juzCount}</Text>
                                <Text style={s.juzCountSub}>juz read</Text>
                            </View>

                            <TouchableOpacity
                                style={[s.juzButton, s.juzButtonAdd, juzCount >= 30 && s.juzButtonDisabled]}
                                onPress={() => updateJuzCount(1)}
                                disabled={juzCount >= 30}
                                activeOpacity={0.7}
                                accessibilityRole="button"
                                accessibilityLabel="Increase juz count"
                            >
                                <Ionicons
                                    name="add"
                                    size={22}
                                    color={juzCount >= 30 ? colors.text.muted : colors.obsidian[900]}
                                />
                            </TouchableOpacity>
                        </View>
                    </GlassCard>
                </Animated.View>

                {/* ════════════════════════════════════════════════════
                    9. COMMUNITY INTEGRATION
                   ════════════════════════════════════════════════════ */}
                <Animated.View entering={FadeInDown.duration(500).delay(350)}>
                    <View style={s.sectionLabel}>
                        <Ionicons name="people-outline" size={14} color={colors.gold[400]} />
                        <Text style={s.sectionLabelText}>Community</Text>
                        <View style={s.sectionLabelDivider} />
                    </View>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={s.communityScrollContent}
                        style={s.communityScroll}
                    >
                        <CommunityCard
                            icon="chatbubbles-outline"
                            title="Ramadan Discussions"
                            subtitle="Join the conversation"
                            onPress={() => navigate('/(tabs)/communities')}
                            gradientColors={[colors.gold[500] + '15', colors.gold[700] + '05']}
                        />
                        <CommunityCard
                            icon="restaurant-outline"
                            title="Iftar Sharing"
                            subtitle="Share & coordinate"
                            onPress={() => navigate('/(tabs)/create')}
                            gradientColors={[colors.amber[500] + '12', colors.amber[700] + '04']}
                        />
                        <CommunityCard
                            icon="notifications-outline"
                            title="Prayer Reminders"
                            subtitle="Group notifications"
                            onPress={() => navigate('/settings/notifications')}
                            gradientColors={[colors.azure[500] + '12', colors.azure[500] + '04']}
                        />
                    </ScrollView>
                </Animated.View>

                {/* ════════════════════════════════════════════════════
                    10. QUICK ACTIONS
                   ════════════════════════════════════════════════════ */}
                <Animated.View entering={FadeInDown.duration(500).delay(400)}>
                    <View style={s.sectionLabel}>
                        <Ionicons name="flash-outline" size={14} color={colors.gold[400]} />
                        <Text style={s.sectionLabelText}>Quick Actions</Text>
                        <View style={s.sectionLabelDivider} />
                    </View>

                    <View style={s.quickActionsRow}>
                        <TouchableOpacity
                            style={s.quickActionCard}
                            onPress={() => navigate('/tools/prayer-times')}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel="Open Prayer Times"
                        >
                            <LinearGradient
                                colors={[colors.gold[500] + '15', colors.gold[700] + '05']}
                                style={StyleSheet.absoluteFill}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            />
                            <View style={s.quickActionIcon}>
                                <Ionicons name="time-outline" size={24} color={colors.gold[400]} />
                            </View>
                            <Text style={s.quickActionTitle}>Prayer Times</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={s.quickActionCard}
                            onPress={() => navigate('/tools/qibla')}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel="Open Qibla Compass"
                        >
                            <LinearGradient
                                colors={[colors.emerald[500] + '15', colors.emerald[500] + '05']}
                                style={StyleSheet.absoluteFill}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            />
                            <View style={s.quickActionIcon}>
                                <Ionicons name="compass-outline" size={24} color={colors.emerald[400]} />
                            </View>
                            <Text style={s.quickActionTitle}>Qibla</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={s.quickActionCard}
                            onPress={() => navigate('/tools/quran')}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel="Open Quran Reader"
                        >
                            <LinearGradient
                                colors={[colors.azure[500] + '15', colors.azure[500] + '05']}
                                style={StyleSheet.absoluteFill}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            />
                            <View style={s.quickActionIcon}>
                                <Ionicons name="book-outline" size={24} color={colors.azure[400]} />
                            </View>
                            <Text style={s.quickActionTitle}>Quran</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>

                {/* ════════════════════════════════════════════════════
                    11. IFTAR MOMENT PROMPT (shows at/after Maghrib)
                   ════════════════════════════════════════════════════ */}
                {isPastMaghrib && (
                    <Animated.View entering={FadeIn.duration(600)}>
                        <TouchableOpacity
                            style={s.iftarPrompt}
                            onPress={() => navigate('/(tabs)/create')}
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityLabel="Share your iftar moment"
                        >
                            <LinearGradient
                                colors={[colors.surface.goldMedium, colors.surface.goldSubtle]}
                                style={StyleSheet.absoluteFill}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            />
                            <View style={s.iftarPromptIcon}>
                                <Ionicons name="camera-outline" size={28} color={colors.gold[400]} />
                            </View>
                            <View style={s.iftarPromptContent}>
                                <Text style={s.iftarPromptTitle}>Share Your Iftar Moment</Text>
                                <Text style={s.iftarPromptSub}>
                                    Capture and share the blessings of tonight's iftar
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.gold[400]} />
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* Footer */}
                <Animated.View entering={FadeIn.duration(400).delay(600)} style={s.footer}>
                    <View style={s.footerOrnament}>
                        <View style={s.footerOrnamentLine} />
                        <Text style={s.footerText}>رمضان كريم</Text>
                        <View style={s.footerOrnamentLine} />
                    </View>
                </Animated.View>
            </ScrollView>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────
const s = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.obsidian[900],
    },
    scrollView: {
        flex: 1,
    },
    ambientGlow: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 350,
    },
    ambientGlowBottom: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 200,
        height: 200,
    },

    // ── Hero Section ──────────────────────────────────────────────
    heroSection: {
        alignItems: 'center',
        paddingTop: spacing.xl,
        paddingBottom: spacing.lg,
        paddingHorizontal: spacing.lg,
    },
    crescentContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
        overflow: 'hidden',
    },
    crescentGlow: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 40,
    },
    crescentRing: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 40,
        borderWidth: 1,
        borderColor: colors.gold[500] + '25',
    },
    crescentIcon: {
        fontSize: 38,
    },
    heroTitle: {
        fontSize: typography.fontSize['3xl'],
        fontWeight: '700',
        color: colors.gold[400],
        fontFamily: 'Inter-Bold',
        letterSpacing: -0.5,
        marginBottom: spacing.sm,
    },
    bismillah: {
        fontSize: 18,
        color: colors.gold[500] + '50',
        fontFamily: 'System',
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    dayBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.surface.goldSubtle,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.gold[500] + '15',
        marginBottom: spacing.sm,
    },
    dayBadgeText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.gold[300],
    },
    thirdLabel: {
        fontSize: typography.fontSize.xs,
        fontWeight: '500',
        color: colors.gold[500] + '90',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginBottom: spacing.md,
    },
    ramadanProgressContainer: {
        width: '100%',
        paddingHorizontal: spacing.xl,
        marginTop: spacing.xs,
    },
    ramadanProgressOuter: {
        height: 4,
        backgroundColor: colors.surface.glass,
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: spacing.xs,
    },
    ramadanProgressInner: {
        height: '100%',
        borderRadius: 2,
    },
    ramadanProgressText: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        textAlign: 'center',
    },

    // ── Countdowns ────────────────────────────────────────────────
    countdownCard: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.lg,
        borderRadius: 22,
        padding: spacing.xl,
        borderWidth: 1,
        borderColor: colors.gold[500] + '20',
        overflow: 'hidden',
        ...shadows.md,
    },
    countdownLoadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing['2xl'],
        gap: spacing.md,
    },
    countdownHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    countdownLabel: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.text.secondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    countdownLoading: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        textAlign: 'center',
    },
    countdownTimerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    suhoorTimerRow: {
        opacity: 0.85,
    },
    countdownUnit: {
        alignItems: 'center',
        minWidth: 70,
    },
    countdownNumber: {
        fontSize: typography.fontSize['5xl'],
        fontWeight: '700',
        color: colors.gold[400],
        fontFamily: 'Inter-Bold',
        letterSpacing: -1,
    },
    countdownSeconds: {
        color: colors.gold[500] + 'B0',
    },
    countdownUnitLabel: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 2,
    },
    countdownSeparator: {
        fontSize: typography.fontSize['4xl'],
        fontWeight: '300',
        color: colors.gold[500] + '50',
        marginBottom: 18,
    },
    prayerTimeText: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    countdownDivider: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        marginVertical: spacing.lg,
    },
    countdownDividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.gold[500] + '15',
    },
    countdownAccent: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 2,
        opacity: 0.5,
    },
    suhoorPastText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        textAlign: 'center',
        fontStyle: 'italic',
        paddingVertical: spacing.md,
        marginBottom: spacing.sm,
    },

    // Error states
    errorContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing['2xl'],
        gap: spacing.sm,
    },
    errorText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        textAlign: 'center',
    },
    errorHint: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        textAlign: 'center',
    },

    // Iftar reached state
    iftarReached: {
        alignItems: 'center',
        paddingVertical: spacing.lg,
    },
    iftarReachedEmoji: {
        fontSize: 40,
        marginBottom: spacing.sm,
    },
    iftarReachedText: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: '700',
        color: colors.gold[400],
        fontFamily: 'Inter-Bold',
    },
    iftarReachedSub: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        marginTop: spacing.xs,
    },

    // ── Fasting Tracker ────────────────────────────────────────────
    fastingCard: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.lg,
        padding: spacing.xl,
    },
    fastingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    fastingTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    fastingTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: colors.text.primary,
    },
    fastingCount: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        color: colors.emerald[400],
    },
    fastingCountMuted: {
        fontSize: typography.fontSize.sm,
        fontWeight: '500',
        color: colors.text.muted,
    },
    fastingToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: 14,
        backgroundColor: colors.surface.glass,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        marginBottom: spacing.lg,
    },
    fastingToggleActive: {
        borderColor: colors.emerald[500] + '30',
        backgroundColor: colors.emerald[500] + '08',
    },
    fastingToggleText: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.secondary,
    },
    fastingToggleTextActive: {
        color: colors.emerald[400],
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        justifyContent: 'center',
    },
    calendarDay: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface.glass,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    calendarDayToday: {
        borderColor: colors.gold[500] + '50',
        borderWidth: 2,
    },
    calendarDayFasted: {
        backgroundColor: colors.emerald[500],
        borderColor: colors.emerald[500],
    },
    calendarDayFuture: {
        opacity: 0.35,
    },
    calendarDayText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.text.secondary,
    },
    calendarDayTextToday: {
        color: colors.gold[400],
        fontWeight: '700',
    },
    calendarDayTextFuture: {
        color: colors.text.muted,
    },

    // ── Charity & Taraweeh Trackers ─────────────────────────────
    trackersCard: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.lg,
        padding: spacing.xl,
    },
    trackerSection: {
        // no extra style needed; container only
    },
    trackerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    trackerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    trackerTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: colors.text.primary,
    },
    trackerCount: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
    },
    trackerCountMuted: {
        fontSize: typography.fontSize.sm,
        fontWeight: '500',
        color: colors.text.muted,
    },
    trackerToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: 14,
        backgroundColor: colors.surface.glass,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        marginBottom: spacing.md,
    },
    trackerToggleText: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.secondary,
    },
    trackerProgressOuter: {
        height: 4,
        backgroundColor: colors.surface.glass,
        borderRadius: 2,
        overflow: 'hidden',
    },
    trackerProgressInner: {
        height: '100%',
        borderRadius: 2,
    },
    trackerDivider: {
        height: 1,
        backgroundColor: colors.border.subtle,
        marginVertical: spacing.lg,
    },

    // ── Daily Dua ────────────────────────────────────────────────
    duaCard: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.lg,
        padding: spacing.xl,
    },
    duaLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    duaLabel: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.gold[400],
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    duaArabic: {
        fontSize: 20,
        color: colors.gold[300],
        fontFamily: 'System',
        textAlign: 'center',
        lineHeight: 34,
        marginBottom: spacing.md,
    },
    duaEnglish: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        textAlign: 'center',
        lineHeight: 22,
        fontStyle: 'italic',
        marginBottom: spacing.lg,
    },

    // ── Verse of the Day ──────────────────────────────────────────
    verseCard: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.lg,
        padding: spacing.xl,
    },
    verseLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    verseLabel: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.gold[400],
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    verseOrnament: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    ornamentLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.gold[500] + '20',
    },
    verseArabic: {
        fontSize: 22,
        color: colors.gold[300],
        fontFamily: 'System',
        textAlign: 'center',
        lineHeight: 38,
        marginBottom: spacing.lg,
    },
    verseDivider: {
        height: 1,
        backgroundColor: colors.gold[500] + '15',
        marginHorizontal: spacing['2xl'],
        marginBottom: spacing.lg,
    },
    verseEnglish: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        textAlign: 'center',
        lineHeight: 24,
        fontStyle: 'italic',
        marginBottom: spacing.sm,
    },
    verseRef: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    shareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        alignSelf: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.gold[500] + '25',
        backgroundColor: colors.surface.goldSubtle,
    },
    shareButtonText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.gold[400],
    },

    // ── Daily Reading Suggestion ──────────────────────────────────
    readingCard: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.lg,
        padding: spacing.xl,
    },
    readingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    readingTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    readingTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: colors.text.primary,
    },
    readingJuzBadge: {
        backgroundColor: colors.surface.goldSubtle,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.gold[500] + '20',
    },
    readingJuzText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '700',
        color: colors.gold[400],
    },
    readingSurah: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.secondary,
        marginBottom: spacing.xs,
    },
    readingPages: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        marginBottom: spacing.lg,
    },
    readingButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        borderRadius: 14,
        overflow: 'hidden',
    },
    readingButtonText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    // ── Quran Progress ────────────────────────────────────────────
    progressCard: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.lg,
        padding: spacing.xl,
    },
    progressHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.lg,
    },
    progressTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    progressTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: colors.text.primary,
    },
    progressFraction: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        color: colors.gold[400],
    },
    progressFractionMuted: {
        fontSize: typography.fontSize.sm,
        fontWeight: '500',
        color: colors.text.muted,
    },
    progressBarOuter: {
        height: 6,
        backgroundColor: colors.surface.glass,
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: spacing.md,
    },
    progressBarInner: {
        height: '100%',
        borderRadius: 3,
    },
    progressMessage: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        textAlign: 'center',
        marginBottom: spacing.lg,
        lineHeight: 20,
    },
    progressButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xl,
    },
    juzButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.surface.glassActive,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    juzButtonAdd: {
        backgroundColor: colors.gold[500],
        borderColor: colors.gold[600],
    },
    juzButtonDisabled: {
        opacity: 0.3,
    },
    juzCountDisplay: {
        alignItems: 'center',
        minWidth: 60,
    },
    juzCountText: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: '700',
        color: colors.gold[400],
        fontFamily: 'Inter-Bold',
    },
    juzCountSub: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        marginTop: 2,
    },

    // ── Section Labels ────────────────────────────────────────────
    sectionLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
        gap: spacing.sm,
    },
    sectionLabelText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        color: colors.text.secondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    sectionLabelDivider: {
        flex: 1,
        height: 1,
        backgroundColor: colors.border.subtle,
        marginStart: spacing.sm,
    },

    // ── Community Section ─────────────────────────────────────────
    communityScroll: {
        marginBottom: spacing.lg,
    },
    communityScrollContent: {
        paddingHorizontal: spacing.lg,
        gap: spacing.md,
    },
    communityCard: {
        width: 160,
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.md,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        backgroundColor: colors.surface.glass,
        overflow: 'hidden',
        alignItems: 'center',
    },
    communityCardIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: colors.surface.goldSubtle,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    communityCardTitle: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        color: colors.text.primary,
        textAlign: 'center',
        marginBottom: 2,
    },
    communityCardSub: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        textAlign: 'center',
    },

    // ── Quick Actions ─────────────────────────────────────────────
    quickActionsRow: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    quickActionCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.sm,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        backgroundColor: colors.surface.glass,
        overflow: 'hidden',
    },
    quickActionIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    quickActionTitle: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.text.primary,
        textAlign: 'center',
    },

    // ── Iftar Moment Prompt ───────────────────────────────────────
    iftarPrompt: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.gold[500] + '30',
        overflow: 'hidden',
    },
    iftarPromptIcon: {
        width: 52,
        height: 52,
        borderRadius: 16,
        backgroundColor: colors.surface.goldSubtle,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    iftarPromptContent: {
        flex: 1,
    },
    iftarPromptTitle: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        color: colors.gold[400],
        marginBottom: 2,
    },
    iftarPromptSub: {
        fontSize: typography.fontSize.xs,
        color: colors.text.secondary,
        lineHeight: 16,
    },

    // ── Footer ────────────────────────────────────────────────────
    footer: {
        alignItems: 'center',
        paddingVertical: spacing['2xl'],
    },
    footerOrnament: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingHorizontal: spacing['2xl'],
    },
    footerOrnamentLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.gold[500] + '15',
    },
    footerText: {
        fontSize: 20,
        color: colors.gold[500] + '30',
        fontFamily: 'System',
    },
});
