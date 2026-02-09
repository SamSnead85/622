import { TouchableOpacity, View, Image, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '@zerog/ui';

interface StoryRingProps {
    id: string;
    name: string;
    avatarUrl?: string;
    hasStory: boolean;
    isOwn?: boolean;
    isSeen?: boolean;
    onPress: () => void;
}

export function StoryRing({
    id,
    name,
    avatarUrl,
    hasStory,
    isOwn = false,
    isSeen = false,
    onPress,
}: StoryRingProps) {
    const ringColors = hasStory && !isSeen
        ? [colors.gold[400], colors.gold[600], colors.coral[500]]
        : hasStory && isSeen
            ? [colors.obsidian[500], colors.obsidian[600]]
            : ['transparent', 'transparent'];

    return (
        <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
            <View style={styles.ringWrapper}>
                {hasStory ? (
                    <LinearGradient
                        colors={ringColors as any}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.ring}
                    >
                        <View style={styles.ringInner}>
                            {avatarUrl ? (
                                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                    <Text style={styles.avatarLetter}>
                                        {name?.charAt(0).toUpperCase() || '?'}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </LinearGradient>
                ) : (
                    <View style={styles.noRing}>
                        {avatarUrl ? (
                            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                <Text style={styles.avatarLetter}>
                                    {name?.charAt(0).toUpperCase() || '?'}
                                </Text>
                            </View>
                        )}
                    </View>
                )}
                {isOwn && (
                    <View style={styles.addBadge}>
                        <Ionicons name="add" size={12} color="#fff" />
                    </View>
                )}
            </View>
            <Text style={styles.name} numberOfLines={1}>
                {isOwn ? 'Your Story' : name.split(' ')[0]}
            </Text>
        </TouchableOpacity>
    );
}

export function StoryRingList({
    stories,
    currentUserId,
    userAvatarUrl,
    userName,
    onStoryPress,
    onCreatePress,
}: {
    stories: Array<{ userId: string; displayName: string; avatarUrl?: string; isSeen?: boolean }>;
    currentUserId?: string;
    userAvatarUrl?: string;
    userName?: string;
    onStoryPress: (userId: string) => void;
    onCreatePress: () => void;
}) {
    const hasOwnStory = stories.some((s) => s.userId === currentUserId);

    return (
        <View style={styles.listContainer}>
            {/* Own story / create button */}
            <StoryRing
                id={currentUserId || 'self'}
                name={userName || 'You'}
                avatarUrl={userAvatarUrl}
                hasStory={hasOwnStory}
                isOwn={true}
                isSeen={hasOwnStory ? stories.find((s) => s.userId === currentUserId)?.isSeen : false}
                onPress={hasOwnStory ? () => onStoryPress(currentUserId!) : onCreatePress}
            />

            {/* Others' stories */}
            {stories
                .filter((s) => s.userId !== currentUserId)
                .map((story) => (
                    <StoryRing
                        key={story.userId}
                        id={story.userId}
                        name={story.displayName}
                        avatarUrl={story.avatarUrl}
                        hasStory={true}
                        isSeen={story.isSeen}
                        onPress={() => onStoryPress(story.userId)}
                    />
                ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { alignItems: 'center', width: 72, marginRight: spacing.sm },
    ringWrapper: { position: 'relative', marginBottom: 4 },
    ring: {
        width: 60, height: 60, borderRadius: 30,
        alignItems: 'center', justifyContent: 'center',
    },
    ringInner: {
        width: 54, height: 54, borderRadius: 27,
        backgroundColor: colors.obsidian[900],
        alignItems: 'center', justifyContent: 'center',
    },
    noRing: {
        width: 60, height: 60, borderRadius: 30,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: colors.border.subtle,
    },
    avatar: {
        width: 50, height: 50, borderRadius: 25,
    },
    avatarPlaceholder: {
        backgroundColor: colors.surface.glassHover,
        alignItems: 'center', justifyContent: 'center',
    },
    avatarLetter: {
        fontSize: typography.fontSize.lg, fontWeight: '700',
        color: colors.text.primary,
    },
    addBadge: {
        position: 'absolute', bottom: 0, right: 0,
        width: 20, height: 20, borderRadius: 10,
        backgroundColor: colors.gold[500],
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: colors.obsidian[900],
    },
    name: {
        fontSize: 11, color: colors.text.muted,
        fontWeight: '500', textAlign: 'center',
    },
    listContainer: {
        flexDirection: 'row', paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
    },
});
