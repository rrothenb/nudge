<script lang="ts">
  import { onMount } from 'svelte';
  import Button from '../components/common/Button.svelte';
  import Input from '../components/common/Input.svelte';
  import Modal from '../components/common/Modal.svelte';
  import TrustSlider from '../components/trust/TrustSlider.svelte';
  import ArticleView from '../components/content/ArticleView.svelte';
  import { getWikiArticle, type WikiArticle } from '../api/views';
  import { importWikipedia } from '../api/imports';
  import { userPreferences } from '../stores/user';

  let searchTopic = '';
  let currentTopic = '';
  let article: WikiArticle | null = null;
  let loading = false;
  let error = '';

  // Trust controls
  let trustThreshold = $userPreferences.trustThreshold;
  let openMindedness = $userPreferences.openMindedness;

  // Import modal
  let showImportModal = false;
  let importUrl = '';
  let importLoading = false;
  let importError = '';
  let importSuccess = '';

  // Recent topics (from localStorage)
  let recentTopics: string[] = [];

  onMount(() => {
    loadRecentTopics();
  });

  function loadRecentTopics() {
    try {
      const stored = localStorage.getItem('wiki_recent_topics');
      if (stored) {
        recentTopics = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load recent topics:', e);
    }
  }

  function saveRecentTopic(topic: string) {
    if (!recentTopics.includes(topic)) {
      recentTopics = [topic, ...recentTopics].slice(0, 10);
      localStorage.setItem('wiki_recent_topics', JSON.stringify(recentTopics));
    }
  }

  async function handleSearch(e?: Event) {
    e?.preventDefault();

    if (!searchTopic.trim()) {
      error = 'Please enter a topic to search';
      return;
    }

    currentTopic = searchTopic.trim();
    saveRecentTopic(currentTopic);
    await loadArticle();
  }

  async function loadArticle() {
    if (!currentTopic) return;

    loading = true;
    error = '';
    article = null;

    try {
      article = await getWikiArticle(currentTopic);
    } catch (e: any) {
      error = e.message || 'Failed to load article';
      console.error('Wiki error:', e);
    } finally {
      loading = false;
    }
  }

  async function handleRecentTopicClick(topic: string) {
    searchTopic = topic;
    currentTopic = topic;
    await loadArticle();
  }

  function handleRefresh() {
    loadArticle();
  }

  function handleImportClick() {
    showImportModal = true;
    importUrl = '';
    importError = '';
    importSuccess = '';
  }

  async function handleImportSubmit() {
    if (!importUrl.trim()) {
      importError = 'Please enter a Wikipedia URL';
      return;
    }

    importLoading = true;
    importError = '';
    importSuccess = '';

    try {
      const result = await importWikipedia(importUrl.trim());
      importSuccess = `Import started! Job ID: ${result.jobId}. The article "${result.title}" is being processed.`;
      importUrl = '';

      // If the imported topic matches current search, refresh after a delay
      if (result.title && currentTopic.toLowerCase() === result.title.toLowerCase()) {
        setTimeout(() => {
          loadArticle();
        }, 5000);
      }
    } catch (e: any) {
      importError = e.message || 'Failed to import article';
    } finally {
      importLoading = false;
    }
  }

  // Suggested topics
  const suggestedTopics = [
    'Quantum Computing',
    'Climate Change',
    'Artificial Intelligence',
    'Solar System',
    'Photosynthesis',
    'World War II',
  ];
</script>

<div class="max-w-6xl mx-auto">
  <!-- Header -->
  <div class="mb-8">
    <h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-2">Wiki</h1>
    <p class="text-gray-600 dark:text-gray-400">
      Explore topics with articles filtered by your trust network
    </p>
  </div>

  <!-- Search -->
  <div class="mb-6">
    <form on:submit={handleSearch} class="flex gap-3">
      <div class="flex-1">
        <Input
          type="search"
          bind:value={searchTopic}
          placeholder="Search for a topic... (e.g., Quantum Computing)"
          label=""
          error=""
        />
      </div>
      <Button type="submit" {loading} disabled={!searchTopic.trim()}>
        Search
      </Button>
      <Button variant="secondary" on:click={handleImportClick}>
        Import Article
      </Button>
    </form>
  </div>

  <!-- Trust Controls -->
  {#if article || loading}
    <div class="mb-6 p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Trust Filters
      </h3>

      <div class="grid md:grid-cols-2 gap-6">
        <div>
          <TrustSlider
            bind:value={trustThreshold}
            label="Trust Threshold"
            on:change={handleRefresh}
          />
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Only show content from sources you trust above this level
          </p>
        </div>

        <div>
          <TrustSlider
            bind:value={openMindedness}
            label="Open-Mindedness"
            on:change={handleRefresh}
          />
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Show content slightly below your trust threshold for discovery
          </p>
        </div>
      </div>
    </div>
  {/if}

  <!-- Error -->
  {#if error}
    <div class="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
      <p class="text-red-800 dark:text-red-200">
        <strong>Error:</strong>
        {error}
      </p>
    </div>
  {/if}

  <!-- Article -->
  {#if loading || article}
    <ArticleView
      topic={currentTopic}
      content={article?.content || ''}
      trustScore={article?.trustScore}
      sources={article?.sources || []}
      generatedAt={article?.generatedAt}
      {loading}
    />
  {:else}
    <!-- Empty state -->
    <div class="text-center py-12">
      <div class="text-6xl mb-4">📚</div>
      <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        No topic selected
      </h3>
      <p class="text-gray-600 dark:text-gray-400 mb-6">
        Search for a topic to see a trust-filtered article
      </p>

      <!-- Suggested topics -->
      <div class="max-w-2xl mx-auto">
        <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Suggested topics:
        </p>
        <div class="flex flex-wrap justify-center gap-2">
          {#each suggestedTopics as topic}
            <button
              on:click={() => {
                searchTopic = topic;
                handleSearch();
              }}
              class="px-3 py-1.5 text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded-md transition-colors"
            >
              {topic}
            </button>
          {/each}
        </div>
      </div>

      <!-- Recent topics -->
      {#if recentTopics.length > 0}
        <div class="mt-8 max-w-2xl mx-auto">
          <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Recent topics:
          </p>
          <div class="flex flex-wrap justify-center gap-2">
            {#each recentTopics as topic}
              <button
                on:click={() => handleRecentTopicClick(topic)}
                class="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md transition-colors"
              >
                {topic}
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- Import Modal -->
<Modal
  bind:open={showImportModal}
  title="Import Wikipedia Article"
  size="lg"
  on:close={() => (showImportModal = false)}
>
  <div class="space-y-4">
    <p class="text-gray-600 dark:text-gray-400">
      Enter a Wikipedia URL to import the article and extract assertions.
    </p>

    <Input
      type="url"
      bind:value={importUrl}
      placeholder="https://en.wikipedia.org/wiki/Quantum_computing"
      label="Wikipedia URL"
      error={importError}
      disabled={importLoading}
    />

    {#if importSuccess}
      <div class="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
        <p class="text-green-800 dark:text-green-200">
          {importSuccess}
        </p>
      </div>
    {/if}

    <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
      <p class="text-sm text-blue-800 dark:text-blue-200">
        <strong>Note:</strong> Import is asynchronous. The article will be processed
        in the background and assertions will be available shortly.
      </p>
    </div>
  </div>

  <svelte:fragment slot="footer">
    <Button variant="secondary" on:click={() => (showImportModal = false)}>
      Cancel
    </Button>
    <Button on:click={handleImportSubmit} loading={importLoading} disabled={!importUrl.trim()}>
      Import
    </Button>
  </svelte:fragment>
</Modal>
