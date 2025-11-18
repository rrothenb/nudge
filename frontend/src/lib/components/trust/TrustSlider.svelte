<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let value = 0.5;
  export let label = 'Trust Level';
  export let showValue = true;
  export let showLabels = true;
  export let disabled = false;
  export let min = 0;
  export let max = 1;
  export let step = 0.05;

  const dispatch = createEventDispatcher();

  /**
   * Get color based on trust value
   * 0.0-0.3: Red (distrust)
   * 0.3-0.5: Orange (low trust)
   * 0.5-0.7: Yellow (neutral/default)
   * 0.7-0.9: Light green (trust)
   * 0.9-1.0: Dark green (high trust)
   */
  function getTrustColor(val: number): string {
    if (val < 0.3) return 'bg-red-500';
    if (val < 0.5) return 'bg-orange-500';
    if (val < 0.7) return 'bg-yellow-500';
    if (val < 0.9) return 'bg-green-400';
    return 'bg-green-600';
  }

  function getTrustLabel(val: number): string {
    if (val < 0.3) return 'Distrust';
    if (val < 0.5) return 'Low Trust';
    if (val < 0.7) return 'Neutral';
    if (val < 0.9) return 'Trust';
    return 'High Trust';
  }

  function handleChange(e: Event) {
    const target = e.target as HTMLInputElement;
    value = parseFloat(target.value);
    dispatch('change', value);
  }

  $: percentage = ((value - min) / (max - min)) * 100;
  $: colorClass = getTrustColor(value);
  $: trustLabel = getTrustLabel(value);
</script>

<div class="trust-slider">
  {#if label}
    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
      {label}
      {#if showValue}
        <span class="float-right {colorClass.replace('bg-', 'text-')} font-semibold">
          {trustLabel} ({value.toFixed(2)})
        </span>
      {/if}
    </label>
  {/if}

  <div class="relative pt-1">
    <!-- Track background -->
    <div class="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      <!-- Filled portion -->
      <div
        class="absolute h-full {colorClass} transition-all duration-200 rounded-full"
        style="width: {percentage}%"
      />
    </div>

    <!-- Slider input -->
    <input
      type="range"
      {min}
      {max}
      {step}
      {disabled}
      bind:value
      on:input={handleChange}
      class="absolute top-0 left-0 w-full h-3 opacity-0 cursor-pointer {disabled
        ? 'cursor-not-allowed'
        : ''}"
    />

    <!-- Labels -->
    {#if showLabels}
      <div class="flex justify-between mt-2 text-xs text-gray-600 dark:text-gray-400">
        <span>Distrust (0.0)</span>
        <span>Neutral (0.5)</span>
        <span>High Trust (1.0)</span>
      </div>
    {/if}
  </div>

  {#if value === 0.5}
    <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
      <strong>Default value</strong> - No explicit trust relationship set
    </p>
  {/if}
</div>

<style>
  input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 1.25rem;
    height: 1.25rem;
    border-radius: 50%;
    background: white;
    border: 2px solid #3b82f6;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  input[type='range']::-moz-range-thumb {
    width: 1.25rem;
    height: 1.25rem;
    border-radius: 50%;
    background: white;
    border: 2px solid #3b82f6;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  input[type='range']:disabled::-webkit-slider-thumb {
    cursor: not-allowed;
    opacity: 0.5;
  }

  input[type='range']:disabled::-moz-range-thumb {
    cursor: not-allowed;
    opacity: 0.5;
  }
</style>
