<script lang="ts">
  import { currentRoute, navigate, type Route } from '../../utils/router';
  import { authStore } from '../../stores/auth';
  import { displayName } from '../../stores/user';

  const navItems: Array<{ route: Route; label: string; icon: string }> = [
    { route: 'wiki', label: 'Wiki', icon: '📚' },
    { route: 'news', label: 'News', icon: '📰' },
    { route: 'chat', label: 'Chat', icon: '💬' },
    { route: 'trust', label: 'Trust', icon: '🔗' },
    { route: 'profile', label: 'Profile', icon: '👤' },
  ];

  function handleNavigation(route: Route) {
    navigate(route);
  }

  function handleLogout() {
    authStore.logout();
    navigate('login');
  }
</script>

<header class="bg-white dark:bg-gray-800 shadow-sm">
  <div class="container mx-auto px-4">
    <div class="flex items-center justify-between h-16">
      <!-- Logo -->
      <div class="flex items-center space-x-4">
        <button
          on:click={() => navigate('home')}
          class="text-2xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          Nudge
        </button>
        <span class="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">
          Trust-Based Knowledge
        </span>
      </div>

      {#if $authStore.isAuthenticated}
        <!-- Navigation -->
        <nav class="hidden md:flex items-center space-x-1">
          {#each navItems as item}
            <button
              on:click={() => handleNavigation(item.route)}
              class="px-3 py-2 rounded-md text-sm font-medium transition-colors {$currentRoute ===
              item.route
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}"
            >
              <span class="mr-1">{item.icon}</span>
              {item.label}
            </button>
          {/each}
        </nav>

        <!-- User menu -->
        <div class="flex items-center space-x-4">
          <span class="text-sm text-gray-700 dark:text-gray-300 hidden sm:inline">
            {$displayName}
          </span>
          <button
            on:click={handleLogout}
            class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
          >
            Logout
          </button>
        </div>

        <!-- Mobile menu button -->
        <div class="md:hidden">
          <button
            class="p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg
              class="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      {:else}
        <!-- Login button -->
        <button
          on:click={() => navigate('login')}
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
        >
          Login
        </button>
      {/if}
    </div>
  </div>
</header>
