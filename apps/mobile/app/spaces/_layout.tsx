import { Stack } from 'expo-router';
import { colors } from '@zerog/ui';

export default function SpacesLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.obsidian[900] },
                gestureEnabled: true,
                gestureDirection: 'horizontal',
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen name="index" />
            <Stack.Screen name="create" />
            <Stack.Screen
                name="[id]"
                options={{
                    animation: 'fade',
                    presentation: 'fullScreenModal',
                    gestureEnabled: false,
                }}
            />
        </Stack>
    );
}
