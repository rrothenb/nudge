/**
 * Simple client-side hash-based router
 */
import { writable } from 'svelte/store';

export type Route =
  | 'home'
  | 'wiki'
  | 'news'
  | 'chat'
  | 'profile'
  | 'trust'
  | 'groups'
  | 'login';

interface RouteConfig {
  path: string;
  title: string;
  requiresAuth: boolean;
}

export const routes: Record<Route, RouteConfig> = {
  home: { path: '/', title: 'Home', requiresAuth: false },
  wiki: { path: '/wiki', title: 'Wiki', requiresAuth: true },
  news: { path: '/news', title: 'News', requiresAuth: true },
  chat: { path: '/chat', title: 'Chat', requiresAuth: true },
  profile: { path: '/profile', title: 'Profile', requiresAuth: true },
  trust: { path: '/trust', title: 'Trust Network', requiresAuth: true },
  groups: { path: '/groups', title: 'Groups', requiresAuth: true },
  login: { path: '/login', title: 'Login', requiresAuth: false },
};

// Current route store
export const currentRoute = writable<Route>('home');

// Route parameters store (e.g., /wiki/:topic)
export const routeParams = writable<Record<string, string>>({});

/**
 * Initialize router - call on app mount
 */
export function initRouter() {
  // Listen for hash changes
  window.addEventListener('hashchange', handleRouteChange);

  // Handle initial route
  handleRouteChange();
}

/**
 * Navigate to a route
 */
export function navigate(route: Route, params?: Record<string, string>) {
  const config = routes[route];
  let path = config.path;

  // Replace params in path
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      path = path.replace(`:${key}`, value);
    });
    routeParams.set(params);
  } else {
    routeParams.set({});
  }

  window.location.hash = path;
}

/**
 * Handle route changes
 */
function handleRouteChange() {
  const hash = window.location.hash.slice(1) || '/';

  // Find matching route
  let matchedRoute: Route | null = null;
  const params: Record<string, string> = {};

  for (const [routeName, config] of Object.entries(routes)) {
    const pattern = pathToRegex(config.path);
    const match = hash.match(pattern);

    if (match) {
      matchedRoute = routeName as Route;

      // Extract params
      const keys = extractParamKeys(config.path);
      keys.forEach((key, index) => {
        params[key] = match[index + 1];
      });

      break;
    }
  }

  if (matchedRoute) {
    currentRoute.set(matchedRoute);
    routeParams.set(params);

    // Update document title
    document.title = `${routes[matchedRoute].title} - Nudge`;
  } else {
    // Fallback to home
    currentRoute.set('home');
    routeParams.set({});
  }
}

/**
 * Convert path pattern to regex
 */
function pathToRegex(path: string): RegExp {
  const pattern = path
    .replace(/\//g, '\\/')
    .replace(/:\w+/g, '([^/]+)');
  return new RegExp(`^${pattern}$`);
}

/**
 * Extract parameter keys from path
 */
function extractParamKeys(path: string): string[] {
  const matches = path.match(/:\w+/g);
  return matches ? matches.map((m) => m.slice(1)) : [];
}

/**
 * Get current route config
 */
export function getCurrentRouteConfig(): RouteConfig | null {
  let route: Route | null = null;
  currentRoute.subscribe((r) => (route = r))();
  return route ? routes[route] : null;
}
