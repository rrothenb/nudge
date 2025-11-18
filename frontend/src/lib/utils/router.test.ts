import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { currentRoute, navigate, routes } from './router';

describe('Router Utilities', () => {
  beforeEach(() => {
    // Reset window.location.hash
    window.location.hash = '';
  });

  describe('routes config', () => {
    it('has all expected routes', () => {
      expect(routes.home).toBeDefined();
      expect(routes.wiki).toBeDefined();
      expect(routes.news).toBeDefined();
      expect(routes.chat).toBeDefined();
      expect(routes.profile).toBeDefined();
      expect(routes.trust).toBeDefined();
      expect(routes.login).toBeDefined();
    });

    it('login route does not require auth', () => {
      expect(routes.login.requiresAuth).toBe(false);
    });

    it('wiki route requires auth', () => {
      expect(routes.wiki.requiresAuth).toBe(true);
    });

    it('news route requires auth', () => {
      expect(routes.news.requiresAuth).toBe(true);
    });

    it('chat route requires auth', () => {
      expect(routes.chat.requiresAuth).toBe(true);
    });

    it('profile route requires auth', () => {
      expect(routes.profile.requiresAuth).toBe(true);
    });

    it('trust route requires auth', () => {
      expect(routes.trust.requiresAuth).toBe(true);
    });
  });

  describe('navigate', () => {
    it('is a function', () => {
      expect(typeof navigate).toBe('function');
    });

    it('updates window.location.hash for wiki', () => {
      navigate('wiki');
      expect(window.location.hash).toContain('wiki');
    });

    it('updates window.location.hash for home', () => {
      navigate('home');
      expect(window.location.hash === '/' || window.location.hash === '#/').toBe(true);
    });
  });

  describe('currentRoute store', () => {
    it('is a writable store', () => {
      expect(typeof currentRoute.subscribe).toBe('function');
    });

    it('has a valid initial route', () => {
      const route = get(currentRoute);
      expect(route).toBeDefined();
      expect(['home', 'wiki', 'news', 'chat', 'profile', 'trust', 'login']).toContain(route);
    });
  });
});
