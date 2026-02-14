// ============================================
// /register route — redirects to /signup
// Some flows reference "register" instead of "signup";
// this ensures both routes resolve correctly.
// ============================================

import { Redirect } from 'expo-router';

export default function RegisterRedirect() {
    return <Redirect href="/(auth)/signup" />;
}
