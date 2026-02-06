/**
 * WebRTC Peer Connection Management
 * Handles ICE candidates, media streams, and connection state.
 */

const ICE_SERVERS: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
];

export type CallState = 'idle' | 'calling' | 'ringing' | 'connected' | 'reconnecting' | 'ended';

export interface PeerConnectionCallbacks {
    onRemoteStream: (stream: MediaStream) => void;
    onIceCandidate: (candidate: RTCIceCandidateInit) => void;
    onConnectionStateChange: (state: CallState) => void;
    onError: (error: Error) => void;
}

export class PeerConnectionManager {
    private pc: RTCPeerConnection | null = null;
    private localStream: MediaStream | null = null;
    private callbacks: PeerConnectionCallbacks;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 3;

    constructor(callbacks: PeerConnectionCallbacks) {
        this.callbacks = callbacks;
    }

    async initialize(audio: boolean = true, video: boolean = false): Promise<MediaStream> {
        // Create peer connection
        this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

        // Handle remote stream
        this.pc.ontrack = (event) => {
            if (event.streams[0]) {
                this.callbacks.onRemoteStream(event.streams[0]);
            }
        };

        // Handle ICE candidates
        this.pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.callbacks.onIceCandidate(event.candidate.toJSON());
            }
        };

        // Connection state monitoring
        this.pc.onconnectionstatechange = () => {
            if (!this.pc) return;
            switch (this.pc.connectionState) {
                case 'connected':
                    this.reconnectAttempts = 0;
                    this.callbacks.onConnectionStateChange('connected');
                    break;
                case 'disconnected':
                    this.callbacks.onConnectionStateChange('reconnecting');
                    this.attemptReconnect();
                    break;
                case 'failed':
                    if (this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.attemptReconnect();
                    } else {
                        this.callbacks.onConnectionStateChange('ended');
                        this.callbacks.onError(new Error('Connection failed after retries'));
                    }
                    break;
                case 'closed':
                    this.callbacks.onConnectionStateChange('ended');
                    break;
            }
        };

        // Get local media
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({ audio, video });
            this.localStream.getTracks().forEach(track => {
                this.pc!.addTrack(track, this.localStream!);
            });
            return this.localStream;
        } catch (error) {
            this.callbacks.onError(new Error('Failed to access media devices'));
            throw error;
        }
    }

    async createOffer(): Promise<RTCSessionDescriptionInit> {
        if (!this.pc) throw new Error('PeerConnection not initialized');
        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);
        return offer;
    }

    async createAnswer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
        if (!this.pc) throw new Error('PeerConnection not initialized');
        await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        return answer;
    }

    async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
        if (!this.pc) return;
        await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
    }

    async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
        if (!this.pc) return;
        try {
            await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {
            // ICE candidate errors can be non-fatal
        }
    }

    toggleAudio(enabled: boolean): void {
        this.localStream?.getAudioTracks().forEach(track => {
            track.enabled = enabled;
        });
    }

    toggleVideo(enabled: boolean): void {
        this.localStream?.getVideoTracks().forEach(track => {
            track.enabled = enabled;
        });
    }

    async startScreenShare(): Promise<MediaStream | null> {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: false,
            });

            // Replace video track
            const videoTrack = screenStream.getVideoTracks()[0];
            const sender = this.pc?.getSenders().find(s => s.track?.kind === 'video');
            if (sender) {
                await sender.replaceTrack(videoTrack);
            }

            videoTrack.onended = () => {
                // Restore camera when screen share ends
                const cameraTrack = this.localStream?.getVideoTracks()[0];
                if (cameraTrack && sender) {
                    sender.replaceTrack(cameraTrack);
                }
            };

            return screenStream;
        } catch {
            return null;
        }
    }

    private async attemptReconnect(): Promise<void> {
        this.reconnectAttempts++;
        this.callbacks.onConnectionStateChange('reconnecting');
        // Connection will auto-recover via ICE restart in most cases
    }

    getLocalStream(): MediaStream | null {
        return this.localStream;
    }

    close(): void {
        this.localStream?.getTracks().forEach(track => track.stop());
        this.localStream = null;
        this.pc?.close();
        this.pc = null;
        this.callbacks.onConnectionStateChange('ended');
    }
}
