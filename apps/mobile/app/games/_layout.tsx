import { Stack } from 'expo-router';
import { colors } from '@zerog/ui';

export default function GamesLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.obsidian[900] },
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen name="index" />
            <Stack.Screen name="guest-join" />
            <Stack.Screen name="lobby/[code]" />
            <Stack.Screen name="results/[code]" />
            <Stack.Screen name="trivia/[code]" />
            <Stack.Screen name="predict/[code]" />
            <Stack.Screen name="wavelength/[code]" />
            <Stack.Screen name="infiltrator/[code]" />
            <Stack.Screen name="cipher/[code]" />
            <Stack.Screen name="daily" />
            <Stack.Screen name="practice" />
        </Stack>
    );
}
