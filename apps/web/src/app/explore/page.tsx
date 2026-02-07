import { redirect } from 'next/navigation';

/**
 * /explore now redirects to /search.
 * Search is the unified discovery page that adapts to private vs community mode.
 */
export default function ExplorePage() {
    redirect('/search');
}
