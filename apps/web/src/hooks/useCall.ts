'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { PeerConnectionManager, CallState } from '@/lib/webrtc/PeerConnection';
import { useSocket } from '@/hooks/useSocket';

interface CallParticipant {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
}

interface UseCallReturn {
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    callState: CallState;
    isMuted: boolean;
    isVideoOn: boolean;
    isScreenSharing: boolean;
    currentCall: { callId: string; type: 'audio' | 'video'; participant: CallParticipant } | null;
    incomingCall: { callId: string; type: 'audio' | 'video'; from: CallParticipant } | null;
    initiateCall: (userId: string, type: 'audio' | 'video') => Promise<void>;
    answerCall: (callId: string) => Promise<void>;
    rejectCall: (callId: string) => void;
    endCall: () => void;
    toggleMute: () => void;
    toggleVideo: () => void;
    toggleScreenShare: () => Promise<void>;
}

export function useCall(): UseCallReturn {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [callState, setCallState] = useState<CallState>('idle');
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOn, setIsVideoOn] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [currentCall, setCurrentCall] = useState<UseCallReturn['currentCall']>(null);
    const [incomingCall, setIncomingCall] = useState<UseCallReturn['incomingCall']>(null);

    const pcManagerRef = useRef<PeerConnectionManager | null>(null);
    const { socket } = useSocket();

    // Setup socket listeners
    useEffect(() => {
        if (!socket) return;

        socket.on('call:incoming', (data: { callId: string; type: 'audio' | 'video'; from: CallParticipant; offer: RTCSessionDescriptionInit }) => {
            setIncomingCall({ callId: data.callId, type: data.type, from: data.from });
        });

        socket.on('call:answered', async (data: { answer: RTCSessionDescriptionInit }) => {
            await pcManagerRef.current?.handleAnswer(data.answer);
            setCallState('connected');
        });

        socket.on('call:ice-candidate', async (data: { candidate: RTCIceCandidateInit }) => {
            await pcManagerRef.current?.addIceCandidate(data.candidate);
        });

        socket.on('call:rejected', () => {
            pcManagerRef.current?.close();
            setCallState('ended');
            setCurrentCall(null);
            setTimeout(() => setCallState('idle'), 2000);
        });

        socket.on('call:ended', () => {
            pcManagerRef.current?.close();
            setLocalStream(null);
            setRemoteStream(null);
            setCallState('ended');
            setCurrentCall(null);
            setTimeout(() => setCallState('idle'), 2000);
        });

        return () => {
            socket.off('call:incoming');
            socket.off('call:answered');
            socket.off('call:ice-candidate');
            socket.off('call:rejected');
            socket.off('call:ended');
        };
    }, [socket]);

    const initiateCall = useCallback(async (userId: string, type: 'audio' | 'video') => {
        if (!socket) return;

        const pcManager = new PeerConnectionManager({
            onRemoteStream: setRemoteStream,
            onIceCandidate: (candidate) => {
                socket.emit('call:ice-candidate', { userId, candidate });
            },
            onConnectionStateChange: setCallState,
            onError: (err) => console.error('Call error:', err),
        });

        pcManagerRef.current = pcManager;
        setCallState('calling');

        const stream = await pcManager.initialize(true, type === 'video');
        setLocalStream(stream);
        setIsVideoOn(type === 'video');

        const offer = await pcManager.createOffer();
        const callId = `call_${Date.now()}`;

        socket.emit('call:initiate', { callId, userId, type, offer });
        setCurrentCall({ callId, type, participant: { id: userId, username: '', displayName: '' } });
    }, [socket]);

    const answerCall = useCallback(async (callId: string) => {
        if (!socket || !incomingCall) return;

        const pcManager = new PeerConnectionManager({
            onRemoteStream: setRemoteStream,
            onIceCandidate: (candidate) => {
                socket.emit('call:ice-candidate', { userId: incomingCall.from.id, candidate });
            },
            onConnectionStateChange: setCallState,
            onError: (err) => console.error('Call error:', err),
        });

        pcManagerRef.current = pcManager;
        const stream = await pcManager.initialize(true, incomingCall.type === 'video');
        setLocalStream(stream);
        setIsVideoOn(incomingCall.type === 'video');

        // Get the offer from the socket event (cached)
        socket.emit('call:get-offer', { callId }, async (offer: RTCSessionDescriptionInit) => {
            const answer = await pcManager.createAnswer(offer);
            socket.emit('call:answer', { callId, answer });
        });

        setCurrentCall({ callId, type: incomingCall.type, participant: incomingCall.from });
        setIncomingCall(null);
    }, [socket, incomingCall]);

    const rejectCall = useCallback((callId: string) => {
        socket?.emit('call:reject', { callId });
        setIncomingCall(null);
    }, [socket]);

    const endCall = useCallback(() => {
        if (currentCall) {
            socket?.emit('call:end', { callId: currentCall.callId });
        }
        pcManagerRef.current?.close();
        setLocalStream(null);
        setRemoteStream(null);
        setCallState('idle');
        setCurrentCall(null);
        setIsMuted(false);
        setIsVideoOn(false);
        setIsScreenSharing(false);
    }, [socket, currentCall]);

    const toggleMute = useCallback(() => {
        const newMuted = !isMuted;
        pcManagerRef.current?.toggleAudio(!newMuted);
        setIsMuted(newMuted);
        socket?.emit('call:mute', { callId: currentCall?.callId, muted: newMuted });
    }, [isMuted, socket, currentCall]);

    const toggleVideo = useCallback(() => {
        const newVideo = !isVideoOn;
        pcManagerRef.current?.toggleVideo(newVideo);
        setIsVideoOn(newVideo);
    }, [isVideoOn]);

    const toggleScreenShare = useCallback(async () => {
        if (isScreenSharing) {
            // Stop screen share - restore camera
            const cameraTrack = localStream?.getVideoTracks()[0];
            if (cameraTrack) {
                pcManagerRef.current?.toggleVideo(true);
            }
            setIsScreenSharing(false);
        } else {
            const screenStream = await pcManagerRef.current?.startScreenShare();
            if (screenStream) {
                setIsScreenSharing(true);
                screenStream.getVideoTracks()[0].onended = () => setIsScreenSharing(false);
            }
        }
    }, [isScreenSharing, localStream]);

    return {
        localStream,
        remoteStream,
        callState,
        isMuted,
        isVideoOn,
        isScreenSharing,
        currentCall,
        incomingCall,
        initiateCall,
        answerCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleVideo,
        toggleScreenShare,
    };
}
