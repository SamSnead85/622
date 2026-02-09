'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CpuIcon, SendIcon, CloseIcon, MinusIcon } from '@/components/icons';

// ============================================
// AI ASSISTANT - Powered by Gemini
// Helps users navigate the platform
// ============================================

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

const SYSTEM_PROMPT = `You are 0G Assistant, a helpful guide for the 0G (ZeroG) social platform. You help users:

- Navigate the platform and find features
- Post photos, videos, and content
- Go live with Campfire streaming
- Create and manage Groups (Tribes)
- Adjust privacy and security settings
- Connect with friends and communities
- Use the platform's unique features like Neural Lens (algorithm control)

Be friendly, concise, and helpful. Use simple language. If you don't know something platform-specific, guide them to Settings or suggest they explore the relevant section.

Platform features to know:
- Dashboard: Main feed with posts from friends
- Campfire: Live streaming feature
- Tribes: Community groups users can create/join
- Journeys: Travel and experience sharing
- Messages: Direct messaging
- Settings: Account, privacy, notifications, 2FA security
- Neural Lens: User-controlled algorithm preferences

Keep responses brief (2-3 sentences max) unless more detail is needed.`;

async function sendToGemini(messages: Message[]): Promise<string> {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
        return "I'm not configured yet. Please add the Gemini API key.";
    }

    try {
        // Format messages for Gemini API
        const contents = messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
        }));

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents,
                    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 200,
                    }
                })
            }
        );

        const data = await response.json();

        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            return data.candidates[0].content.parts[0].text;
        }

        return "I had trouble understanding. Could you try rephrasing that?";
    } catch (error) {
        console.error('Gemini API error:', error);
        return "I'm having connection issues. Please try again in a moment.";
    }
}

// Quick help suggestions
const QUICK_SUGGESTIONS = [
    "How do I post a photo?",
    "How do I go live?",
    "How do I create a group?",
    "How do I change my privacy settings?",
];

export function AIAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Show welcome message on first open
    useEffect(() => {
        if (isOpen && messages.length === 0 && !hasInteracted) {
            setMessages([{
                role: 'assistant',
                content: "Hi! I'm your 0G Assistant. I can help you navigate the platform, post content, go live, create groups, and more. What would you like to know?"
            }]);
        }
    }, [isOpen, messages.length, hasInteracted]);

    const handleSend = async (text?: string) => {
        const messageText = text || input.trim();
        if (!messageText || isLoading) return;

        setHasInteracted(true);
        const userMessage: Message = { role: 'user', content: messageText };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        const response = await sendToGemini([...messages, userMessage]);

        setMessages(prev => [...prev, { role: 'assistant', content: response }]);
        setIsLoading(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            {/* Floating Action Button - Hidden on mobile */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        onClick={() => setIsOpen(true)}
                        className="hidden md:flex fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8942D] shadow-lg shadow-purple-500/25 items-center justify-center hover:scale-105 transition-transform"
                    >
                        <CpuIcon size={24} className="text-white" />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{
                            opacity: 1,
                            y: 0,
                            scale: 1,
                            height: isMinimized ? 'auto' : '500px'
                        }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] bg-[#0A0A0F] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gradient-to-r from-[#D4AF37]/10 to-[#B8942D]/10">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8942D] flex items-center justify-center">
                                    <CpuIcon size={16} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white text-sm">0G Assistant</h3>
                                    <p className="text-xs text-white/50">Here to help</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setIsMinimized(!isMinimized)}
                                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                                >
                                    <MinusIcon size={16} className="text-white/50" />
                                </button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                                >
                                    <CloseIcon size={16} className="text-white/50" />
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        {!isMinimized && (
                            <>
                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    {messages.map((msg, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${msg.role === 'user'
                                                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#B8942D] text-white rounded-br-md'
                                                    : 'bg-white/10 text-white/90 rounded-bl-md'
                                                    }`}
                                            >
                                                {msg.content}
                                            </div>
                                        </motion.div>
                                    ))}

                                    {/* Loading indicator */}
                                    {isLoading && (
                                        <div className="flex justify-start">
                                            <div className="bg-white/10 px-4 py-3 rounded-2xl rounded-bl-md">
                                                <div className="flex gap-1">
                                                    <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                    <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                    <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Quick Suggestions (only show if no messages yet) */}
                                {messages.length <= 1 && !hasInteracted && (
                                    <div className="px-4 pb-2">
                                        <p className="text-xs text-white/40 mb-2">Quick questions:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {QUICK_SUGGESTIONS.map((suggestion, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => handleSend(suggestion)}
                                                    className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                                                >
                                                    {suggestion}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Input */}
                                <div className="p-3 border-t border-white/10">
                                    <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
                                        <input
                                            type="text"
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder="Ask me anything..."
                                            disabled={isLoading}
                                            className="flex-1 bg-transparent text-white text-sm placeholder:text-white/30 focus:outline-none disabled:opacity-50"
                                        />
                                        <button
                                            onClick={() => handleSend()}
                                            disabled={!input.trim() || isLoading}
                                            className="p-2 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#B8942D] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                                        >
                                            <SendIcon size={16} />
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-white/30 text-center mt-2">
                                        Powered by Gemini AI
                                    </p>
                                </div>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

export default AIAssistant;
