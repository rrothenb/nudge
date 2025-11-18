<script lang="ts">
  import TrustBadge from './TrustBadge.svelte';

  export let sourceId: string;
  export let sourceUrl: string | undefined = undefined;
  export let trustValue: number | undefined = undefined;
  export let size: 'sm' | 'md' | 'lg' = 'sm';
  export let clickable = false;

  /**
   * Get icon for source type
   */
  function getSourceIcon(source: string): string {
    const s = source.toUpperCase();
    if (s === 'WIKIPEDIA') return '📚';
    if (s === 'NYT' || s === 'NYTIMES') return '📰';
    if (s === 'BBC') return '📻';
    if (s === 'REUTERS') return '📡';
    if (s === 'AP') return '📄';
    if (s === 'CNN') return '📺';
    if (s === 'FOX' || s === 'FOXNEWS') return '🦊';
    if (s === 'GUARDIAN') return '🗞️';
    if (s === 'WAPO' || s === 'WASHINGTONPOST') return '🏛️';
    if (s.startsWith('USER')) return '👤';
    return '🌐';
  }

  /**
   * Get display name for source
   */
  function getSourceName(source: string): string {
    const s = source.toUpperCase();
    if (s === 'WIKIPEDIA') return 'Wikipedia';
    if (s === 'NYT' || s === 'NYTIMES') return 'NY Times';
    if (s === 'BBC') return 'BBC';
    if (s === 'REUTERS') return 'Reuters';
    if (s === 'AP') return 'AP News';
    if (s === 'CNN') return 'CNN';
    if (s === 'FOX' || s === 'FOXNEWS') return 'Fox News';
    if (s === 'GUARDIAN') return 'The Guardian';
    if (s === 'WAPO' || s === 'WASHINGTONPOST') return 'Washington Post';
    return source;
  }

  $: icon = getSourceIcon(sourceId);
  $: name = getSourceName(sourceId);
  $: hasLink = sourceUrl && sourceUrl.length > 0;
</script>

<div
  class="inline-flex items-center gap-2 {clickable ? 'cursor-pointer' : ''}"
  on:click
>
  <!-- Source info -->
  <div class="inline-flex items-center gap-1">
    <span class="text-lg">{icon}</span>
    {#if hasLink}
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        class="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
        on:click|stopPropagation
      >
        {name}
      </a>
    {:else}
      <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
        {name}
      </span>
    {/if}
  </div>

  <!-- Trust badge if provided -->
  {#if trustValue !== undefined}
    <TrustBadge value={trustValue} {size} showValue={false} />
  {/if}
</div>
