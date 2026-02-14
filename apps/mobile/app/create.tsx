// ============================================
// /create route — redirects to (tabs)/create
// The create screen lives in the tabs layout;
// this file catches standalone /create pushes.
// ============================================

import { Redirect } from 'expo-router';

export default function CreateRedirect() {
    return <Redirect href="/(tabs)/create" />;
}
