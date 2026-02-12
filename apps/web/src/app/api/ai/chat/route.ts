import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // Server-only, no NEXT_PUBLIC_ prefix

export async function POST(req: NextRequest) {
    try {
        if (!GEMINI_API_KEY) {
            return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });
        }

        const body = await req.json();
        const { messages, context } = body;

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        // Call Gemini API server-side
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: messages.map((m: { role: string; content: string }) => ({
                        role: m.role === 'user' ? 'user' : 'model',
                        parts: [{ text: m.content }],
                    })),
                    ...(context ? { systemInstruction: { parts: [{ text: context }] } } : {}),
                }),
            }
        );

        if (!response.ok) {
            const err = await response.text();
            console.error('Gemini API error:', err);
            return NextResponse.json({ error: 'AI service error' }, { status: 502 });
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';

        return NextResponse.json({ text });
    } catch (error) {
        console.error('AI chat error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
