<script lang="ts">
  import Card from '../common/Card.svelte';
  import TrustBadge from '../trust/TrustBadge.svelte';

  export let topic: string;
  export let content: string;
  export let trustScore: number | undefined = undefined;
  export let sources: string[] = [];
  export let generatedAt: string | undefined = undefined;
  export let loading = false;

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString();
  }
</script>

<Card padding="lg">
  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="text-center">
        <div
          class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"
        />
        <p class="text-gray-600 dark:text-gray-400">Generating article...</p>
      </div>
    </div>
  {:else}
    <!-- Header -->
    <div class="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-3">
        {topic}
      </h1>

      <div class="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
        {#if trustScore !== undefined}
          <div class="flex items-center gap-2">
            <span>Trust Score:</span>
            <TrustBadge value={trustScore} size="sm" />
          </div>
        {/if}

        {#if generatedAt}
          <span>Generated {formatDate(generatedAt)}</span>
        {/if}

        {#if sources.length > 0}
          <span>{sources.length} sources</span>
        {/if}
      </div>
    </div>

    <!-- Content -->
    <div class="prose dark:prose-invert max-w-none">
      {@html content
        .split('\n\n')
        .map((p) => `<p>${p}</p>`)
        .join('')}
    </div>

    <!-- Sources -->
    {#if sources.length > 0}
      <div class="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Sources
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
          {#each sources as source}
            <div
              class="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z"
                  clip-rule="evenodd"
                />
              </svg>
              {source}
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Note about trust filtering -->
    <div class="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
      <p class="text-sm text-blue-800 dark:text-blue-200">
        <strong>Note:</strong> This article is personalized based on your trust network.
        Different users may see different content for the same topic.
      </p>
    </div>
  {/if}
</Card>
