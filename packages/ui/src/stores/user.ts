/**
 * Svelte user store — replaces ALL localStorage/cookie auth state.
 * Fetches identity from /api/me (populated by cf-access-authenticated-user-email header).
 * Import and use $userStore in any Svelte component.
 */

import { writable, derived } from 'svelte/store';

export interface UserState {
  loading: boolean;
  email: string | null;
  plan: 'free' | 'lite' | 'pro' | 'enterprise' | null;
  subscription_status: string | null;
  onboarding_complete: boolean;
  business_name: string | null;
  error: string | null;
}

const initial: UserState = {
  loading: true,
  email: null,
  plan: null,
  subscription_status: null,
  onboarding_complete: false,
  business_name: null,
  error: null,
};

function createUserStore() {
  const { subscribe, set, update } = writable<UserState>(initial);

  return {
    subscribe,
    async load() {
      try {
        const res = await fetch('/api/me', { credentials: 'include' });
        if (res.status === 401) {
          // No Access session — redirect to Access login
          window.location.href = '/.well-known/cf-access-redirect?redirect_url=' +
            encodeURIComponent(window.location.href);
          return;
        }
        const data = await res.json();
        set({ loading: false, error: null, ...data });
      } catch (err) {
        update(s => ({ ...s, loading: false, error: 'Failed to load user' }));
      }
    },
    reset() {
      set(initial);
    },
  };
}

export const userStore = createUserStore();

// Derived helpers
export const isAuthenticated = derived(userStore, $u => !$u.loading && !!$u.email);
export const isPaid = derived(userStore, $u => $u.subscription_status === 'active');
export const isPro = derived(userStore, $u =>
  $u.plan === 'pro' || $u.plan === 'enterprise'
);
export const needsOnboarding = derived(userStore, $u =>
  !$u.loading && !!$u.email && !$u.onboarding_complete
);
