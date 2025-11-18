<script lang="ts">
  import type { Group } from '@nudge/shared';
  import Card from '../common/Card.svelte';
  import Button from '../common/Button.svelte';

  export let group: Group;
  export let onView: (group: Group) => void = () => {};
  export let onTrust: (group: Group) => void = () => {};
  export let showTrustButton: boolean = true;

  function formatMemberCount(count: number): string {
    if (count === 0) return 'No members';
    if (count === 1) return '1 member';
    return `${count} members`;
  }

  function getMemberTypeCounts(group: Group) {
    const users = group.members.filter(m => m.memberType === 'user').length;
    const sources = group.members.filter(m => m.memberType === 'source').length;
    const assertions = group.members.filter(m => m.memberType === 'assertion').length;
    return { users, sources, assertions };
  }

  $: memberCounts = getMemberTypeCounts(group);
</script>

<Card clickable on:click={() => onView(group)}>
  <div class="p-4">
    <!-- Header -->
    <div class="flex items-start justify-between mb-3">
      <div class="flex-1">
        <div class="flex items-center gap-2 mb-1">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            {group.name}
          </h3>
          {#if group.isSystemDefined}
            <span class="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
              System
            </span>
          {/if}
          {#if group.visibility === 'private'}
            <span class="px-2 py-0.5 text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded">
              Private
            </span>
          {/if}
        </div>
        {#if group.description}
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {group.description}
          </p>
        {/if}
      </div>
    </div>

    <!-- Member counts -->
    <div class="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
      <span>{formatMemberCount(group.members.length)}</span>
      {#if memberCounts.users > 0}
        <span>👥 {memberCounts.users}</span>
      {/if}
      {#if memberCounts.sources > 0}
        <span>📰 {memberCounts.sources}</span>
      {/if}
      {#if memberCounts.assertions > 0}
        <span>📝 {memberCounts.assertions}</span>
      {/if}
    </div>

    <!-- Tags -->
    {#if group.tags && group.tags.length > 0}
      <div class="flex flex-wrap gap-2 mb-3">
        {#each group.tags as tag}
          <span class="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
            #{tag}
          </span>
        {/each}
      </div>
    {/if}

    <!-- Actions -->
    <div class="flex gap-2" on:click|stopPropagation>
      <Button
        size="sm"
        variant="secondary"
        on:click={() => onView(group)}
      >
        View Details
      </Button>
      {#if showTrustButton}
        <Button
          size="sm"
          on:click={() => onTrust(group)}
        >
          Set Trust
        </Button>
      {/if}
    </div>

    <!-- Footer -->
    <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
      {#if group.isSystemDefined}
        System defined
      {:else}
        Created by {group.createdBy}
      {/if}
    </div>
  </div>
</Card>
