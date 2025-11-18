/**
 * Authentication Store
 * Manages user authentication state with AWS Cognito
 */
import { writable } from 'svelte/store';

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  userId: string | null;
  email: string | null;
  error: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  token: null,
  userId: null,
  email: null,
  error: null,
};

/**
 * Create auth store
 */
function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>(initialState);

  return {
    subscribe,

    /**
     * Initialize auth - check for existing session
     */
    async init() {
      update((state) => ({ ...state, isLoading: true }));

      try {
        // Check for existing Cognito session
        // This will be implemented with AWS Amplify
        const session = await checkExistingSession();

        if (session) {
          set({
            isAuthenticated: true,
            isLoading: false,
            token: session.token,
            userId: session.userId,
            email: session.email,
            error: null,
          });
        } else {
          set({
            ...initialState,
            isLoading: false,
          });
        }
      } catch (error) {
        console.error('Auth init error:', error);
        set({
          ...initialState,
          isLoading: false,
          error: 'Failed to initialize authentication',
        });
      }
    },

    /**
     * Login with email and password
     */
    async login(email: string, password: string) {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        // AWS Cognito login
        const session = await performLogin(email, password);

        set({
          isAuthenticated: true,
          isLoading: false,
          token: session.token,
          userId: session.userId,
          email: session.email,
          error: null,
        });

        return true;
      } catch (error: any) {
        const errorMessage = error.message || 'Login failed';
        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));
        return false;
      }
    },

    /**
     * Sign up new user
     */
    async signup(email: string, password: string, displayName: string) {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        // AWS Cognito signup
        await performSignup(email, password, displayName);

        // Auto-login after signup
        return await this.login(email, password);
      } catch (error: any) {
        const errorMessage = error.message || 'Signup failed';
        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));
        return false;
      }
    },

    /**
     * Logout
     */
    async logout() {
      try {
        // AWS Cognito logout
        await performLogout();
      } catch (error) {
        console.error('Logout error:', error);
      }

      set({
        ...initialState,
        isLoading: false,
      });
    },

    /**
     * Clear error
     */
    clearError() {
      update((state) => ({ ...state, error: null }));
    },
  };
}

/**
 * Helper functions - to be implemented with AWS Amplify
 */

async function checkExistingSession(): Promise<{
  token: string;
  userId: string;
  email: string;
} | null> {
  // TODO: Implement with AWS Amplify
  // For now, check localStorage for development
  const token = localStorage.getItem('auth_token');
  const userId = localStorage.getItem('user_id');
  const email = localStorage.getItem('user_email');

  if (token && userId && email) {
    return { token, userId, email };
  }

  return null;
}

async function performLogin(
  email: string,
  password: string
): Promise<{ token: string; userId: string; email: string }> {
  // TODO: Implement with AWS Amplify
  // For now, mock implementation for development
  console.log('Login:', email);

  // Mock delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Mock token
  const mockToken = 'mock-jwt-token-' + Date.now();
  const mockUserId = 'user-' + email.split('@')[0];

  // Store in localStorage for development
  localStorage.setItem('auth_token', mockToken);
  localStorage.setItem('user_id', mockUserId);
  localStorage.setItem('user_email', email);

  return {
    token: mockToken,
    userId: mockUserId,
    email,
  };
}

async function performSignup(
  email: string,
  password: string,
  displayName: string
): Promise<void> {
  // TODO: Implement with AWS Amplify
  console.log('Signup:', email, displayName);

  // Mock delay
  await new Promise((resolve) => setTimeout(resolve, 500));
}

async function performLogout(): Promise<void> {
  // TODO: Implement with AWS Amplify
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_id');
  localStorage.removeItem('user_email');
}

export const authStore = createAuthStore();
