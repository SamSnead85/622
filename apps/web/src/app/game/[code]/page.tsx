import { redirect } from 'next/navigation';

// ============================================
// /game/[code] — Redirect to game join page
// Deep links from shared invites land here:
//   https://0gravity.ai/game/ABCDEF → /games/join?code=ABCDEF
// ============================================

export default function GameRedirectPage({ params }: { params: { code: string } }) {
    redirect(`/games/join?code=${(params.code || '').toUpperCase()}`);
}
