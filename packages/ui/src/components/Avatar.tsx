import React from 'react';
import { View, Image, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, borderRadius, typography } from '../theme';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface AvatarProps {
    source?: string;
    name?: string;
    size?: AvatarSize;
    showOnlineStatus?: boolean;
    isOnline?: boolean;
    style?: ViewStyle;
}

const sizeMap: Record<AvatarSize, number> = {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
    '2xl': 96,
};

const fontSizeMap: Record<AvatarSize, number> = {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 18,
    xl: 24,
    '2xl': 36,
};

const statusSizeMap: Record<AvatarSize, number> = {
    xs: 6,
    sm: 8,
    md: 10,
    lg: 12,
    xl: 16,
    '2xl': 20,
};

const getInitials = (name: string): string => {
    return name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
};

const getBackgroundColor = (name: string): string => {
    const colorOptions = [
        colors.gold[500],
        colors.amber[500],
        colors.coral[500],
        colors.emerald[500],
        colors.azure[500],
    ];
    const index = name.charCodeAt(0) % colorOptions.length;
    return colorOptions[index];
};

export const Avatar: React.FC<AvatarProps> = ({
    source,
    name = '',
    size = 'md',
    showOnlineStatus = false,
    isOnline = false,
    style,
}) => {
    const dimension = sizeMap[size];
    const fontSize = fontSizeMap[size];
    const statusSize = statusSizeMap[size];

    return (
        <View
            style={[
                styles.container,
                {
                    width: dimension,
                    height: dimension,
                    borderRadius: dimension / 2,
                },
                style,
            ]}
        >
            {source ? (
                <Image
                    source={{ uri: source }}
                    style={[
                        styles.image,
                        {
                            width: dimension,
                            height: dimension,
                            borderRadius: dimension / 2,
                        },
                    ]}
                />
            ) : (
                <View
                    style={[
                        styles.fallback,
                        {
                            width: dimension,
                            height: dimension,
                            borderRadius: dimension / 2,
                            backgroundColor: getBackgroundColor(name),
                        },
                    ]}
                >
                    <Text style={[styles.initials, { fontSize }]}>
                        {name ? getInitials(name) : '?'}
                    </Text>
                </View>
            )}

            {showOnlineStatus && (
                <View
                    style={[
                        styles.status,
                        {
                            width: statusSize,
                            height: statusSize,
                            borderRadius: statusSize / 2,
                            backgroundColor: isOnline ? colors.emerald[500] : colors.obsidian[400],
                            borderWidth: statusSize > 10 ? 3 : 2,
                        },
                    ]}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
    },
    image: {
        resizeMode: 'cover',
    },
    fallback: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    initials: {
        fontFamily: typography.fontFamily.sans,
        fontWeight: typography.fontWeight.semibold as any,
        color: colors.text.inverse,
    },
    status: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        borderColor: colors.obsidian[900],
    },
});
