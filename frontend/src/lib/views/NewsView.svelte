<script lang="ts">
  import { onMount } from 'svelte';
  import Button from '../components/common/Button.svelte';
  import Input from '../components/common/Input.svelte';
  import Modal from '../components/common/Modal.svelte';
  import Card from '../components/common/Card.svelte';
  import TrustSlider from '../components/trust/TrustSlider.svelte';
  import TrustBadge from '../components/trust/TrustBadge.svelte';
  import SourceBadge from '../components/trust/SourceBadge.svelte';
  import { getNewsFeed, type NewsItem } from '../api/views';
  import { importNews } from '../api/imports';
  import { userPreferences } from '../stores/user';
  import { setTrust } from '../api/trust';

  let newsItems: NewsItem[] = [];
  let loading = false;
  let error = '';

  // Filters
  let timeRange: 'today' | 'week' | 'month' | 'all' = 'week';
  let trustThreshold = $userPreferences.trustThreshold;
  let limit = 50;

  // Import modal
  let showImportModal = false;
  let importFeedUrl = '';
  let importSourceId = '';
  let importMaxArticles = 10;
  let importLoading = false;
  let importError = '';
  let importSuccess = '';

  // Trust adjustment modal
  let showTrustModal = false;
  let trustModalSource = '';
  let trustModalValue = 0.5;
  let trustModalLoading = false;

  onMount(() => {
    loadNews();
  });

  async function loadNews() {
    loading = true;
    error = '';

    try {
      const since = getSinceTimestamp(timeRange);
      newsItems = await getNewsFeed({ limit, since });
    } catch (e: any) {
      error = e.message || 'Failed to load news feed';
      console.error('News error:', e);
    } finally {
      loading = false;
    }
  }

  function getSinceTimestamp(range: typeof timeRange): string {
    const now = new Date();
    switch (range) {
      case 'today':
        return new Date(now.setHours(0, 0, 0, 0)).toISOString();
      case 'week':
        return new Date(now.setDate(now.getDate() - 7)).toISOString();
      case 'month':
        return new Date(now.setMonth(now.getMonth() - 1)).toISOString();
      case 'all':
        return new Date(0).toISOString();
    }
  }

  function handleTimeRangeChange() {
    loadNews();
  }

  function handleRefresh() {
    loadNews();
  }

  function handleImportClick() {
    showImportModal = true;
    importFeedUrl = '';
    importSourceId = '';
    importError = '';
    importSuccess = '';
  }

  async function handleImportSubmit() {
    if (!importFeedUrl.trim()) {
      importError = 'Please enter an RSS feed URL';
      return;
    }

    importLoading = true;
    importError = '';
    importSuccess = '';

    try {
      const result = await importNews(
        importFeedUrl.trim(),
        importSourceId.trim() || undefined,
        importMaxArticles
      );
      importSuccess = `Import started! Job ID: ${result.jobId}. Processing up to ${importMaxArticles} articles from "${result.sourceId}".`;

      // Refresh after a delay
      setTimeout(() => {
        loadNews();
      }, 5000);
    } catch (e: any) {
      importError = e.message || 'Failed to import RSS feed';
    } finally {
      importLoading = false;
    }
  }

  function handleTrustClick(sourceId: string, currentTrust: number) {
    trustModalSource = sourceId;
    trustModalValue = currentTrust;
    showTrustModal = true;
  }

  async function handleTrustSubmit() {
    trustModalLoading = true;

    try {
      await setTrust({
        targetId: trustModalSource,
        targetType: 'source',
        trustValue: trustModalValue,
      });

      showTrustModal = false;

      // Refresh news to show updated trust scores
      await loadNews();
    } catch (e: any) {
      console.error('Failed to set trust:', e);
    } finally {
      trustModalLoading = false;
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  }

  // Filter by trust threshold
  $: filteredNews = newsItems.filter(item => item.trustValue >= trustThreshold);
</script>

<div class="max-w-6xl mx-auto">
  <!-- Header -->
  <div class="mb-8">
    <div class="flex items-center justify-between mb-2">
      <h1 class="text-4xl font-bold text-gray-900 dark:text-white">News</h1>
      <div class="flex gap-2">
        <Button variant="secondary" on:click={handleRefresh} disabled={loading}>
          Refresh
        </Button>
        <Button on:click={handleImportClick}>
          Import RSS Feed
        </Button>
      </div>
    </div>
    <p class="text-gray-600 dark:text-gray-400">
      News ranked by your trust network and recency
    </p>
  </div>

  <!-- Filters -->
  <div class="mb-6 p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
    <div class="grid md:grid-cols-2 gap-6">
      <!-- Time range -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Time Range
        </label>
        <div class="flex gap-2">
          {#each ['today', 'week', 'month', 'all'] as range}
            <button
              on:click={() => {
                timeRange = range;
                handleTimeRangeChange();
              }}
              class="px-4 py-2 text-sm rounded-md transition-colors {timeRange === range
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}"
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          {/each}
        </div>
      </div>

      <!-- Trust threshold -->
      <div>
        <TrustSlider
          bind:value={trustThreshold}
          label="Trust Threshold"
          showLabels={false}
        />
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Filter news from sources you trust above this level
        </p>
      </div>
    </div>
  </div>

  <!-- Error -->
  {#if error}
    <div class="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
      <p class="text-red-800 dark:text-red-200">
        <strong>Error:</strong>
        {error}
      </p>
    </div>
  {/if}

  <!-- Loading -->
  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
        <p class="text-gray-600 dark:text-gray-400">Loading news...</p>
      </div>
    </div>
  {:else if filteredNews.length === 0}
    <!-- Empty state -->
    <div class="text-center py-12">
      <div class="text-6xl mb-4">📰</div>
      <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        No news found
      </h3>
      <p class="text-gray-600 dark:text-gray-400 mb-6">
        {newsItems.length === 0
          ? 'Import RSS feeds to see news in your feed'
          : 'Try lowering your trust threshold or importing more sources'}
      </p>
      <Button on:click={handleImportClick}>
        Import RSS Feed
      </Button>
    </div>
  {:else}
    <!-- News feed -->
    <div class="space-y-4">
      <p class="text-sm text-gray-600 dark:text-gray-400">
        Showing {filteredNews.length} of {newsItems.length} news items
      </p>

      {#each filteredNews as item (item.assertionId)}
        <Card padding="md" hover>
          <div class="space-y-3">
            <!-- Header -->
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1">
                {#if item.metadata?.title}
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {item.metadata.title}
                  </h3>
                {/if}

                <div class="flex items-center gap-3 text-sm">
                  <SourceBadge
                    sourceId={item.sourceId}
                    sourceUrl={item.sourceUrl}
                    clickable
                    on:click={() => handleTrustClick(item.sourceId, item.trustValue)}
                  />
                  <span class="text-gray-500 dark:text-gray-400">
                    {formatDate(item.publishedAt)}
                  </span>
                </div>
              </div>

              <div class="flex flex-col items-end gap-2">
                <TrustBadge
                  value={item.trustValue}
                  size="sm"
                  clickable
                  on:click={() => handleTrustClick(item.sourceId, item.trustValue)}
                />
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  Score: {item.score.toFixed(2)}
                </div>
              </div>
            </div>

            <!-- Content -->
            <p class="text-gray-700 dark:text-gray-300">
              {item.content}
            </p>

            <!-- Topics -->
            {#if item.metadata?.topics && item.metadata.topics.length > 0}
              <div class="flex flex-wrap gap-2 pt-2">
                {#each item.metadata.topics as topic}
                  <span class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    #{topic}
                  </span>
                {/each}
              </div>
            {/if}

            <!-- Actions -->
            {#if item.sourceUrl}
              <div class="pt-2 border-t border-gray-200 dark:border-gray-700">
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Read full article →
                </a>
              </div>
            {/if}
          </div>
        </Card>
      {/each}
    </div>
  {/if}
</div>

<!-- Import Modal -->
<Modal
  bind:open={showImportModal}
  title="Import RSS Feed"
  size="lg"
  on:close={() => (showImportModal = false)}
>
  <div class="space-y-4">
    <p class="text-gray-600 dark:text-gray-400">
      Enter an RSS feed URL to import news articles and extract assertions.
    </p>

    <Input
      type="url"
      bind:value={importFeedUrl}
      placeholder="https://example.com/rss"
      label="RSS Feed URL"
      error={importError}
      disabled={importLoading}
    />

    <Input
      type="text"
      bind:value={importSourceId}
      placeholder="e.g., NYT, BBC, Reuters (optional)"
      label="Source ID (optional)"
      disabled={importLoading}
    />

    <div>
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Max Articles: {importMaxArticles}
      </label>
      <input
        type="range"
        min="1"
        max="50"
        bind:value={importMaxArticles}
        disabled={importLoading}
        class="w-full"
      />
    </div>

    {#if importSuccess}
      <div class="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
        <p class="text-green-800 dark:text-green-200">
          {importSuccess}
        </p>
      </div>
    {/if}

    <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
      <p class="text-sm text-blue-800 dark:text-blue-200">
        <strong>Note:</strong> Import is asynchronous. Articles will be processed
        in the background and appear in your feed shortly.
      </p>
    </div>
  </div>

  <svelte:fragment slot="footer">
    <Button variant="secondary" on:click={() => (showImportModal = false)}>
      Cancel
    </Button>
    <Button on:click={handleImportSubmit} loading={importLoading} disabled={!importFeedUrl.trim()}>
      Import
    </Button>
  </svelte:fragment>
</Modal>

<!-- Trust Adjustment Modal -->
<Modal
  bind:open={showTrustModal}
  title="Adjust Trust for {trustModalSource}"
  size="md"
  on:close={() => (showTrustModal = false)}
>
  <div class="space-y-4">
    <p class="text-gray-600 dark:text-gray-400">
      Set your trust level for this source. This will affect how prominently
      content from this source appears in your feed.
    </p>

    <TrustSlider
      bind:value={trustModalValue}
      label="Trust Level"
    />
  </div>

  <svelte:fragment slot="footer">
    <Button variant="secondary" on:click={() => (showTrustModal = false)}>
      Cancel
    </Button>
    <Button on:click={handleTrustSubmit} loading={trustModalLoading}>
      Save Trust Value
    </Button>
  </svelte:fragment>
</Modal>
