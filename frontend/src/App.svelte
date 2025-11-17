<script lang="ts">
  import { onMount } from 'svelte';

  let message = 'Trust Platform';
  let subtitle = 'Building infrastructure for personalized knowledge...';

  onMount(() => {
    console.log('Trust Platform Frontend Initialized');
  });
</script>

<main class="min-h-screen bg-gray-50 dark:bg-gray-900">
  <div class="container mx-auto px-4 py-16">
    <div class="text-center">
      <h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-4">
        {message}
      </h1>
      <p class="text-xl text-gray-600 dark:text-gray-300 mb-8">
        {subtitle}
      </p>
      <div class="space-y-4 max-w-md mx-auto">
        <div class="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
          <h2 class="text-lg font-semibold mb-2">Phase 1: Setup Complete ✅</h2>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Project structure, shared types, and SAM template configured
          </p>
        </div>
        <div class="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
          <h2 class="text-lg font-semibold mb-2">Next: Build Backend</h2>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Lambda functions, DynamoDB access layer, and Claude API integration
          </p>
        </div>
      </div>
    </div>
  </div>
</main>

<style>
  /* Additional component styles if needed */
</style>
