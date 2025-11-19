<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Modal from '../common/Modal.svelte';
  import Button from '../common/Button.svelte';
  import TrustSlider from './TrustSlider.svelte';
  import { setTrust, removeTrust } from '../../api/trust';
  import type { TargetType } from '@nudge/shared';

  export let show: boolean = false;
  export let targetId: string = '';
  export let targetType: TargetType = 'source';
  export let targetName: string = '';
  export let initialValue: number = 0.5;
  export let allowDelete: boolean = true;

  const dispatch = createEventDispatcher();

  let trustValue = initialValue;
  let notes = '';
  let loading = false;
  let error = '';

  $: if (show) {
    trustValue = initialValue;
    notes = '';
    error = '';
  }

  function handleClose() {
    show = false;
    dispatch('close');
  }

  async function handleSave() {
    loading = true;
    error = '';

    try {
      await setTrust({
        targetId,
        targetType,
        trustValue,
        notes: notes.trim() || undefined,
      });

      dispatch('saved', { targetId, trustValue, notes });
      handleClose();
    } catch (e: any) {
      error = e.message || 'Failed to save trust';
      console.error('Trust save error:', e);
    } finally {
      loading = false;
    }
  }

  async function handleDelete() {
    if (!confirm(`Remove trust relationship with ${targetName}?`)) {
      return;
    }

    loading = true;
    error = '';

    try {
      await removeTrust(targetId);
      dispatch('deleted', { targetId });
      handleClose();
    } catch (e: any) {
      error = e.message || 'Failed to remove trust';
      console.error('Trust delete error:', e);
    } finally {
      loading = false;
    }
  }

  function getTrustLabel(value: number): string {
    if (value >= 0.9) return 'Highly Trust';
    if (value >= 0.7) return 'Trust';
    if (value >= 0.4) return 'Neutral';
    if (value >= 0.2) return 'Distrust';
    return 'Strongly Distrust';
  }

  function getTypeLabel(type: TargetType): string {
    switch (type) {
      case 'user': return 'User';
      case 'source': return 'Source';
      case 'assertion': return 'Assertion';
      case 'group': return 'Group';
      default: return type;
    }
  }
</script>

<Modal {show} title="Set Trust Level" on:close={handleClose}>
  <div class="space-y-6">
    <!-- Target info -->
    <div class="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <div class="text-sm text-gray-600 dark:text-gray-400 mb-1">
        {getTypeLabel(targetType)}
      </div>
      <div class="font-semibold text-gray-900 dark:text-white">
        {targetName}
      </div>
    </div>

    <!-- Trust slider -->
    <div>
      <div class="flex justify-between items-center mb-2">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Trust Level
        </label>
        <span class="text-sm text-gray-600 dark:text-gray-400">
          {getTrustLabel(trustValue)}
        </span>
      </div>
      <TrustSlider
        bind:value={trustValue}
        showValue={true}
        disabled={loading}
      />
      <div class="mt-2 flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>Don't Trust</span>
        <span>Neutral</span>
        <span>Fully Trust</span>
      </div>
    </div>

    <!-- Notes -->
    <div>
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Notes (optional)
      </label>
      <textarea
        bind:value={notes}
        placeholder="Why do you trust or distrust this?"
        rows="2"
        disabled={loading}
        class="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600
               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
               bg-white dark:bg-gray-700 text-gray-900 dark:text-white
               placeholder-gray-500 dark:placeholder-gray-400"
      ></textarea>
    </div>

    <!-- Error -->
    {#if error}
      <div class="p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
        <p class="text-sm text-red-800 dark:text-red-200">{error}</p>
      </div>
    {/if}

    <!-- Actions -->
    <div class="flex justify-between pt-4">
      <div>
        {#if allowDelete && initialValue !== 0.5}
          <Button
            variant="danger"
            on:click={handleDelete}
            disabled={loading}
          >
            Remove Trust
          </Button>
        {/if}
      </div>
      <div class="flex gap-3">
        <Button
          variant="secondary"
          on:click={handleClose}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          on:click={handleSave}
          {loading}
          disabled={loading}
        >
          Save
        </Button>
      </div>
    </div>
  </div>
</Modal>
