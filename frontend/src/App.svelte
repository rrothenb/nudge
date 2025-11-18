<script lang="ts">
  import { onMount } from 'svelte';
  import { currentRoute, initRouter, navigate } from './lib/utils/router';
  import { authStore } from './lib/stores/auth';
  import { userStore } from './lib/stores/user';
  import Header from './lib/components/layout/Header.svelte';
  import WikiView from './lib/views/WikiView.svelte';
  import NewsView from './lib/views/NewsView.svelte';
  import ChatView from './lib/views/ChatView.svelte';

  // Placeholder view components (will be implemented later)
  let ProfileView: any;
  let TrustView: any;
  let LoginView: any;

  onMount(async () => {
    // Initialize router
    initRouter();

    // Initialize auth
    await authStore.init();

    // If authenticated, load user profile
    authStore.subscribe(async (auth) => {
      if (auth.isAuthenticated && !auth.isLoading) {
        await userStore.load();
      } else if (!auth.isAuthenticated) {
        userStore.clear();
      }
    });
  });

  // Redirect to login if not authenticated
  $: if (!$authStore.isLoading && !$authStore.isAuthenticated && $currentRoute !== 'login' && $currentRoute !== 'home') {
    navigate('login');
  }
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
  <Header />

  <main class="container mx-auto px-4 py-8">
    {#if $authStore.isLoading}
      <div class="flex items-center justify-center h-64">
        <div class="text-center">
          <div
            class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"
          ></div>
          <p class="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    {:else if $currentRoute === 'home'}
      <div class="max-w-4xl mx-auto text-center py-16">
        <h1 class="text-5xl font-bold text-gray-900 dark:text-white mb-6">
          Welcome to Nudge
        </h1>
        <p class="text-xl text-gray-600 dark:text-gray-300 mb-8">
          A trust-based knowledge platform where <strong>you</strong> decide what to believe.
        </p>

        <div class="grid md:grid-cols-3 gap-6 mb-12">
          <div class="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
            <div class="text-4xl mb-4">📚</div>
            <h3 class="text-lg font-semibold mb-2">Wiki View</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Explore topics with articles filtered by your trust network
            </p>
          </div>
          <div class="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
            <div class="text-4xl mb-4">📰</div>
            <h3 class="text-lg font-semibold mb-2">News View</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              See news ranked by sources you trust
            </p>
          </div>
          <div class="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
            <div class="text-4xl mb-4">💬</div>
            <h3 class="text-lg font-semibold mb-2">Chat View</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Ask questions answered from your trusted knowledge base
            </p>
          </div>
        </div>

        <div class="space-y-4 max-w-2xl mx-auto">
          <div class="p-6 bg-green-50 dark:bg-green-900/20 rounded-lg shadow">
            <h2 class="text-xl font-semibold mb-3 text-green-900 dark:text-green-100">
              ✅ Phase 2 Complete
            </h2>
            <div class="text-left space-y-2 text-sm text-green-800 dark:text-green-200">
              <p>✅ All 8 Lambda functions implemented</p>
              <p>✅ Trust propagation engine complete</p>
              <p>✅ Claude API integration working</p>
              <p>✅ Comprehensive test suite (45+ tests)</p>
            </div>
          </div>

          <div class="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg shadow">
            <h2 class="text-xl font-semibold mb-3 text-blue-900 dark:text-blue-100">
              🚧 Phase 3 In Progress
            </h2>
            <div class="text-left space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <p>✅ Router and navigation</p>
              <p>✅ API client with auth</p>
              <p>✅ Svelte stores for state</p>
              <p>🔄 View components (coming soon)</p>
            </div>
          </div>
        </div>

        {#if !$authStore.isAuthenticated}
          <div class="mt-12">
            <button
              on:click={() => navigate('login')}
              class="px-8 py-3 text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg transition-colors"
            >
              Get Started →
            </button>
          </div>
        {:else}
          <div class="mt-12">
            <button
              on:click={() => navigate('wiki')}
              class="px-8 py-3 text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg transition-colors"
            >
              Go to Wiki →
            </button>
          </div>
        {/if}
      </div>
    {:else if $currentRoute === 'login'}
      <div class="max-w-md mx-auto">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Login
          </h2>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            Login view will be implemented with AWS Cognito
          </p>
          <button
            on:click={() => authStore.login('demo@example.com', 'password')}
            class="w-full px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
          >
            Demo Login
          </button>
        </div>
      </div>
    {:else if $currentRoute === 'wiki'}
      <WikiView />
    {:else if $currentRoute === 'news'}
      <NewsView />
    {:else if $currentRoute === 'chat'}
      <ChatView />
    {:else if $currentRoute === 'profile'}
      <div class="max-w-2xl mx-auto">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          Profile
        </h1>
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <p class="text-gray-600 dark:text-gray-400">
            Profile view component will be implemented here
          </p>
        </div>
      </div>
    {:else if $currentRoute === 'trust'}
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          Trust Network
        </h1>
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <p class="text-gray-600 dark:text-gray-400">
            Trust view component will be implemented here
          </p>
        </div>
      </div>
    {/if}
  </main>

  <footer class="mt-auto py-6 text-center text-sm text-gray-600 dark:text-gray-400">
    <p>Nudge - Trust-Based Knowledge Platform</p>
    <p class="mt-1">Phase 3: Frontend Development in Progress</p>
  </footer>
</div>
