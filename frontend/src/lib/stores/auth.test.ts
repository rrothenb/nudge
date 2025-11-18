import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { authStore } from './auth';

describe('Auth Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('is a store with subscribe method', () => {
    expect(typeof authStore.subscribe).toBe('function');
  });

  it('has login method', () => {
    expect(typeof authStore.login).toBe('function');
  });

  it('has signup method', () => {
    expect(typeof authStore.signup).toBe('function');
  });

  it('has logout method', () => {
    expect(typeof authStore.logout).toBe('function');
  });

  it('has init method', () => {
    expect(typeof authStore.init).toBe('function');
  });

  describe('login', () => {
    it('accepts email and password', async () => {
      const result = await authStore.login('test@example.com', 'password123');
      expect(typeof result).toBe('boolean');
    });

    it('returns true on successful login', async () => {
      const result = await authStore.login('test@example.com', 'password123');
      expect(result).toBe(true);
    });

    it('updates authenticated state after login', async () => {
      await authStore.login('test@example.com', 'password123');
      const state = get(authStore);
      expect(state.isAuthenticated).toBe(true);
      expect(state.email).toBe('test@example.com');
    });
  });

  describe('logout', () => {
    it('clears authentication state', async () => {
      // First login
      await authStore.login('test@example.com', 'password123');
      let state = get(authStore);
      expect(state.isAuthenticated).toBe(true);

      // Then logout
      await authStore.logout();
      state = get(authStore);
      expect(state.isAuthenticated).toBe(false);
      expect(state.token).toBeNull();
    });
  });
});
