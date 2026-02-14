import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch,
    ActivityIndicator,
    Share,
    Dimensions,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
    FadeInDown,
    FadeIn,
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { useTheme } from '../../contexts/ThemeContext';
import { ScreenHeader } from '../../components';

// ─── Constants ────────────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - spacing.lg * 2;

const STORAGE_KEYS = {
    ENABLED: '@daily-reminder-enabled',
    TIME: '@daily-reminder-time',
    CATEGORY: '@daily-reminder-category',
    FAVORITES: '@daily-reminder-favorites',
    HISTORY: '@daily-reminder-history',
} as const;

// ─── Types ────────────────────────────────────────────────────────
type Category = 'all' | 'hadith' | 'quran' | 'inspiration' | 'gratitude';

interface ContentItem {
    id: string;
    category: 'hadith' | 'quran' | 'inspiration' | 'gratitude';
    arabic?: string;
    text: string;
    source: string;
    tag: string;
}

interface HistoryEntry {
    id: string;
    date: string;
    category: string;
}

interface ReminderTime {
    hour: number;
    minute: number;
}

// ─── Content Database ─────────────────────────────────────────────

const HADITH_COLLECTION: ContentItem[] = [
    { id: 'h1', category: 'hadith', arabic: 'خَيْرُكُمْ خَيْرُكُمْ لِأَهْلِهِ', text: 'The best of you are those who are best to their families.', source: 'Tirmidhi 3895', tag: 'family' },
    { id: 'h2', category: 'hadith', arabic: 'لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ', text: 'None of you truly believes until he loves for his brother what he loves for himself.', source: 'Bukhari 13', tag: 'character' },
    { id: 'h3', category: 'hadith', arabic: 'لَيْسَ الشَّدِيدُ بِالصُّرَعَةِ', text: 'The strong person is not the one who can wrestle someone else down. The strong person is the one who can control himself when he is angry.', source: 'Bukhari 6114', tag: 'patience' },
    { id: 'h4', category: 'hadith', arabic: 'مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الْآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ', text: 'Whoever believes in Allah and the Last Day, let him speak good or remain silent.', source: 'Bukhari 6018', tag: 'character' },
    { id: 'h5', category: 'hadith', arabic: 'يَسِّرُوا وَلَا تُعَسِّرُوا', text: 'Make things easy and do not make them difficult, cheer people up and do not drive them away.', source: 'Bukhari 69', tag: 'kindness' },
    { id: 'h6', category: 'hadith', arabic: 'الطُّهُورُ شَطْرُ الْإِيمَانِ', text: 'Cleanliness is half of faith.', source: 'Muslim 223', tag: 'prayer' },
    { id: 'h7', category: 'hadith', arabic: 'تَبَسُّمُكَ فِي وَجْهِ أَخِيكَ لَكَ صَدَقَةٌ', text: 'Your smile in the face of your brother is charity.', source: 'Tirmidhi 1956', tag: 'charity' },
    { id: 'h8', category: 'hadith', arabic: 'الدُّنْيَا سِجْنُ الْمُؤْمِنِ وَجَنَّةُ الْكَافِرِ', text: 'The world is a prison for the believer and a paradise for the disbeliever.', source: 'Muslim 2956', tag: 'patience' },
    { id: 'h9', category: 'hadith', arabic: 'إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ', text: 'Actions are judged by intentions, and every person will be rewarded according to their intention.', source: 'Bukhari 1', tag: 'character' },
    { id: 'h10', category: 'hadith', arabic: 'مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا', text: 'Whoever takes a path in search of knowledge, Allah will make easy for him a path to Paradise.', source: 'Muslim 2699', tag: 'knowledge' },
    { id: 'h11', category: 'hadith', arabic: 'لَا تَحَاسَدُوا وَلَا تَنَاجَشُوا وَلَا تَبَاغَضُوا', text: 'Do not envy one another, do not inflate prices for one another, do not hate one another, and do not turn away from one another. Be servants of Allah, as brothers.', source: 'Muslim 2564', tag: 'character' },
    { id: 'h12', category: 'hadith', arabic: 'مَا نَقَصَتْ صَدَقَةٌ مِنْ مَالٍ', text: 'Charity does not decrease wealth. No one forgives another except that Allah increases his honor.', source: 'Muslim 2588', tag: 'charity' },
    { id: 'h13', category: 'hadith', arabic: 'اتَّقِ اللَّهَ حَيْثُمَا كُنْتَ', text: 'Fear Allah wherever you are, follow a bad deed with a good deed and it will erase it, and treat people with good character.', source: 'Tirmidhi 1987', tag: 'character' },
    { id: 'h14', category: 'hadith', arabic: 'الْمُسْلِمُ مَنْ سَلِمَ الْمُسْلِمُونَ مِنْ لِسَانِهِ وَيَدِهِ', text: 'A Muslim is the one from whose tongue and hand other Muslims are safe.', source: 'Bukhari 10', tag: 'kindness' },
    { id: 'h15', category: 'hadith', arabic: 'مَنْ لَا يَرْحَمِ النَّاسَ لَا يَرْحَمْهُ اللَّهُ', text: 'He who does not show mercy to people, Allah will not show mercy to him.', source: 'Bukhari 7376', tag: 'kindness' },
    { id: 'h16', category: 'hadith', arabic: 'خَيْرُ النَّاسِ أَنْفَعُهُمْ لِلنَّاسِ', text: 'The best of people are those who are most beneficial to people.', source: 'Tabarani', tag: 'kindness' },
    { id: 'h17', category: 'hadith', arabic: 'إِنَّ اللَّهَ رَفِيقٌ يُحِبُّ الرِّفْقَ', text: 'Indeed, Allah is gentle and loves gentleness in all matters.', source: 'Bukhari 6927', tag: 'kindness' },
    { id: 'h18', category: 'hadith', arabic: 'الصَّبْرُ ضِيَاءٌ', text: 'Patience is illumination.', source: 'Muslim 223', tag: 'patience' },
    { id: 'h19', category: 'hadith', arabic: 'مَا مِنْ مُسْلِمٍ يَغْرِسُ غَرْسًا', text: 'There is no Muslim who plants a tree or sows a crop, and a bird, person, or animal eats from it, except that it is charity for him.', source: 'Bukhari 2320', tag: 'charity' },
    { id: 'h20', category: 'hadith', arabic: 'الْجَنَّةُ تَحْتَ أَقْدَامِ الْأُمَّهَاتِ', text: 'Paradise lies at the feet of your mother.', source: 'Nasai 3104', tag: 'family' },
    { id: 'h21', category: 'hadith', arabic: 'أَحَبُّ الْأَعْمَالِ إِلَى اللَّهِ أَدْوَمُهَا وَإِنْ قَلَّ', text: 'The most beloved of deeds to Allah are those that are most consistent, even if they are small.', source: 'Bukhari 6464', tag: 'prayer' },
    { id: 'h22', category: 'hadith', arabic: 'الدُّعَاءُ هُوَ الْعِبَادَةُ', text: 'Supplication (dua) is the essence of worship.', source: 'Tirmidhi 3371', tag: 'prayer' },
    { id: 'h23', category: 'hadith', arabic: 'إِذَا مَاتَ الْإِنْسَانُ انْقَطَعَ عَمَلُهُ إِلَّا مِنْ ثَلَاثٍ', text: 'When a person dies, all their deeds end except three: ongoing charity, beneficial knowledge, or a righteous child who prays for them.', source: 'Muslim 1631', tag: 'charity' },
    { id: 'h24', category: 'hadith', arabic: 'لَا يَشْكُرُ اللَّهَ مَنْ لَا يَشْكُرُ النَّاسَ', text: 'He who does not thank people does not thank Allah.', source: 'Abu Dawud 4811', tag: 'character' },
    { id: 'h25', category: 'hadith', arabic: 'طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَى كُلِّ مُسْلِمٍ', text: 'Seeking knowledge is an obligation upon every Muslim.', source: 'Ibn Majah 224', tag: 'knowledge' },
    { id: 'h26', category: 'hadith', arabic: 'مَنْ غَشَّنَا فَلَيْسَ مِنَّا', text: 'Whoever cheats us is not one of us.', source: 'Muslim 101', tag: 'character' },
    { id: 'h27', category: 'hadith', arabic: 'أَفْضَلُ الصَّدَقَةِ أَنْ تُشْبِعَ كَبِدًا جَائِعًا', text: 'The best charity is to satisfy a hungry person.', source: 'Bayhaqi', tag: 'charity' },
    { id: 'h28', category: 'hadith', arabic: 'مَنْ كَظَمَ غَيْظًا وَهُوَ قَادِرٌ عَلَى أَنْ يُنْفِذَهُ', text: 'Whoever suppresses his anger when he is able to act upon it, Allah will fill his heart with contentment on the Day of Resurrection.', source: 'Tabarani', tag: 'patience' },
    { id: 'h29', category: 'hadith', arabic: 'مَا أَكَلَ أَحَدٌ طَعَامًا قَطُّ خَيْرًا مِنْ أَنْ يَأْكُلَ مِنْ عَمَلِ يَدِهِ', text: 'No one has ever eaten food better than that which he earned by working with his own hands.', source: 'Bukhari 2072', tag: 'character' },
    { id: 'h30', category: 'hadith', arabic: 'إِنَّ اللَّهَ لَا يَنْظُرُ إِلَى صُوَرِكُمْ وَأَمْوَالِكُمْ', text: 'Allah does not look at your appearance or your wealth, but He looks at your hearts and your deeds.', source: 'Muslim 2564', tag: 'character' },
    { id: 'h31', category: 'hadith', arabic: 'اسْتَعِنْ بِاللَّهِ وَلَا تَعْجِزْ', text: 'Seek the help of Allah and do not lose heart.', source: 'Muslim 2664', tag: 'patience' },
    { id: 'h32', category: 'hadith', arabic: 'أَكْمَلُ الْمُؤْمِنِينَ إِيمَانًا أَحْسَنُهُمْ خُلُقًا', text: 'The most complete of the believers in faith is the one with the best character.', source: 'Tirmidhi 1162', tag: 'character' },
];

