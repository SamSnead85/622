import { Stack } from 'expo-router';
import { colors } from '@zerog/ui';

export default function OnboardingLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.obsidian[900] },
                animation: 'fade',
            }}
        >
            <Stack.Screen name="notifications" />
        </Stack>
    );
}
