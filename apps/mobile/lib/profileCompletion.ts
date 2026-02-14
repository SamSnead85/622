// ============================================
// Profile Completion Calculator
// Returns percentage and actionable next steps
// ============================================

export interface ProfileStep {
    id: string;
    label: string;
    description: string;
    icon: string; // Ionicons name
    weight: number; // Percentage points
    completed: boolean;
    route?: string; // Navigation target when tapped
}

export interface ProfileCompletion {
    percentage: number;
    steps: ProfileStep[];
    nextSteps: ProfileStep[]; // Incomplete steps, sorted by priority
}

interface UserProfile {
    avatarUrl?: string | null;
    coverUrl?: string | null;
    bio?: string | null;
    username?: string | null;
    displayName?: string | null;
    interests?: unknown[] | null;
    culturalProfile?: string | null;
    postsCount?: number;
    followingCount?: number;
}

export function getProfileCompletion(user: UserProfile): ProfileCompletion {
    const steps: ProfileStep[] = [
        {
            id: 'avatar',
            label: 'Add a profile photo',
            description: 'Help people recognize you',
            icon: 'camera-outline',
            weight: 20,
            completed: !!user.avatarUrl,
            route: '/settings',
        },
        {
            id: 'bio',
            label: 'Write your bio',
            description: 'Tell people about yourself',
            icon: 'create-outline',
            weight: 15,
            completed: !!user.bio && user.bio.length > 0,
            route: '/settings',
        },
        {
            id: 'cover',
            label: 'Add a cover photo',
            description: 'Personalize your profile',
            icon: 'image-outline',
            weight: 10,
            completed: !!user.coverUrl,
            route: '/settings',
        },
        {
            id: 'interests',
            label: 'Select your interests',
            description: 'Get better content recommendations',
            icon: 'heart-outline',
            weight: 15,
            completed: Array.isArray(user.interests) && user.interests.length >= 3,
            route: '/interests',
        },
        {
            id: 'first_post',
            label: 'Create your first post',
            description: 'Share something with your circle',
            icon: 'add-circle-outline',
            weight: 15,
            completed: (user.postsCount ?? 0) > 0,
            route: '/(tabs)/create',
        },
        {
            id: 'follow',
            label: 'Follow someone',
            description: 'Build your circle',
            icon: 'people-outline',
            weight: 10,
            completed: (user.followingCount ?? 0) > 0,
            route: '/(tabs)/search',
        },
        {
            id: 'invite',
            label: 'Invite friends & family',
            description: 'Bring your people to 0G',
            icon: 'paper-plane-outline',
            weight: 15,
            completed: false, // Will be updated when invite tracking is available
            route: '/invite-contacts',
        },
    ];

    const totalWeight = steps.reduce((sum, s) => sum + s.weight, 0);
    const completedWeight = steps
        .filter((s) => s.completed)
        .reduce((sum, s) => sum + s.weight, 0);

    const percentage = Math.round((completedWeight / totalWeight) * 100);
    const nextSteps = steps.filter((s) => !s.completed);

    return { percentage, steps, nextSteps };
}