const QURAN_VERSES: ContentItem[] = [
    { id: 'q1', category: 'quran', arabic: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا', text: 'Indeed, with hardship comes ease.', source: 'Ash-Sharh 94:6', tag: 'patience' },
    { id: 'q2', category: 'quran', arabic: 'وَوَجَدَكَ ضَالًّا فَهَدَىٰ', text: 'And He found you lost and guided you.', source: 'Ad-Duha 93:7', tag: 'guidance' },
    { id: 'q3', category: 'quran', arabic: 'فَاذْكُرُونِي أَذْكُرْكُمْ', text: 'So remember Me; I will remember you.', source: 'Al-Baqarah 2:152', tag: 'remembrance' },
    { id: 'q4', category: 'quran', arabic: 'لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا', text: 'Allah does not burden a soul beyond that it can bear.', source: 'Al-Baqarah 2:286', tag: 'patience' },
    { id: 'q5', category: 'quran', arabic: 'وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰ', text: 'And your Lord is going to give you, and you will be satisfied.', source: 'Ad-Duha 93:5', tag: 'hope' },
    { id: 'q6', category: 'quran', arabic: 'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ', text: 'Indeed, Allah is with the patient.', source: 'Al-Baqarah 2:153', tag: 'patience' },
    { id: 'q7', category: 'quran', arabic: 'وَمَنْ يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ', text: 'And whoever puts their trust in Allah, He will be enough for them.', source: 'At-Talaq 65:3', tag: 'trust' },
    { id: 'q8', category: 'quran', arabic: 'وَنَحْنُ أَقْرَبُ إِلَيْهِ مِنْ حَبْلِ الْوَرِيدِ', text: 'And We are closer to him than his jugular vein.', source: 'Qaf 50:16', tag: 'closeness' },
    { id: 'q9', category: 'quran', arabic: 'ادْعُونِي أَسْتَجِبْ لَكُمْ', text: 'Call upon Me; I will respond to you.', source: 'Ghafir 40:60', tag: 'prayer' },
    { id: 'q10', category: 'quran', arabic: 'وَلَا تَيْأَسُوا مِنْ رَوْحِ اللَّهِ', text: 'And do not despair of the mercy of Allah.', source: 'Yusuf 12:87', tag: 'hope' },
    { id: 'q11', category: 'quran', arabic: 'إِنَّ اللَّهَ لَا يُغَيِّرُ مَا بِقَوْمٍ حَتَّىٰ يُغَيِّرُوا مَا بِأَنْفُسِهِمْ', text: 'Indeed, Allah will not change the condition of a people until they change what is in themselves.', source: 'Ar-Ra\'d 13:11', tag: 'change' },
    { id: 'q12', category: 'quran', arabic: 'وَاصْبِرْ فَإِنَّ اللَّهَ لَا يُضِيعُ أَجْرَ الْمُحْسِنِينَ', text: 'And be patient, for indeed, Allah does not allow to be lost the reward of those who do good.', source: 'Hud 11:115', tag: 'patience' },
    { id: 'q13', category: 'quran', arabic: 'رَبِّ اشْرَحْ لِي صَدْرِي', text: 'My Lord, expand for me my chest [with assurance].', source: 'Ta-Ha 20:25', tag: 'prayer' },
    { id: 'q14', category: 'quran', arabic: 'وَقُلْ رَبِّ زِدْنِي عِلْمًا', text: 'And say, "My Lord, increase me in knowledge."', source: 'Ta-Ha 20:114', tag: 'knowledge' },
    { id: 'q15', category: 'quran', arabic: 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ', text: 'Verily, in the remembrance of Allah do hearts find rest.', source: 'Ar-Ra\'d 13:28', tag: 'remembrance' },
    { id: 'q16', category: 'quran', arabic: 'وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ', text: 'And when My servants ask you about Me, indeed I am near.', source: 'Al-Baqarah 2:186', tag: 'closeness' },
    { id: 'q17', category: 'quran', arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً', text: 'Our Lord, give us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.', source: 'Al-Baqarah 2:201', tag: 'prayer' },
    { id: 'q18', category: 'quran', arabic: 'وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ', text: 'And my success is not but through Allah.', source: 'Hud 11:88', tag: 'trust' },
    { id: 'q19', category: 'quran', arabic: 'فَاصْبِرْ إِنَّ وَعْدَ اللَّهِ حَقٌّ', text: 'So be patient. Indeed, the promise of Allah is truth.', source: 'Ar-Rum 30:60', tag: 'patience' },
    { id: 'q20', category: 'quran', arabic: 'وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ', text: 'And We have certainly made the Quran easy for remembrance.', source: 'Al-Qamar 54:17', tag: 'remembrance' },
    { id: 'q21', category: 'quran', arabic: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا', text: 'Indeed, with hardship will be ease.', source: 'Ash-Sharh 94:5', tag: 'patience' },
    { id: 'q22', category: 'quran', arabic: 'وَهُوَ مَعَكُمْ أَيْنَ مَا كُنْتُمْ', text: 'And He is with you wherever you are.', source: 'Al-Hadid 57:4', tag: 'closeness' },
    { id: 'q23', category: 'quran', arabic: 'قُلْ هُوَ اللَّهُ أَحَدٌ', text: 'Say, "He is Allah, the One."', source: 'Al-Ikhlas 112:1', tag: 'faith' },
    { id: 'q24', category: 'quran', arabic: 'وَلَا تَحْزَنْ إِنَّ اللَّهَ مَعَنَا', text: 'Do not grieve; indeed Allah is with us.', source: 'At-Tawbah 9:40', tag: 'hope' },
    { id: 'q25', category: 'quran', arabic: 'رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا', text: 'Our Lord, let not our hearts deviate after You have guided us.', source: 'Ali \'Imran 3:8', tag: 'guidance' },
    { id: 'q26', category: 'quran', arabic: 'وَمَنْ يَتَّقِ اللَّهَ يَجْعَلْ لَهُ مَخْرَجًا', text: 'And whoever fears Allah, He will make for him a way out.', source: 'At-Talaq 65:2', tag: 'trust' },
    { id: 'q27', category: 'quran', arabic: 'إِنَّا لِلَّهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ', text: 'Indeed we belong to Allah, and indeed to Him we will return.', source: 'Al-Baqarah 2:156', tag: 'faith' },
    { id: 'q28', category: 'quran', arabic: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ', text: 'Sufficient for us is Allah, and He is the best Disposer of affairs.', source: 'Ali \'Imran 3:173', tag: 'trust' },
    { id: 'q29', category: 'quran', arabic: 'وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ', text: 'And seek help through patience and prayer.', source: 'Al-Baqarah 2:45', tag: 'prayer' },
    { id: 'q30', category: 'quran', arabic: 'رَبِّ لَا تَذَرْنِي فَرْدًا وَأَنْتَ خَيْرُ الْوَارِثِينَ', text: 'My Lord, do not leave me alone, and You are the best of inheritors.', source: 'Al-Anbiya 21:89', tag: 'prayer' },
    { id: 'q31', category: 'quran', arabic: 'وَرَحْمَتِي وَسِعَتْ كُلَّ شَيْءٍ', text: 'And My mercy encompasses all things.', source: 'Al-A\'raf 7:156', tag: 'hope' },
    { id: 'q32', category: 'quran', arabic: 'فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ', text: 'So which of the favors of your Lord would you deny?', source: 'Ar-Rahman 55:13', tag: 'gratitude' },
];

const INSPIRATION_QUOTES: ContentItem[] = [
    { id: 'i1', category: 'inspiration', text: 'The only way to do great work is to love what you do.', source: 'Steve Jobs', tag: 'purpose' },
    { id: 'i2', category: 'inspiration', text: 'Be the change you wish to see in the world.', source: 'Mahatma Gandhi', tag: 'change' },
    { id: 'i3', category: 'inspiration', text: 'In the middle of difficulty lies opportunity.', source: 'Albert Einstein', tag: 'perseverance' },
    { id: 'i4', category: 'inspiration', text: 'The future belongs to those who believe in the beauty of their dreams.', source: 'Eleanor Roosevelt', tag: 'dreams' },
    { id: 'i5', category: 'inspiration', text: 'It is during our darkest moments that we must focus to see the light.', source: 'Aristotle', tag: 'perseverance' },
    { id: 'i6', category: 'inspiration', text: 'The only impossible journey is the one you never begin.', source: 'Tony Robbins', tag: 'action' },
    { id: 'i7', category: 'inspiration', text: 'What lies behind us and what lies before us are tiny matters compared to what lies within us.', source: 'Ralph Waldo Emerson', tag: 'inner strength' },
    { id: 'i8', category: 'inspiration', text: 'Success is not final, failure is not fatal: it is the courage to continue that counts.', source: 'Winston Churchill', tag: 'perseverance' },
    { id: 'i9', category: 'inspiration', text: 'Strive not to be a success, but rather to be of value.', source: 'Albert Einstein', tag: 'purpose' },
    { id: 'i10', category: 'inspiration', text: 'The best time to plant a tree was 20 years ago. The second best time is now.', source: 'Chinese Proverb', tag: 'action' },
    { id: 'i11', category: 'inspiration', text: 'Your time is limited, so don\'t waste it living someone else\'s life.', source: 'Steve Jobs', tag: 'authenticity' },
    { id: 'i12', category: 'inspiration', text: 'Do not go where the path may lead; go instead where there is no path and leave a trail.', source: 'Ralph Waldo Emerson', tag: 'courage' },
    { id: 'i13', category: 'inspiration', text: 'Believe you can and you\'re halfway there.', source: 'Theodore Roosevelt', tag: 'belief' },
    { id: 'i14', category: 'inspiration', text: 'The greatest glory in living lies not in never falling, but in rising every time we fall.', source: 'Nelson Mandela', tag: 'resilience' },
    { id: 'i15', category: 'inspiration', text: 'Life is what happens when you\'re busy making other plans.', source: 'John Lennon', tag: 'mindfulness' },
    { id: 'i16', category: 'inspiration', text: 'It always seems impossible until it\'s done.', source: 'Nelson Mandela', tag: 'perseverance' },
    { id: 'i17', category: 'inspiration', text: 'Happiness is not something ready-made. It comes from your own actions.', source: 'Dalai Lama', tag: 'happiness' },
    { id: 'i18', category: 'inspiration', text: 'The mind is everything. What you think, you become.', source: 'Buddha', tag: 'mindset' },
    { id: 'i19', category: 'inspiration', text: 'Education is the most powerful weapon which you can use to change the world.', source: 'Nelson Mandela', tag: 'knowledge' },
    { id: 'i20', category: 'inspiration', text: 'We must accept finite disappointment, but never lose infinite hope.', source: 'Martin Luther King Jr.', tag: 'hope' },
    { id: 'i21', category: 'inspiration', text: 'The only person you are destined to become is the person you decide to be.', source: 'Ralph Waldo Emerson', tag: 'purpose' },
    { id: 'i22', category: 'inspiration', text: 'Everything you\'ve ever wanted is on the other side of fear.', source: 'George Addair', tag: 'courage' },
    { id: 'i23', category: 'inspiration', text: 'You must be the change you wish to see in the world.', source: 'Mahatma Gandhi', tag: 'change' },
    { id: 'i24', category: 'inspiration', text: 'Hardships often prepare ordinary people for an extraordinary destiny.', source: 'C.S. Lewis', tag: 'resilience' },
    { id: 'i25', category: 'inspiration', text: 'A person who never made a mistake never tried anything new.', source: 'Albert Einstein', tag: 'growth' },
    { id: 'i26', category: 'inspiration', text: 'The secret of getting ahead is getting started.', source: 'Mark Twain', tag: 'action' },
    { id: 'i27', category: 'inspiration', text: 'Don\'t count the days. Make the days count.', source: 'Muhammad Ali', tag: 'purpose' },
    { id: 'i28', category: 'inspiration', text: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.', source: 'Aristotle', tag: 'discipline' },
    { id: 'i29', category: 'inspiration', text: 'Turn your wounds into wisdom.', source: 'Oprah Winfrey', tag: 'resilience' },
    { id: 'i30', category: 'inspiration', text: 'The journey of a thousand miles begins with a single step.', source: 'Lao Tzu', tag: 'action' },
    { id: 'i31', category: 'inspiration', text: 'What we achieve inwardly will change outer reality.', source: 'Plutarch', tag: 'inner strength' },
    { id: 'i32', category: 'inspiration', text: 'Act as if what you do makes a difference. It does.', source: 'William James', tag: 'purpose' },
];

const GRATITUDE_PROMPTS: ContentItem[] = [
    { id: 'g1', category: 'gratitude', text: 'What are three things you\'re grateful for today?', source: 'Reflection', tag: 'daily' },
    { id: 'g2', category: 'gratitude', text: 'Who made a positive impact on your life this week?', source: 'Reflection', tag: 'people' },
    { id: 'g3', category: 'gratitude', text: 'What is one challenge you faced recently that taught you something valuable?', source: 'Reflection', tag: 'growth' },
    { id: 'g4', category: 'gratitude', text: 'Name a simple pleasure that brought you joy today.', source: 'Reflection', tag: 'daily' },
    { id: 'g5', category: 'gratitude', text: 'What ability or talent are you most thankful for?', source: 'Reflection', tag: 'self' },
    { id: 'g6', category: 'gratitude', text: 'Think of a difficult time that made you stronger. What did you learn?', source: 'Reflection', tag: 'growth' },
    { id: 'g7', category: 'gratitude', text: 'What is one thing about your health that you\'re grateful for?', source: 'Reflection', tag: 'health' },
    { id: 'g8', category: 'gratitude', text: 'Who is someone you haven\'t thanked enough? What would you say to them?', source: 'Reflection', tag: 'people' },
    { id: 'g9', category: 'gratitude', text: 'What is a recent accomplishment, big or small, that you\'re proud of?', source: 'Reflection', tag: 'self' },
    { id: 'g10', category: 'gratitude', text: 'What is something beautiful you noticed in nature recently?', source: 'Reflection', tag: 'nature' },
    { id: 'g11', category: 'gratitude', text: 'What is a comfort or convenience you often take for granted?', source: 'Reflection', tag: 'daily' },
    { id: 'g12', category: 'gratitude', text: 'What memory always makes you smile when you think about it?', source: 'Reflection', tag: 'memories' },
    { id: 'g13', category: 'gratitude', text: 'What is one thing about your home that you appreciate?', source: 'Reflection', tag: 'daily' },
    { id: 'g14', category: 'gratitude', text: 'What act of kindness did you witness or experience recently?', source: 'Reflection', tag: 'people' },
    { id: 'g15', category: 'gratitude', text: 'What is a book, song, or piece of art that has enriched your life?', source: 'Reflection', tag: 'culture' },
    { id: 'g16', category: 'gratitude', text: 'What lesson from your parents or elders are you most grateful for?', source: 'Reflection', tag: 'people' },
    { id: 'g17', category: 'gratitude', text: 'What opportunity do you have today that you didn\'t have a year ago?', source: 'Reflection', tag: 'growth' },
    { id: 'g18', category: 'gratitude', text: 'What is something about your faith that brings you peace?', source: 'Reflection', tag: 'faith' },
    { id: 'g19', category: 'gratitude', text: 'What is one meal or food you truly enjoyed recently?', source: 'Reflection', tag: 'daily' },
    { id: 'g20', category: 'gratitude', text: 'What is a friendship you cherish and why?', source: 'Reflection', tag: 'people' },
    { id: 'g21', category: 'gratitude', text: 'What is something you learned this week that you\'re thankful for?', source: 'Reflection', tag: 'growth' },
    { id: 'g22', category: 'gratitude', text: 'What is a place that makes you feel at peace?', source: 'Reflection', tag: 'nature' },
];

const ALL_CONTENT: ContentItem[] = [
    ...HADITH_COLLECTION,
    ...QURAN_VERSES,
    ...INSPIRATION_QUOTES,
    ...GRATITUDE_PROMPTS,
];

// ─── Category Config ──────────────────────────────────────────────
const CATEGORIES: { key: Category; label: string; icon: keyof typeof Ionicons.glyphMap; count: number }[] = [
    { key: 'all', label: 'All', icon: 'sparkles', count: ALL_CONTENT.length },
    { key: 'hadith', label: 'Hadith', icon: 'book', count: HADITH_COLLECTION.length },
    { key: 'quran', label: 'Quran', icon: 'book-outline', count: QURAN_VERSES.length },
    { key: 'inspiration', label: 'Inspiration', icon: 'bulb', count: INSPIRATION_QUOTES.length },
    { key: 'gratitude', label: 'Gratitude', icon: 'heart', count: GRATITUDE_PROMPTS.length },
];

const TIME_OPTIONS: { label: string; hour: number; minute: number }[] = [
    { label: '5:00 AM', hour: 5, minute: 0 },
    { label: '6:00 AM', hour: 6, minute: 0 },
    { label: '7:00 AM', hour: 7, minute: 0 },
    { label: '8:00 AM', hour: 8, minute: 0 },
    { label: '9:00 AM', hour: 9, minute: 0 },
    { label: '12:00 PM', hour: 12, minute: 0 },
    { label: '6:00 PM', hour: 18, minute: 0 },
    { label: '9:00 PM', hour: 21, minute: 0 },
];

// ─── Helpers ──────────────────────────────────────────────────────

function getCategoryIcon(category: string): keyof typeof Ionicons.glyphMap {
    switch (category) {
        case 'hadith': return 'book';
        case 'quran': return 'book-outline';
        case 'inspiration': return 'bulb';
        case 'gratitude': return 'heart';
        default: return 'sparkles';
    }
}

function getCategoryLabel(category: string): string {
    switch (category) {
        case 'hadith': return 'Hadith';
        case 'quran': return 'Quran';
        case 'inspiration': return 'Inspiration';
        case 'gratitude': return 'Gratitude';
        default: return 'Daily Inspiration';
    }
}

function getCategoryTitle(category: string): string {
    switch (category) {
        case 'hadith': return 'Daily Hadith';
        case 'quran': return 'Daily Quran Verse';
        case 'inspiration': return 'Daily Inspiration';
        case 'gratitude': return 'Gratitude Prompt';
        default: return 'Daily Reminder';
    }
}

/** Deterministic daily pick based on date + category offset */
function getTodayContent(category: Category): ContentItem {
    const pool = category === 'all' ? ALL_CONTENT : ALL_CONTENT.filter((c) => c.category === category);
    const today = new Date();
    const dayIndex = today.getFullYear() * 366 + today.getMonth() * 31 + today.getDate();
    return pool[dayIndex % pool.length];
}

function getRandomContent(category: Category): ContentItem {
    const pool = category === 'all' ? ALL_CONTENT : ALL_CONTENT.filter((c) => c.category === category);
    return pool[Math.floor(Math.random() * pool.length)];
}

function getDateLabel(dateStr: string): string {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

    const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getContentById(id: string): ContentItem | undefined {
    return ALL_CONTENT.find((c) => c.id === id);
}

// ─── Notification Scheduling ──────────────────────────────────────

async function scheduleDailyReminder(hour: number, minute: number, category: Category) {
    await Notifications.cancelAllScheduledNotificationsAsync();
    const content = getRandomContent(category);
    await Notifications.scheduleNotificationAsync({
        content: {
            title: getCategoryTitle(category),
            body: content.text,
            data: { type: 'daily_reminder', category },
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour,
            minute,
        },
    });
}

async function cancelDailyReminder() {
    await Notifications.cancelAllScheduledNotificationsAsync();
}

// ─── Main Screen ──────────────────────────────────────────────────
export default function DailyRemindersScreen() {
    const { colors: c } = useTheme();
    const insets = useSafeAreaInsets();

    // ── State ──
    const [activeCategory, setActiveCategory] = useState<Category>('all');
    const [currentContent, setCurrentContent] = useState<ContentItem>(getTodayContent('all'));
    const [favorites, setFavorites] = useState<string[]>([]);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [reminderEnabled, setReminderEnabled] = useState(false);
    const [reminderTime, setReminderTime] = useState<ReminderTime>({ hour: 7, minute: 0 });
    const [reminderCategory, setReminderCategory] = useState<Category>('all');
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [showFavorites, setShowFavorites] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // ── Animations ──
    const cardScale = useSharedValue(1);
    const cardOpacity = useSharedValue(1);

    const cardAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: cardScale.value }],
        opacity: cardOpacity.value,
    }));

    // ── Load persisted data ──
    useEffect(() => {
        (async () => {
            try {
                const [enabledStr, timeStr, catStr, favsStr, histStr] = await Promise.all([
                    AsyncStorage.getItem(STORAGE_KEYS.ENABLED),
                    AsyncStorage.getItem(STORAGE_KEYS.TIME),
                    AsyncStorage.getItem(STORAGE_KEYS.CATEGORY),
                    AsyncStorage.getItem(STORAGE_KEYS.FAVORITES),
                    AsyncStorage.getItem(STORAGE_KEYS.HISTORY),
                ]);

                try {
                    if (enabledStr !== null) setReminderEnabled(JSON.parse(enabledStr));
                    if (timeStr) setReminderTime(JSON.parse(timeStr));
                    if (catStr) setReminderCategory(catStr as Category);
                    if (favsStr) setFavorites(JSON.parse(favsStr));
                    if (histStr) setHistory(JSON.parse(histStr));
                } catch {
                    // Corrupted storage data — use defaults
                }
            } catch {
                // Ignore storage read errors
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    // ── Record history on mount ──
    useEffect(() => {
        if (isLoading) return;
        const today = new Date().toISOString().split('T')[0];
        const alreadyRecorded = history.some((h) => h.date === today && h.id === currentContent.id);
        if (!alreadyRecorded) {
            const newEntry: HistoryEntry = { id: currentContent.id, date: today, category: currentContent.category };
            const updated = [newEntry, ...history].slice(0, 30);
            setHistory(updated);
            AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated)).catch(() => {});
        }
    }, [isLoading, currentContent.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Category change ──
    const handleCategoryChange = useCallback((cat: Category) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setActiveCategory(cat);
        cardOpacity.value = withTiming(0, { duration: 150 }, () => {
            cardOpacity.value = withTiming(1, { duration: 250 });
        });
        setTimeout(() => {
            setCurrentContent(getTodayContent(cat));
        }, 150);
    }, [cardOpacity]);

    // ── Navigate content ──
    const navigateContent = useCallback((direction: 'next' | 'prev') => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const pool = activeCategory === 'all' ? ALL_CONTENT : ALL_CONTENT.filter((item) => item.category === activeCategory);
        const currentIndex = pool.findIndex((item) => item.id === currentContent.id);
        let newIndex: number;
        if (direction === 'next') {
            newIndex = (currentIndex + 1) % pool.length;
        } else {
            newIndex = currentIndex <= 0 ? pool.length - 1 : currentIndex - 1;
        }

        cardScale.value = withSpring(0.95, { damping: 15 }, () => {
            cardScale.value = withSpring(1, { damping: 12 });
        });
        cardOpacity.value = withTiming(0, { duration: 120 }, () => {
            cardOpacity.value = withTiming(1, { duration: 200 });
        });
        setTimeout(() => {
            setCurrentContent(pool[newIndex]);
        }, 120);
    }, [activeCategory, currentContent.id, cardScale, cardOpacity]);

    // ── Favorite toggle ──
    const toggleFavorite = useCallback(async (id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const updated = favorites.includes(id)
            ? favorites.filter((f) => f !== id)
            : [...favorites, id];
        setFavorites(updated);
        await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(updated)).catch(() => {});
    }, [favorites]);

    // ── Share ──
    const handleShare = useCallback(async (item: ContentItem) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const lines: string[] = [];
        if (item.arabic) lines.push(item.arabic, '');
        lines.push(`"${item.text}"`);
        lines.push(`— ${item.source}`);
        lines.push('', 'Shared via Caravan');

        await Share.share({ message: lines.join('\n') }).catch(() => {});
    }, []);

    // ── Copy ──
    const handleCopy = useCallback(async (item: ContentItem) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const lines: string[] = [];
        if (item.arabic) lines.push(item.arabic, '');
        lines.push(`"${item.text}"`);
        lines.push(`— ${item.source}`);

        // Use Share as a fallback since Clipboard requires additional dependency
        await Share.share({ message: lines.join('\n') }).catch(() => {});
    }, []);

    // ── Reminder toggle ──
    const handleReminderToggle = useCallback(async (value: boolean) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setReminderEnabled(value);
        await AsyncStorage.setItem(STORAGE_KEYS.ENABLED, JSON.stringify(value)).catch(() => {});

        if (value) {
            const { status } = await Notifications.requestPermissionsAsync();
            if (status !== 'granted') {
                setReminderEnabled(false);
                await AsyncStorage.setItem(STORAGE_KEYS.ENABLED, JSON.stringify(false)).catch(() => {});
                return;
            }
            await scheduleDailyReminder(reminderTime.hour, reminderTime.minute, reminderCategory);
        } else {
            await cancelDailyReminder();
        }
    }, [reminderTime, reminderCategory]);

    // ── Time change ──
    const handleTimeChange = useCallback(async (time: ReminderTime) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setReminderTime(time);
        setShowTimePicker(false);
        await AsyncStorage.setItem(STORAGE_KEYS.TIME, JSON.stringify(time)).catch(() => {});
        if (reminderEnabled) {
            await scheduleDailyReminder(time.hour, time.minute, reminderCategory);
        }
    }, [reminderEnabled, reminderCategory]);

    // ── Notification category change ──
    const handleNotifCategoryChange = useCallback(async (cat: Category) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setReminderCategory(cat);
        setShowCategoryPicker(false);
        await AsyncStorage.setItem(STORAGE_KEYS.CATEGORY, cat).catch(() => {});
        if (reminderEnabled) {
            await scheduleDailyReminder(reminderTime.hour, reminderTime.minute, cat);
        }
    }, [reminderEnabled, reminderTime]);

    // ── Derived data ──
    const isFavorited = favorites.includes(currentContent.id);

    const favoriteItems = useMemo(
        () => favorites.map(getContentById).filter(Boolean) as ContentItem[],
        [favorites],
    );

    const groupedHistory = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

        const groups: { label: string; items: HistoryEntry[] }[] = [];
        const todayItems = history.filter((h) => h.date === today);
        const yesterdayItems = history.filter((h) => h.date === yesterday);
        const weekItems = history.filter((h) => h.date > weekAgo && h.date < yesterday);

        if (todayItems.length > 0) groups.push({ label: 'Today', items: todayItems });
        if (yesterdayItems.length > 0) groups.push({ label: 'Yesterday', items: yesterdayItems });
        if (weekItems.length > 0) groups.push({ label: 'This Week', items: weekItems });

        return groups;
    }, [history]);

    const timeLabel = useMemo(() => {
        const h = reminderTime.hour;
        const period = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        return `${hour12}:${reminderTime.minute.toString().padStart(2, '0')} ${period}`;
    }, [reminderTime]);

    // ── Loading ──
    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: c.obsidian[900] }]}>
                <ScreenHeader title="Daily Inspiration" />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={c.gold[400]} />
                </View>
            </View>
        );
    }

    // ── Render ──
    return (
        <View style={[styles.container, { backgroundColor: c.obsidian[900] }]}>
            <ScreenHeader title="Daily Inspiration" />

            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl }]}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Category Pills ── */}
                <Animated.View entering={FadeInDown.duration(400).delay(100)}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.categoryRow}
                    >
                        {CATEGORIES.map((cat) => {
                            const isActive = activeCategory === cat.key;
                            return (
                                <TouchableOpacity
                                    key={cat.key}
                                    onPress={() => handleCategoryChange(cat.key)}
                                    style={[
                                        styles.categoryPill,
                                        { borderColor: c.border.subtle, backgroundColor: c.surface.glass },
                                        isActive && { backgroundColor: c.surface.goldMedium, borderColor: c.gold[500] + '40' },
                                    ]}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name={cat.icon}
                                        size={14}
                                        color={isActive ? c.gold[400] : c.text.muted}
                                    />
                                    <Text
                                        style={[
                                            styles.categoryPillText,
                                            { color: c.text.secondary },
                                            isActive && { color: c.gold[400], fontWeight: '600' },
                                        ]}
                                    >
                                        {cat.label}
                                    </Text>
                                    <View
                                        style={[
                                            styles.categoryCount,
                                            { backgroundColor: c.surface.glass },
                                            isActive && { backgroundColor: c.gold[500] + '25' },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.categoryCountText,
                                                { color: c.text.muted },
                                                isActive && { color: c.gold[400] },
                                            ]}
                                        >
                                            {cat.count}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </Animated.View>

                {/* ── Today's Card ── */}
                <Animated.View
                    entering={FadeInDown.duration(500).delay(200)}
                    style={cardAnimatedStyle}
                >
                    <LinearGradient
                        colors={[c.surface.goldLight, c.surface.glass, c.obsidian[800]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.mainCard, { borderColor: c.gold[500] + '25' }]}
                    >
                        {/* Card Header */}
                        <View style={styles.cardHeader}>
                            <View style={[styles.cardCategoryBadge, { backgroundColor: c.surface.goldSubtle }]}>
                                <Ionicons
                                    name={getCategoryIcon(currentContent.category)}
                                    size={13}
                                    color={c.gold[400]}
                                />
                                <Text style={[styles.cardCategoryText, { color: c.gold[400] }]}>
                                    {getCategoryLabel(currentContent.category)}
                                </Text>
                            </View>
                            <View style={[styles.cardTagBadge, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}>
                                <Text style={[styles.cardTagText, { color: c.text.muted }]}>
                                    {currentContent.tag}
                                </Text>
                            </View>
                        </View>

                        {/* Arabic Text */}
                        {currentContent.arabic && (
                            <Text style={[styles.arabicText, { color: c.gold[300] }]}>
                                {currentContent.arabic}
                            </Text>
                        )}

                        {/* English Text */}
                        <Text style={[styles.contentText, { color: c.text.primary }]}>
                            {currentContent.category === 'gratitude' ? currentContent.text : `"${currentContent.text}"`}
                        </Text>

                        {/* Source */}
                        <Text style={[styles.sourceText, { color: c.text.muted }]}>
                            — {currentContent.source}
                        </Text>

                        {/* Divider */}
                        <View style={[styles.cardDivider, { backgroundColor: c.border.subtle }]} />

                        {/* Action Buttons */}
                        <View style={styles.cardActions}>
                            <TouchableOpacity
                                onPress={() => navigateContent('prev')}
                                style={[styles.navButton, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="chevron-back" size={18} color={c.text.secondary} />
                            </TouchableOpacity>

                            <View style={styles.cardActionCenter}>
                                <TouchableOpacity
                                    onPress={() => toggleFavorite(currentContent.id)}
                                    style={[styles.actionButton, { backgroundColor: c.surface.glass }]}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name={isFavorited ? 'heart' : 'heart-outline'}
                                        size={20}
                                        color={isFavorited ? c.gold[400] : c.text.muted}
                                    />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => handleShare(currentContent)}
                                    style={[styles.actionButton, { backgroundColor: c.surface.glass }]}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="share-outline" size={20} color={c.text.muted} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => handleCopy(currentContent)}
                                    style={[styles.actionButton, { backgroundColor: c.surface.glass }]}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="copy-outline" size={20} color={c.text.muted} />
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                onPress={() => navigateContent('next')}
                                style={[styles.navButton, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="chevron-forward" size={18} color={c.text.secondary} />
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>
                </Animated.View>

                {/* ── Notification Settings ── */}
                <Animated.View entering={FadeInDown.duration(400).delay(300)}>
                    <Text style={[styles.sectionTitle, { color: c.text.primary }]}>
                        Notification Settings
                    </Text>

                    <View style={[styles.settingsCard, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}>
                        {/* Enable Toggle */}
                        <View style={styles.settingsRow}>
                            <View style={styles.settingsRowLeft}>
                                <View style={[styles.settingsIcon, { backgroundColor: c.surface.goldSubtle }]}>
                                    <Ionicons name="notifications" size={16} color={c.gold[400]} />
                                </View>
                                <View>
                                    <Text style={[styles.settingsLabel, { color: c.text.primary }]}>
                                        Daily Reminder
                                    </Text>
                                    <Text style={[styles.settingsDesc, { color: c.text.muted }]}>
                                        Get inspired every day
                                    </Text>
                                </View>
                            </View>
                            <Switch
                                value={reminderEnabled}
                                onValueChange={handleReminderToggle}
                                trackColor={{ false: c.obsidian[500], true: c.gold[500] + '60' }}
                                thumbColor={reminderEnabled ? c.gold[400] : c.obsidian[300]}
                                ios_backgroundColor={c.obsidian[500]}
                            />
                        </View>

                        {reminderEnabled && (
                            <>
                                {/* Time Selector */}
                                <View style={[styles.settingsDivider, { backgroundColor: c.border.subtle }]} />
                                <TouchableOpacity
                                    style={styles.settingsRow}
                                    onPress={() => setShowTimePicker(!showTimePicker)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.settingsRowLeft}>
                                        <View style={[styles.settingsIcon, { backgroundColor: c.surface.azureSubtle }]}>
                                            <Ionicons name="time" size={16} color={c.azure[400]} />
                                        </View>
                                        <View>
                                            <Text style={[styles.settingsLabel, { color: c.text.primary }]}>
                                                Reminder Time
                                            </Text>
                                            <Text style={[styles.settingsDesc, { color: c.text.muted }]}>
                                                {timeLabel}
                                            </Text>
                                        </View>
                                    </View>
                                    <Ionicons
                                        name={showTimePicker ? 'chevron-up' : 'chevron-down'}
                                        size={18}
                                        color={c.text.muted}
                                    />
                                </TouchableOpacity>

                                {showTimePicker && (
                                    <View style={styles.pickerGrid}>
                                        {TIME_OPTIONS.map((opt) => {
                                            const isSelected = reminderTime.hour === opt.hour && reminderTime.minute === opt.minute;
                                            return (
                                                <TouchableOpacity
                                                    key={opt.label}
                                                    onPress={() => handleTimeChange({ hour: opt.hour, minute: opt.minute })}
                                                    style={[
                                                        styles.pickerOption,
                                                        { borderColor: c.border.subtle, backgroundColor: c.surface.glass },
                                                        isSelected && { backgroundColor: c.surface.goldMedium, borderColor: c.gold[500] + '40' },
                                                    ]}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.pickerOptionText,
                                                            { color: c.text.secondary },
                                                            isSelected && { color: c.gold[400], fontWeight: '600' },
                                                        ]}
                                                    >
                                                        {opt.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                )}

                                {/* Category Selector */}
                                <View style={[styles.settingsDivider, { backgroundColor: c.border.subtle }]} />
                                <TouchableOpacity
                                    style={styles.settingsRow}
                                    onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.settingsRowLeft}>
                                        <View style={[styles.settingsIcon, { backgroundColor: c.surface.goldSubtle }]}>
                                            <Ionicons name="layers" size={16} color={c.gold[400]} />
                                        </View>
                                        <View>
                                            <Text style={[styles.settingsLabel, { color: c.text.primary }]}>
                                                Category
                                            </Text>
                                            <Text style={[styles.settingsDesc, { color: c.text.muted }]}>
                                                {getCategoryLabel(reminderCategory)}
                                            </Text>
                                        </View>
                                    </View>
                                    <Ionicons
                                        name={showCategoryPicker ? 'chevron-up' : 'chevron-down'}
                                        size={18}
                                        color={c.text.muted}
                                    />
                                </TouchableOpacity>

                                {showCategoryPicker && (
                                    <View style={styles.pickerGrid}>
                                        {CATEGORIES.map((cat) => {
                                            const isSelected = reminderCategory === cat.key;
                                            return (
                                                <TouchableOpacity
                                                    key={cat.key}
                                                    onPress={() => handleNotifCategoryChange(cat.key)}
                                                    style={[
                                                        styles.pickerOption,
                                                        { borderColor: c.border.subtle, backgroundColor: c.surface.glass },
                                                        isSelected && { backgroundColor: c.surface.goldMedium, borderColor: c.gold[500] + '40' },
                                                    ]}
                                                    activeOpacity={0.7}
                                                >
                                                    <Ionicons
                                                        name={cat.icon}
                                                        size={13}
                                                        color={isSelected ? c.gold[400] : c.text.muted}
                                                        style={{ marginRight: 4 }}
                                                    />
                                                    <Text
                                                        style={[
                                                            styles.pickerOptionText,
                                                            { color: c.text.secondary },
                                                            isSelected && { color: c.gold[400], fontWeight: '600' },
                                                        ]}
                                                    >
                                                        {cat.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                )}
                            </>
                        )}
                    </View>
                </Animated.View>

                {/* ── Favorites Section ── */}
                <Animated.View entering={FadeInDown.duration(400).delay(400)}>
                    <TouchableOpacity
                        style={styles.sectionHeader}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setShowFavorites(!showFavorites);
                        }}
                        activeOpacity={0.7}
                    >
                        <View style={styles.sectionHeaderLeft}>
                            <Ionicons name="heart" size={18} color={c.gold[400]} />
                            <Text style={[styles.sectionTitle, { color: c.text.primary, marginBottom: 0 }]}>
                                Favorites
                            </Text>
                            {favorites.length > 0 && (
                                <View style={[styles.badge, { backgroundColor: c.surface.goldSubtle }]}>
                                    <Text style={[styles.badgeText, { color: c.gold[400] }]}>
                                        {favorites.length}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <Ionicons
                            name={showFavorites ? 'chevron-up' : 'chevron-down'}
                            size={18}
                            color={c.text.muted}
                        />
                    </TouchableOpacity>

                    {showFavorites && (
                        <View style={styles.favoritesContainer}>
                            {favoriteItems.length === 0 ? (
                                <View style={[styles.emptyState, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}>
                                    <Ionicons name="heart-outline" size={32} color={c.text.muted + '60'} />
                                    <Text style={[styles.emptyStateText, { color: c.text.muted }]}>
                                        No favorites yet. Tap the heart icon to save content you love.
                                    </Text>
                                </View>
                            ) : (
                                favoriteItems.map((item) => (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={[styles.favoriteItem, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setCurrentContent(item);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.favoriteItemContent}>
                                            <View style={[styles.favCategoryDot, { backgroundColor: c.gold[500] + '40' }]}>
                                                <Ionicons
                                                    name={getCategoryIcon(item.category)}
                                                    size={12}
                                                    color={c.gold[400]}
                                                />
                                            </View>
                                            <View style={styles.favoriteItemText}>
                                                <Text
                                                    style={[styles.favoriteItemTitle, { color: c.text.primary }]}
                                                    numberOfLines={2}
                                                >
                                                    {item.text}
                                                </Text>
                                                <Text style={[styles.favoriteItemSource, { color: c.text.muted }]}>
                                                    {item.source}
                                                </Text>
                                            </View>
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => toggleFavorite(item.id)}
                                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                        >
                                            <Ionicons name="heart-dislike-outline" size={18} color={c.coral[400]} />
                                        </TouchableOpacity>
                                    </TouchableOpacity>
                                ))
                            )}
                        </View>
                    )}
                </Animated.View>

                {/* ── History Section ── */}
                {groupedHistory.length > 0 && (
                    <Animated.View entering={FadeInDown.duration(400).delay(500)}>
                        <View style={styles.sectionHeaderLeft}>
                            <Ionicons name="time" size={18} color={c.azure[400]} />
                            <Text style={[styles.sectionTitle, { color: c.text.primary, marginBottom: 0 }]}>
                                History
                            </Text>
                        </View>

                        {groupedHistory.map((group) => (
                            <View key={group.label} style={styles.historyGroup}>
                                <Text style={[styles.historyGroupLabel, { color: c.text.muted }]}>
                                    {group.label}
                                </Text>
                                {group.items.map((entry) => {
                                    const item = getContentById(entry.id);
                                    if (!item) return null;
                                    return (
                                        <TouchableOpacity
                                            key={`${entry.id}-${entry.date}`}
                                            style={[styles.historyItem, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                setCurrentContent(item);
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <View style={[styles.historyDot, { backgroundColor: c.gold[500] + '30' }]}>
                                                <Ionicons
                                                    name={getCategoryIcon(entry.category)}
                                                    size={11}
                                                    color={c.gold[400]}
                                                />
                                            </View>
                                            <View style={styles.historyItemContent}>
                                                <Text
                                                    style={[styles.historyItemText, { color: c.text.primary }]}
                                                    numberOfLines={1}
                                                >
                                                    {item.text}
                                                </Text>
                                                <Text style={[styles.historyItemMeta, { color: c.text.muted }]}>
                                                    {getCategoryLabel(entry.category)} · {getDateLabel(entry.date)}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        ))}
                    </Animated.View>
                )}

                {/* ── Footer ── */}
                <Animated.View entering={FadeIn.duration(300).delay(600)} style={styles.footer}>
                    <Ionicons name="information-circle-outline" size={14} color={c.text.muted} />
                    <Text style={[styles.footerText, { color: c.text.muted }]}>
                        Content refreshes daily. {ALL_CONTENT.length} items across {CATEGORIES.length - 1} categories.
                    </Text>
                </Animated.View>
            </ScrollView>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingTop: spacing.md,
    },

    // ── Category Pills ──
    categoryRow: {
        paddingHorizontal: spacing.lg,
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    categoryPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 20,
        borderWidth: 1,
        gap: 6,
    },
    categoryPillText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '500',
    },
    categoryCount: {
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 8,
    },
    categoryCountText: {
        fontSize: 10,
        fontWeight: '600',
    },

    // ── Main Card ──
    mainCard: {
        marginHorizontal: spacing.lg,
        borderRadius: 22,
        padding: spacing.xl,
        borderWidth: 1,
        overflow: 'hidden',
        marginBottom: spacing.xl,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.lg,
    },
    cardCategoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: 12,
        gap: 5,
    },
    cardCategoryText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    cardTagBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 8,
        borderWidth: 1,
    },
    cardTagText: {
        fontSize: 10,
        fontWeight: '500',
        textTransform: 'capitalize',
    },
    arabicText: {
        fontSize: 26,
        lineHeight: 44,
        textAlign: 'right',
        fontWeight: '400',
        marginBottom: spacing.lg,
        writingDirection: 'rtl',
    },
    contentText: {
        fontSize: typography.fontSize.lg,
        lineHeight: 28,
        fontWeight: '500',
        marginBottom: spacing.md,
    },
    sourceText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '500',
        marginBottom: spacing.lg,
    },
    cardDivider: {
        height: 1,
        marginBottom: spacing.md,
    },
    cardActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    navButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardActionCenter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    actionButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Settings ──
    sectionTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
    },
    settingsCard: {
        marginHorizontal: spacing.lg,
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
        marginBottom: spacing.xl,
    },
    settingsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md + 2,
    },
    settingsRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        flex: 1,
    },
    settingsIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingsLabel: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
    },
    settingsDesc: {
        fontSize: typography.fontSize.xs,
        marginTop: 1,
    },
    settingsDivider: {
        height: 1,
        marginHorizontal: spacing.lg,
    },
    pickerGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.md,
        gap: spacing.sm,
    },
    pickerOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 12,
        borderWidth: 1,
    },
    pickerOptionText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '500',
    },

    // ── Favorites ──
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    sectionHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.md,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    favoritesContainer: {
        paddingHorizontal: spacing.lg,
        gap: spacing.sm,
        marginBottom: spacing.xl,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing['2xl'],
        paddingHorizontal: spacing.xl,
        borderRadius: 16,
        borderWidth: 1,
        gap: spacing.md,
    },
    emptyStateText: {
        fontSize: typography.fontSize.sm,
        textAlign: 'center',
        lineHeight: 20,
    },
    favoriteItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderRadius: 14,
        borderWidth: 1,
    },
    favoriteItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: spacing.md,
    },
    favCategoryDot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    favoriteItemText: {
        flex: 1,
    },
    favoriteItemTitle: {
        fontSize: typography.fontSize.sm,
        fontWeight: '500',
        lineHeight: 20,
    },
    favoriteItemSource: {
        fontSize: 11,
        marginTop: 2,
    },

    // ── History ──
    historyGroup: {
        marginBottom: spacing.lg,
    },
    historyGroupLabel: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginHorizontal: spacing.lg,
        marginBottom: spacing.sm,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        marginHorizontal: spacing.lg,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: spacing.xs,
    },
    historyDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    historyItemContent: {
        flex: 1,
    },
    historyItemText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '500',
    },
    historyItemMeta: {
        fontSize: 11,
        marginTop: 2,
    },

    // ── Footer ──
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: spacing.xl,
        paddingHorizontal: spacing.lg,
    },
    footerText: {
        fontSize: typography.fontSize.xs,
    },
});
