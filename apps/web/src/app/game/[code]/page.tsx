import { redirect } from 'next/navigation';

// ============================================
// /game/[code] — Redirect to game join page
// Deep links from shared invites land here:
//   https://0gravity.ai/game/ABCDEF → /games/join?code=ABCDEF
// ============================================

interface Props {
    params: Promise<{ code: string }>;
}

export default async function GameRedirectPage({ params }: Props) {
    const { code } = await params;
    redirect(`/games/join?code=${code.toUpperCase()}`);
}
