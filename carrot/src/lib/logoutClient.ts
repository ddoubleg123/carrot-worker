'use client';

import { signOut as nextAuthSignOut } from 'next-auth/react';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from './firebase';

/**
 * Unified, fast client logout that clears Firebase auth and NextAuth session,
 * then redirects to /login.
 */
export async function logoutClient() {
  try {
    // Best-effort: sign out of Firebase quickly (doesn't block redirect if it fails)
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      // Non-fatal; proceed with NextAuth sign out
      console.warn('[logoutClient] Firebase signOut failed (non-fatal):', e);
    }

    // Sign out of NextAuth and redirect
    await nextAuthSignOut({
      callbackUrl: '/login',
      redirect: true
    });
  } catch (error) {
    console.error('[logoutClient] Error during sign out:', error);
    // Even if there's an error, redirect to login
    window.location.href = '/login';
  }
}

// Add default export for backward compatibility
export default logoutClient;
