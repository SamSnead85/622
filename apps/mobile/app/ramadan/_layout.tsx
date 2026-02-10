import { Stack } from 'expo-router';
import { colors } from '@zerog/ui';

export default function RamadanLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.obsidian[900] },
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen name="index" />
        </Stack>
    );
}
