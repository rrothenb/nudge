<script lang="ts">
  export let value: number;
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let showValue = true;
  export let clickable = false;

  /**
   * Get color classes based on trust value
   */
  function getTrustColorClasses(val: number): string {
    if (val < 0.3)
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    if (val < 0.5)
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
    if (val < 0.7)
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    if (val < 0.9)
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    return 'bg-green-200 text-green-900 dark:bg-green-800/30 dark:text-green-200';
  }

  function getTrustLabel(val: number): string {
    if (val < 0.3) return 'Distrust';
    if (val < 0.5) return 'Low';
    if (val < 0.7) return 'Neutral';
    if (val < 0.9) return 'Trust';
    return 'High';
  }

  function getTrustEmoji(val: number): string {
    if (val < 0.3) return '🔴';
    if (val < 0.5) return '🟠';
    if (val < 0.7) return '🟡';
    if (val < 0.9) return '🟢';
    return '✅';
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  $: colorClasses = getTrustColorClasses(value);
  $: label = getTrustLabel(value);
  $: emoji = getTrustEmoji(value);
  $: classes = [
    'inline-flex items-center font-semibold rounded-full',
    sizeClasses[size],
    colorClasses,
    clickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : '',
  ].join(' ');
</script>

<span class={classes} on:click title="Trust: {value.toFixed(2)}">
  <span class="mr-1">{emoji}</span>
  {label}
  {#if showValue}
    <span class="ml-1 opacity-75">({value.toFixed(2)})</span>
  {/if}
</span>
