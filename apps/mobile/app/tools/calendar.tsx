// ============================================
// Personal Calendar — Events, Birthdays & Reminders
// Full-featured calendar with local notifications
// ============================================

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Modal,
    Alert,
    Dimensions,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import Animated, { FadeInDown, FadeIn, FadeInUp } from 'react-native-reanimated';
import { colors, typography, spacing, shadows } from '@zerog/ui';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScreenHeader } from '../../components';

// ─── Constants ────────────────────────────────────────────────────
const STORAGE_KEY = '@0g-calendar-events';
const SCREEN_WIDTH = Dimensions.get('window').width;
const DAY_SIZE = Math.floor((SCREEN_WIDTH - spacing.lg * 2 - 6 * 4) / 7);
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

// ─── Types ────────────────────────────────────────────────────────
type EventType = 'event' | 'birthday' | 'reminder' | 'anniversary';
type AlertOption = 'none' | 'at_time' | '15_min' | '1_hour' | '1_day';
type RepeatOption = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

interface CalendarEvent {
    id: string;
    title: string;
    description: string;
    date: string;        // ISO date string
    time: string;        // HH:MM format
    type: EventType;
    alert: AlertOption;
    repeat: RepeatOption;
    color: string;
    notificationId: string | null;
    birthYear?: number;  // For birthday age calculation
}

// ─── Preset Colors ────────────────────────────────────────────────
const COLOR_PRESETS = [
    colors.gold[500],
    colors.coral[500],
    colors.emerald[500],
    colors.azure[500],
    colors.amber[500],
    '#A855F7',  // purple
    '#EC4899',  // pink
    '#7C8FFF',  // bright blue
];

// ─── Event Type Config ────────────────────────────────────────────
const EVENT_TYPE_CONFIG: Record<EventType, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
    event:       { label: 'Event',       icon: 'calendar-outline',  color: colors.azure[400] },
    birthday:    { label: 'Birthday',    icon: 'gift-outline',      color: colors.coral[400] },
    reminder:    { label: 'Reminder',    icon: 'alarm-outline',     color: colors.amber[400] },
    anniversary: { label: 'Anniversary', icon: 'heart-outline',     color: colors.coral[300] },
};

const ALERT_OPTIONS: { value: AlertOption; label: string }[] = [
    { value: 'none',    label: 'None' },
    { value: 'at_time', label: 'At time of event' },
    { value: '15_min',  label: '15 minutes before' },
    { value: '1_hour',  label: '1 hour before' },
    { value: '1_day',   label: '1 day before' },
];

const REPEAT_OPTIONS: { value: RepeatOption; label: string }[] = [
    { value: 'none',    label: 'None' },
    { value: 'daily',   label: 'Daily' },
    { value: 'weekly',  label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly',  label: 'Yearly' },
];

// ─── Helpers ──────────────────────────────────────────────────────
function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
    return new Date(year, month, 1).getDay();
}

function formatDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatTime12h(time: string): string {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function dateKey(year: number, month: number, day: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function calculateAge(birthYear: number): number {
    return new Date().getFullYear() - birthYear;
}

function getAlertTriggerSeconds(alert: AlertOption): number | null {
    switch (alert) {
        case 'at_time': return 0;
        case '15_min':  return 15 * 60;
        case '1_hour':  return 60 * 60;
        case '1_day':   return 24 * 60 * 60;
        default:        return null;
    }
}

// ─── Main Screen ──────────────────────────────────────────────────
export default function CalendarScreen() {
    const insets = useSafeAreaInsets();
    const today = new Date();
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [selectedDate, setSelectedDate] = useState(formatDate(today));
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

    // Form state
    const [formTitle, setFormTitle] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formDate, setFormDate] = useState(formatDate(today));
    const [formTime, setFormTime] = useState('12:00');
    const [formType, setFormType] = useState<EventType>('event');
    const [formAlert, setFormAlert] = useState<AlertOption>('none');
    const [formRepeat, setFormRepeat] = useState<RepeatOption>('none');
    const [formColor, setFormColor] = useState(COLOR_PRESETS[0]);
    const [formBirthYear, setFormBirthYear] = useState('');

    const scrollRef = useRef<ScrollView>(null);

    // ─── Persistence ──────────────────────────────────────────────
    useEffect(() => {
        (async () => {
            try {
                const stored = await AsyncStorage.getItem(STORAGE_KEY);
                if (stored) {
                    try { setEvents(JSON.parse(stored)); } catch { /* corrupted data — start fresh */ }
                }
            } catch { /* storage read failure — start fresh */ }
        })();
    }, []);

    const persistEvents = useCallback(async (updated: CalendarEvent[]) => {
        setEvents(updated);
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch { /* storage write failure — events still in memory */ }
    }, []);

    // ─── Notifications ────────────────────────────────────────────
    const scheduleNotification = useCallback(async (event: CalendarEvent): Promise<string | null> => {
        const offsetSeconds = getAlertTriggerSeconds(event.alert);
        if (offsetSeconds === null) return null;

        try {
            const { status } = await Notifications.requestPermissionsAsync();
            if (status !== 'granted') return null;

            const [year, month, day] = event.date.split('-').map(Number);
            const [hour, minute] = event.time.split(':').map(Number);
            const eventDate = new Date(year, month - 1, day, hour, minute);
            const triggerDate = new Date(eventDate.getTime() - offsetSeconds * 1000);

            if (triggerDate <= new Date()) return null;

            const typeConfig = EVENT_TYPE_CONFIG[event.type];
            const notifId = await Notifications.scheduleNotificationAsync({
                content: {
                    title: `${typeConfig.label}: ${event.title}`,
                    body: event.description || `Scheduled for ${formatTime12h(event.time)}`,
                    sound: true,
                    data: { calendarEventId: event.id },
                },
                trigger: { date: triggerDate },
            });
            return notifId;
        } catch {
            return null;
        }
    }, []);

    const cancelNotification = useCallback(async (notificationId: string | null) => {
        if (!notificationId) return;
        try {
            await Notifications.cancelScheduledNotificationAsync(notificationId);
        } catch { /* notification may have already fired */ }
    }, []);

    // ─── Calendar Grid Data ───────────────────────────────────────
    const calendarDays = useMemo(() => {
        const daysInMonth = getDaysInMonth(currentYear, currentMonth);
        const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
        const days: (number | null)[] = [];

        for (let i = 0; i < firstDay; i++) days.push(null);
        for (let d = 1; d <= daysInMonth; d++) days.push(d);

        return days;
    }, [currentYear, currentMonth]);

    const eventsByDate = useMemo(() => {
        const map: Record<string, CalendarEvent[]> = {};
        for (const ev of events) {
            const key = ev.date;
            if (!map[key]) map[key] = [];
            map[key].push(ev);
        }
        return map;
    }, [events]);

    const selectedDayEvents = useMemo(() => {
        return (eventsByDate[selectedDate] || []).sort((a, b) => a.time.localeCompare(b.time));
    }, [eventsByDate, selectedDate]);

    const upcomingEvents = useMemo(() => {
        const todayStr = formatDate(today);
        return events
            .filter((e) => e.date >= todayStr)
            .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
            .slice(0, 10);
    }, [events, today]);

    // ─── Month Navigation ─────────────────────────────────────────
    const goToPrevMonth = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear((y) => y - 1);
        } else {
            setCurrentMonth((m) => m - 1);
        }
    }, [currentMonth]);

    const goToNextMonth = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear((y) => y + 1);
        } else {
            setCurrentMonth((m) => m + 1);
        }
    }, [currentMonth]);

    const goToToday = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCurrentYear(today.getFullYear());
        setCurrentMonth(today.getMonth());
        setSelectedDate(formatDate(today));
    }, [today]);

    // ─── Form Handlers ────────────────────────────────────────────
    const resetForm = useCallback(() => {
        setFormTitle('');
        setFormDescription('');
        setFormDate(selectedDate);
        setFormTime('12:00');
        setFormType('event');
        setFormAlert('none');
        setFormRepeat('none');
        setFormColor(COLOR_PRESETS[0]);
        setFormBirthYear('');
        setEditingEvent(null);
    }, [selectedDate]);

    const openAddModal = useCallback(() => {
        resetForm();
        setShowModal(true);
    }, [resetForm]);

    const openEditModal = useCallback((event: CalendarEvent) => {
        setEditingEvent(event);
        setFormTitle(event.title);
        setFormDescription(event.description);
        setFormDate(event.date);
        setFormTime(event.time);
        setFormType(event.type);
        setFormAlert(event.alert);
        setFormRepeat(event.repeat);
        setFormColor(event.color);
        setFormBirthYear(event.birthYear ? String(event.birthYear) : '');
        setShowModal(true);
    }, []);

    const handleSave = useCallback(async () => {
        if (!formTitle.trim()) {
            Alert.alert('Missing Title', 'Please enter a title for your event.');
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const eventData: CalendarEvent = {
            id: editingEvent?.id || generateId(),
            title: formTitle.trim(),
            description: formDescription.trim(),
            date: formDate,
            time: formTime,
            type: formType,
            alert: formAlert,
            repeat: formType === 'birthday' ? 'yearly' : formRepeat,
            color: formColor,
            notificationId: null,
            birthYear: formType === 'birthday' && formBirthYear ? parseInt(formBirthYear, 10) : undefined,
        };

        // Cancel old notification if editing
        if (editingEvent?.notificationId) {
            await cancelNotification(editingEvent.notificationId);
        }

        // Schedule new notification
        eventData.notificationId = await scheduleNotification(eventData);

        const updated = editingEvent
            ? events.map((e) => (e.id === editingEvent.id ? eventData : e))
            : [...events, eventData];

        await persistEvents(updated);
        setShowModal(false);
        resetForm();
    }, [
        formTitle, formDescription, formDate, formTime, formType,
        formAlert, formRepeat, formColor, formBirthYear,
        editingEvent, events, persistEvents, scheduleNotification,
        cancelNotification, resetForm,
    ]);

    const handleDelete = useCallback(async (event: CalendarEvent) => {
        Alert.alert('Delete Event', `Delete "${event.title}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    await cancelNotification(event.notificationId);
                    const updated = events.filter((e) => e.id !== event.id);
                    await persistEvents(updated);
                },
            },
        ]);
    }, [events, persistEvents, cancelNotification]);

    // ─── Auto-set birthday defaults ───────────────────────────────
    useEffect(() => {
        if (formType === 'birthday') {
            setFormRepeat('yearly');
        }
    }, [formType]);

    // ─── Time Picker Helpers ──────────────────────────────────────
    const adjustHour = useCallback((delta: number) => {
        const [h, m] = formTime.split(':').map(Number);
        const newH = (h + delta + 24) % 24;
        setFormTime(`${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }, [formTime]);

    const adjustMinute = useCallback((delta: number) => {
        const [h, m] = formTime.split(':').map(Number);
        const newM = (m + delta + 60) % 60;
        setFormTime(`${String(h).padStart(2, '0')}:${String(newM).padStart(2, '0')}`);
    }, [formTime]);

    // ─── Date Picker Helpers ──────────────────────────────────────
    const adjustFormDate = useCallback((deltaDays: number) => {
        const [y, mo, d] = formDate.split('-').map(Number);
        const dt = new Date(y, mo - 1, d + deltaDays);
        setFormDate(formatDate(dt));
    }, [formDate]);

    // ─── Render ───────────────────────────────────────────────────
    const todayStr = formatDate(today);
    const isToday = (day: number) =>
        day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />

            <ScreenHeader
                title="Calendar"
                rightElement={
                    <TouchableOpacity onPress={openAddModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="add-circle" size={28} color={colors.gold[400]} />
                    </TouchableOpacity>
                }
            />

            <ScrollView
                ref={scrollRef}
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Month Header ── */}
                <Animated.View entering={FadeInDown.duration(400)} style={styles.monthHeader}>
                    <TouchableOpacity onPress={goToPrevMonth} style={styles.navButton}>
                        <Ionicons name="chevron-back" size={22} color={colors.text.secondary} />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={goToToday} activeOpacity={0.7}>
                        <Text style={styles.monthTitle}>{MONTHS[currentMonth]} {currentYear}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
                        <Ionicons name="chevron-forward" size={22} color={colors.text.secondary} />
                    </TouchableOpacity>
                </Animated.View>

                {/* ── Weekday Labels ── */}
                <View style={styles.weekdayRow}>
                    {WEEKDAYS.map((d) => (
                        <View key={d} style={styles.weekdayCell}>
                            <Text style={styles.weekdayText}>{d}</Text>
                        </View>
                    ))}
                </View>

                {/* ── Calendar Grid ── */}
                <Animated.View entering={FadeIn.duration(300)} style={styles.calendarGrid}>
                    {calendarDays.map((day, idx) => {
                        if (day === null) {
                            return <View key={`empty-${idx}`} style={styles.dayCell} />;
                        }

                        const key = dateKey(currentYear, currentMonth, day);
                        const isSelected = key === selectedDate;
                        const isTodayCell = isToday(day);
                        const dayEvents = eventsByDate[key] || [];
                        const hasEvents = dayEvents.length > 0;

                        return (
                            <TouchableOpacity
                                key={key}
                                style={[
                                    styles.dayCell,
                                    isSelected && styles.dayCellSelected,
                                    isTodayCell && !isSelected && styles.dayCellToday,
                                ]}
                                onPress={() => {
                                    Haptics.selectionAsync();
                                    setSelectedDate(key);
                                }}
                                activeOpacity={0.6}
                            >
                                <Text
                                    style={[
                                        styles.dayText,
                                        isSelected && styles.dayTextSelected,
                                        isTodayCell && !isSelected && styles.dayTextToday,
                                    ]}
                                >
                                    {day}
                                </Text>
                                {hasEvents && (
                                    <View style={styles.dotRow}>
                                        {dayEvents.slice(0, 3).map((ev, i) => (
                                            <View
                                                key={ev.id}
                                                style={[styles.eventDot, { backgroundColor: ev.color }]}
                                            />
                                        ))}
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </Animated.View>

                {/* ── Selected Day Events ── */}
                <Animated.View entering={FadeInDown.duration(350).delay(100)} style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>
                            {selectedDate === todayStr ? 'Today' : selectedDate}
                        </Text>
                        <Text style={styles.sectionCount}>
                            {selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? 's' : ''}
                        </Text>
                    </View>

                    {selectedDayEvents.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="calendar-outline" size={32} color={colors.text.muted} />
                            <Text style={styles.emptyText}>No events this day</Text>
                            <TouchableOpacity style={styles.emptyAddButton} onPress={openAddModal}>
                                <Ionicons name="add" size={16} color={colors.gold[400]} />
                                <Text style={styles.emptyAddText}>Add Event</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        selectedDayEvents.map((event, i) => (
                            <EventCard
                                key={event.id}
                                event={event}
                                index={i}
                                onEdit={openEditModal}
                                onDelete={handleDelete}
                            />
                        ))
                    )}
                </Animated.View>

                {/* ── Upcoming Events ── */}
                {upcomingEvents.length > 0 && (
                    <Animated.View entering={FadeInDown.duration(350).delay(200)} style={styles.section}>
                        <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionTitle}>Upcoming</Text>
                            <Ionicons name="arrow-forward" size={16} color={colors.text.muted} />
                        </View>

                        {upcomingEvents.map((event, i) => (
                            <EventCard
                                key={event.id}
                                event={event}
                                index={i}
                                onEdit={openEditModal}
                                onDelete={handleDelete}
                                showDate
                            />
                        ))}
                    </Animated.View>
                )}
            </ScrollView>

            {/* ── Add/Edit Modal ── */}
            <Modal visible={showModal} animationType="slide" transparent statusBarTranslucent>
                <View style={styles.modalOverlay}>
                    <Animated.View
                        entering={FadeInUp.duration(350)}
                        style={[styles.modalContent, { paddingBottom: insets.bottom + spacing.lg }]}
                    >
                        <LinearGradient
                            colors={[colors.obsidian[700], colors.obsidian[800]]}
                            style={StyleSheet.absoluteFill}
                        />

                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}>
                                <Text style={styles.modalCancel}>Cancel</Text>
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>
                                {editingEvent ? 'Edit Event' : 'New Event'}
                            </Text>
                            <TouchableOpacity onPress={handleSave}>
                                <Text style={styles.modalSave}>Save</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
                            {/* Title */}
                            <Text style={styles.fieldLabel}>Title</Text>
                            <TextInput
                                style={styles.textInput}
                                value={formTitle}
                                onChangeText={setFormTitle}
                                placeholder="Event title"
                                placeholderTextColor={colors.text.muted}
                                autoFocus
                            />

                            {/* Event Type */}
                            <Text style={styles.fieldLabel}>Type</Text>
                            <View style={styles.chipRow}>
                                {(Object.keys(EVENT_TYPE_CONFIG) as EventType[]).map((type) => {
                                    const cfg = EVENT_TYPE_CONFIG[type];
                                    const active = formType === type;
                                    return (
                                        <TouchableOpacity
                                            key={type}
                                            style={[styles.chip, active && { backgroundColor: cfg.color + '25', borderColor: cfg.color + '50' }]}
                                            onPress={() => setFormType(type)}
                                        >
                                            <Ionicons name={cfg.icon} size={14} color={active ? cfg.color : colors.text.muted} />
                                            <Text style={[styles.chipText, active && { color: cfg.color }]}>{cfg.label}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Birthday Year */}
                            {formType === 'birthday' && (
                                <>
                                    <Text style={styles.fieldLabel}>Birth Year (for age)</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        value={formBirthYear}
                                        onChangeText={setFormBirthYear}
                                        placeholder="e.g. 1995"
                                        placeholderTextColor={colors.text.muted}
                                        keyboardType="number-pad"
                                        maxLength={4}
                                    />
                                    {formBirthYear && parseInt(formBirthYear, 10) > 1900 && (
                                        <Text style={styles.ageHint}>
                                            Turns {calculateAge(parseInt(formBirthYear, 10))} this year
                                        </Text>
                                    )}
                                </>
                            )}

                            {/* Date */}
                            <Text style={styles.fieldLabel}>Date</Text>
                            <View style={styles.pickerRow}>
                                <TouchableOpacity style={styles.pickerArrow} onPress={() => adjustFormDate(-1)}>
                                    <Ionicons name="chevron-back" size={18} color={colors.text.secondary} />
                                </TouchableOpacity>
                                <View style={styles.pickerValue}>
                                    <Text style={styles.pickerValueText}>{formDate}</Text>
                                </View>
                                <TouchableOpacity style={styles.pickerArrow} onPress={() => adjustFormDate(1)}>
                                    <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} />
                                </TouchableOpacity>
                            </View>

                            {/* Time */}
                            <Text style={styles.fieldLabel}>Time</Text>
                            <View style={styles.timePickerRow}>
                                <View style={styles.timeUnit}>
                                    <TouchableOpacity style={styles.timeArrow} onPress={() => adjustHour(1)}>
                                        <Ionicons name="chevron-up" size={18} color={colors.text.secondary} />
                                    </TouchableOpacity>
                                    <Text style={styles.timeValue}>{formTime.split(':')[0]}</Text>
                                    <TouchableOpacity style={styles.timeArrow} onPress={() => adjustHour(-1)}>
                                        <Ionicons name="chevron-down" size={18} color={colors.text.secondary} />
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.timeColon}>:</Text>
                                <View style={styles.timeUnit}>
                                    <TouchableOpacity style={styles.timeArrow} onPress={() => adjustMinute(5)}>
                                        <Ionicons name="chevron-up" size={18} color={colors.text.secondary} />
                                    </TouchableOpacity>
                                    <Text style={styles.timeValue}>{formTime.split(':')[1]}</Text>
                                    <TouchableOpacity style={styles.timeArrow} onPress={() => adjustMinute(-5)}>
                                        <Ionicons name="chevron-down" size={18} color={colors.text.secondary} />
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.timeAmPm}>
                                    {parseInt(formTime.split(':')[0], 10) >= 12 ? 'PM' : 'AM'}
                                </Text>
                            </View>

                            {/* Description */}
                            <Text style={styles.fieldLabel}>Description (optional)</Text>
                            <TextInput
                                style={[styles.textInput, styles.textArea]}
                                value={formDescription}
                                onChangeText={setFormDescription}
                                placeholder="Add notes..."
                                placeholderTextColor={colors.text.muted}
                                multiline
                                numberOfLines={3}
                            />

                            {/* Alert */}
                            <Text style={styles.fieldLabel}>Alert</Text>
                            <View style={styles.chipRow}>
                                {ALERT_OPTIONS.map((opt) => (
                                    <TouchableOpacity
                                        key={opt.value}
                                        style={[styles.chip, formAlert === opt.value && styles.chipActive]}
                                        onPress={() => setFormAlert(opt.value)}
                                    >
                                        <Text style={[styles.chipText, formAlert === opt.value && styles.chipTextActive]}>
                                            {opt.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Repeat */}
                            <Text style={styles.fieldLabel}>Repeat</Text>
                            <View style={styles.chipRow}>
                                {REPEAT_OPTIONS.map((opt) => {
                                    const disabled = formType === 'birthday' && opt.value !== 'yearly';
                                    return (
                                        <TouchableOpacity
                                            key={opt.value}
                                            style={[
                                                styles.chip,
                                                formRepeat === opt.value && styles.chipActive,
                                                disabled && styles.chipDisabled,
                                            ]}
                                            onPress={() => !disabled && setFormRepeat(opt.value)}
                                            disabled={disabled}
                                        >
                                            <Text style={[
                                                styles.chipText,
                                                formRepeat === opt.value && styles.chipTextActive,
                                                disabled && styles.chipTextDisabled,
                                            ]}>
                                                {opt.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Color */}
                            <Text style={styles.fieldLabel}>Color Tag</Text>
                            <View style={styles.colorRow}>
                                {COLOR_PRESETS.map((c) => (
                                    <TouchableOpacity
                                        key={c}
                                        style={[
                                            styles.colorSwatch,
                                            { backgroundColor: c },
                                            formColor === c && styles.colorSwatchSelected,
                                        ]}
                                        onPress={() => setFormColor(c)}
                                    >
                                        {formColor === c && (
                                            <Ionicons name="checkmark" size={14} color="#fff" />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    </Animated.View>
                </View>
            </Modal>
        </View>
    );
}

// ─── Event Card Component ─────────────────────────────────────────
function EventCard({
    event,
    index,
    onEdit,
    onDelete,
    showDate = false,
}: {
    event: CalendarEvent;
    index: number;
    onEdit: (e: CalendarEvent) => void;
    onDelete: (e: CalendarEvent) => void;
    showDate?: boolean;
}) {
    const typeConfig = EVENT_TYPE_CONFIG[event.type];
    const ageText = event.type === 'birthday' && event.birthYear
        ? ` — turns ${calculateAge(event.birthYear)}`
        : '';

    return (
        <Animated.View entering={FadeInDown.duration(300).delay(index * 60)}>
            <TouchableOpacity
                style={styles.eventCard}
                onPress={() => onEdit(event)}
                onLongPress={() => onDelete(event)}
                activeOpacity={0.7}
                accessibilityLabel={`${event.title}, ${typeConfig.label} at ${formatTime12h(event.time)}`}
                accessibilityHint="Tap to edit, long press to delete"
            >
                <LinearGradient
                    colors={[event.color + '12', 'transparent']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />

                {/* Color accent bar */}
                <View style={[styles.eventAccent, { backgroundColor: event.color }]} />

                {/* Icon */}
                <View style={[styles.eventIcon, { backgroundColor: event.color + '20' }]}>
                    <Ionicons name={typeConfig.icon} size={18} color={event.color} />
                </View>

                {/* Info */}
                <View style={styles.eventInfo}>
                    <Text style={styles.eventTitle} numberOfLines={1}>{event.title}{ageText}</Text>
                    <View style={styles.eventMeta}>
                        <Ionicons name="time-outline" size={11} color={colors.text.muted} />
                        <Text style={styles.eventMetaText}>{formatTime12h(event.time)}</Text>
                        {showDate && (
                            <>
                                <Ionicons name="calendar-outline" size={11} color={colors.text.muted} style={{ marginLeft: 6 }} />
                                <Text style={styles.eventMetaText}>{event.date}</Text>
                            </>
                        )}
                        {event.repeat !== 'none' && (
                            <>
                                <Ionicons name="repeat" size={11} color={colors.text.muted} style={{ marginLeft: 6 }} />
                                <Text style={styles.eventMetaText}>{event.repeat}</Text>
                            </>
                        )}
                    </View>
                    {event.description ? (
                        <Text style={styles.eventDesc} numberOfLines={1}>{event.description}</Text>
                    ) : null}
                </View>

                {/* Alert indicator */}
                {event.alert !== 'none' && (
                    <View style={styles.alertBadge}>
                        <Ionicons name="notifications" size={12} color={colors.gold[400]} />
                    </View>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },

    // ── Month Header ──
    monthHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
    },
    navButton: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: colors.surface.glass,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        alignItems: 'center',
        justifyContent: 'center',
    },
    monthTitle: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: '700',
        color: colors.text.primary,
        fontFamily: 'Inter-Bold',
    },

    // ── Weekday Row ──
    weekdayRow: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.sm,
    },
    weekdayCell: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: spacing.xs,
    },
    weekdayText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    // ── Calendar Grid ──
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.lg,
    },
    dayCell: {
        width: `${100 / 7}%` as any,
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
    },
    dayCellSelected: {
        backgroundColor: colors.gold[500] + '20',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.gold[500] + '40',
    },
    dayCellToday: {
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.gold[500] + '30',
    },
    dayText: {
        fontSize: typography.fontSize.base,
        fontWeight: '500',
        color: colors.text.secondary,
    },
    dayTextSelected: {
        color: colors.gold[400],
        fontWeight: '700',
    },
    dayTextToday: {
        color: colors.gold[400],
        fontWeight: '700',
    },
    dotRow: {
        flexDirection: 'row',
        gap: 2,
        marginTop: 2,
        height: 5,
    },
    eventDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
    },

    // ── Sections ──
    section: {
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.xl,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    sectionTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: colors.text.primary,
        fontFamily: 'Inter-Bold',
    },
    sectionCount: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
    },

    // ── Empty State ──
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing['2xl'],
        gap: spacing.sm,
    },
    emptyText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
    },
    emptyAddButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: 20,
        backgroundColor: colors.surface.goldSubtle,
        borderWidth: 1,
        borderColor: colors.gold[500] + '25',
        marginTop: spacing.sm,
    },
    emptyAddText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.gold[400],
    },

    // ── Event Card ──
    eventCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface.glass,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        padding: spacing.md,
        marginBottom: spacing.sm,
        overflow: 'hidden',
        position: 'relative',
    },
    eventAccent: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        borderTopLeftRadius: 16,
        borderBottomLeftRadius: 16,
    },
    eventIcon: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: spacing.xs,
    },
    eventInfo: {
        flex: 1,
        marginLeft: spacing.md,
    },
    eventTitle: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
    },
    eventMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        marginTop: 3,
    },
    eventMetaText: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
    },
    eventDesc: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        marginTop: 2,
        fontStyle: 'italic',
    },
    alertBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.surface.goldSubtle,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Modal ──
    modalOverlay: {
        flex: 1,
        backgroundColor: colors.surface.overlayHeavy,
        justifyContent: 'flex-end',
    },
    modalContent: {
        maxHeight: '92%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xl,
        paddingBottom: spacing.md,
    },
    modalCancel: {
        fontSize: typography.fontSize.base,
        color: colors.text.muted,
    },
    modalTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: colors.text.primary,
        fontFamily: 'Inter-Bold',
    },
    modalSave: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        color: colors.gold[400],
    },
    modalScroll: {
        paddingHorizontal: spacing.xl,
    },

    // ── Form Fields ──
    fieldLabel: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
    },
    textInput: {
        backgroundColor: colors.surface.glass,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        borderRadius: 12,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        fontSize: typography.fontSize.base,
        color: colors.text.primary,
    },
    textArea: {
        minHeight: 70,
        textAlignVertical: 'top',
    },
    ageHint: {
        fontSize: typography.fontSize.xs,
        color: colors.gold[400],
        marginTop: spacing.xs,
        fontStyle: 'italic',
    },

    // ── Chips ──
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 20,
        backgroundColor: colors.surface.glass,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    chipActive: {
        backgroundColor: colors.gold[500] + '20',
        borderColor: colors.gold[500] + '40',
    },
    chipDisabled: {
        opacity: 0.4,
    },
    chipText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.text.muted,
    },
    chipTextActive: {
        color: colors.gold[400],
    },
    chipTextDisabled: {
        color: colors.text.muted,
    },

    // ── Color Picker ──
    colorRow: {
        flexDirection: 'row',
        gap: spacing.md,
        flexWrap: 'wrap',
    },
    colorSwatch: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    colorSwatchSelected: {
        borderWidth: 2,
        borderColor: '#fff',
        ...shadows.glow,
    },

    // ── Date Picker ──
    pickerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    pickerArrow: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: colors.surface.glass,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pickerValue: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderRadius: 12,
        backgroundColor: colors.surface.glass,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    pickerValueText: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
    },

    // ── Time Picker ──
    timePickerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    timeUnit: {
        alignItems: 'center',
        gap: spacing.xs,
    },
    timeArrow: {
        width: 36,
        height: 28,
        borderRadius: 8,
        backgroundColor: colors.surface.glass,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        alignItems: 'center',
        justifyContent: 'center',
    },
    timeValue: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: '700',
        color: colors.text.primary,
        fontFamily: 'Inter-Bold',
        minWidth: 44,
        textAlign: 'center',
    },
    timeColon: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: '700',
        color: colors.text.muted,
        marginBottom: 2,
    },
    timeAmPm: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.gold[400],
        marginLeft: spacing.sm,
    },
});
