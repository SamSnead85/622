// ============================================
// Network Quality Hook
// Detects connection type and quality to adapt
// video autoplay and image quality behavior
// ============================================

import { useState, useEffect, useCallback } from 'react';
import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';

export type NetworkQuality = 'offline' | 'slow' | 'moderate' | 'fast';

interface NetworkQualityState {
    quality: NetworkQuality;
    isConnected: boolean;
    connectionType: string | null;
    /** True for 2G/3G/slow connections — disable video autoplay */
    shouldReduceData: boolean;
    /** True when completely offline */
    isOffline: boolean;
}

function classifyQuality(state: NetInfoState): NetworkQuality {
    if (!state.isConnected || !state.isInternetReachable) {
        return 'offline';
    }

    if (state.type === NetInfoStateType.wifi || state.type === NetInfoStateType.ethernet) {
        return 'fast';
    }

    if (state.type === NetInfoStateType.cellular) {
        const generation = (state.details as any)?.cellularGeneration;
        if (generation === '2g') return 'slow';
        if (generation === '3g') return 'moderate';
        if (generation === '4g' || generation === '5g') return 'fast';
        return 'moderate'; // Unknown cellular generation
    }

    return 'moderate';
}

export function useNetworkQuality(): NetworkQualityState {
    const [state, setState] = useState<NetworkQualityState>({
        quality: 'fast',
        isConnected: true,
        connectionType: null,
        shouldReduceData: false,
        isOffline: false,
    });

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((netState) => {
            const quality = classifyQuality(netState);
            setState({
                quality,
                isConnected: netState.isConnected ?? true,
                connectionType: netState.type,
                shouldReduceData: quality === 'slow' || quality === 'offline',
                isOffline: quality === 'offline',
            });
        });

        // Get initial state
        NetInfo.fetch().then((netState) => {
            const quality = classifyQuality(netState);
            setState({
                quality,
                isConnected: netState.isConnected ?? true,
                connectionType: netState.type,
                shouldReduceData: quality === 'slow' || quality === 'offline',
                isOffline: quality === 'offline',
            });
        });

        return () => unsubscribe();
    }, []);

    return state;
}
