<script lang="ts">
  import type { Assertion } from '@nudge/shared';
  import SourceBadge from '../trust/SourceBadge.svelte';
  import TrustBadge from '../trust/TrustBadge.svelte';
  import Card from '../common/Card.svelte';
  import { createEventDispatcher } from 'svelte';

  export let assertion: Assertion;
  export let trustValue: number | undefined = undefined;
  export let expanded = false;
  export let showTrustControls = false;

  const dispatch = createEventDispatcher();

  function toggleExpanded() {
    expanded = !expanded;
  }

  function handleTrustClick() {
    dispatch('trustClick', { assertion, currentTrust: trustValue });
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

  $: topics = assertion.metadata?.topics || [];
  $: hasMetadata = topics.length > 0 || assertion.metadata?.title;
</script>

<Card padding="md" hover clickable on:click={toggleExpanded}>
  <div class="space-y-3">
    <!-- Header: Source and trust -->
    <div class="flex items-start justify-between gap-3">
      <SourceBadge
        sourceId={assertion.sourceId}
        sourceUrl={assertion.sourceUrl}
        trustValue={trustValue}
        size="sm"
      />

      <div class="flex items-center gap-2">
        {#if trustValue !== undefined}
          <TrustBadge value={trustValue} size="sm" clickable on:click={handleTrustClick} />
        {/if}

        <span class="text-xs text-gray-500 dark:text-gray-400">
          {formatDate(assertion.createdAt)}
        </span>
      </div>
    </div>

    <!-- Content -->
    <div class="prose dark:prose-invert max-w-none">
      <p class="text-gray-900 dark:text-gray-100 {expanded ? '' : 'line-clamp-3'}">
        {assertion.content}
      </p>
    </div>

    <!-- Metadata (expanded) -->
    {#if expanded && hasMetadata}
      <div class="pt-3 border-t border-gray-200 dark:border-gray-700">
        {#if assertion.metadata?.title}
          <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            From: {assertion.metadata.title}
          </p>
        {/if}

        {#if topics.length > 0}
          <div class="flex flex-wrap gap-2">
            {#each topics as topic}
              <span
                class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
              >
                #{topic}
              </span>
            {/each}
          </div>
        {/if}

        {#if assertion.metadata?.confidence}
          <div class="mt-2 text-xs text-gray-600 dark:text-gray-400">
            Confidence: {(assertion.metadata.confidence * 100).toFixed(0)}%
          </div>
        {/if}
      </div>
    {/if}

    <!-- Actions (expanded) -->
    {#if expanded && showTrustControls}
      <div class="pt-3 border-t border-gray-200 dark:border-gray-700">
        <div class="flex gap-2">
          <button
            on:click|stopPropagation={handleTrustClick}
            class="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
          >
            Adjust Trust
          </button>
          {#if assertion.sourceUrl}
            <a
              href={assertion.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              class="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
              on:click|stopPropagation
            >
              View Source →
            </a>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Expand indicator -->
    {#if !expanded}
      <div class="flex justify-center pt-2">
        <button
          on:click|stopPropagation={toggleExpanded}
          class="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          Click to expand
          <svg
            class="inline-block w-3 h-3 ml-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>
    {/if}
  </div>
</Card>

<style>
  .line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
