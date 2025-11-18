/**
 * User Profile Store
 * Manages user profile data and preferences
 */
import { writable, derived, get } from 'svelte/store';
import type { UserProfile } from '@nudge/shared';
import { authStore } from './auth';
import { getUserProfile, updateUserProfile as apiUpdateProfile } from '../api/users';

interface UserState {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: UserState = {
  profile: null,
  isLoading: false,
  error: null,
};

/**
 * Create user store
 */
function createUserStore() {
  const { subscribe, set, update } = writable<UserState>(initialState);

  return {
    subscribe,

    /**
     * Load user profile
     */
    async load() {
      const auth = get(authStore);
      if (!auth.isAuthenticated) {
        set(initialState);
        return;
      }

      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const profile = await getUserProfile();
        update((state) => ({
          ...state,
          profile,
          isLoading: false,
        }));
      } catch (error: any) {
        console.error('Failed to load user profile:', error);
        update((state) => ({
          ...state,
          isLoading: false,
          error: error.message || 'Failed to load profile',
        }));
      }
    },

    /**
     * Update user profile
     */
    async update(updates: Partial<UserProfile>) {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const updatedProfile = await apiUpdateProfile(updates);
        update((state) => ({
          ...state,
          profile: updatedProfile,
          isLoading: false,
        }));
        return true;
      } catch (error: any) {
        console.error('Failed to update profile:', error);
        update((state) => ({
          ...state,
          isLoading: false,
          error: error.message || 'Failed to update profile',
        }));
        return false;
      }
    },

    /**
     * Clear user data
     */
    clear() {
      set(initialState);
    },

    /**
     * Clear error
     */
    clearError() {
      update((state) => ({ ...state, error: null }));
    },
  };
}

export const userStore = createUserStore();

/**
 * Derived store for user preferences
 */
export const userPreferences = derived(userStore, ($user) => ({
  trustThreshold: $user.profile?.trustThreshold ?? 0.7,
  openMindedness: $user.profile?.openMindedness ?? 0.2,
}));

/**
 * Derived store for display name
 */
export const displayName = derived(
  userStore,
  ($user) => $user.profile?.displayName ?? 'User'
);
