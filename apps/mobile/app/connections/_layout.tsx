import { Stack } from 'expo-router';
import { colors } from '@zerog/ui';

export default function ConnectionsLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.obsidian[900] },
                gestureEnabled: true,
                gestureDirection: 'horizontal',
                animation: 'slide_from_right',
            }}
        />
    );
}
