import { Stack } from 'expo-router';
import { colors } from '@zerog/ui';

export default function ToolsLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.obsidian[900] },
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen name="index" />
            <Stack.Screen name="prayer-times" />
            <Stack.Screen name="qibla" />
            <Stack.Screen name="halal-scanner" />
            <Stack.Screen name="boycott-scanner" />
            <Stack.Screen name="quran" />
        </Stack>
    );
}
