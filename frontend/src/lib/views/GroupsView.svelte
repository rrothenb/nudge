<script lang="ts">
  import { onMount } from 'svelte';
  import type { Group } from '@nudge/shared';
  import Button from '../components/common/Button.svelte';
  import GroupCard from '../components/groups/GroupCard.svelte';
  import CreateGroupModal from '../components/groups/CreateGroupModal.svelte';
  import { getGroups } from '../api/groups';
  import { setTrust } from '../api/trust';

  let groups: Group[] = [];
  let loading = true;
  let error = '';
  let showCreateModal = false;
  let filterType: 'all' | 'system' | 'mine' | 'public' = 'all';

  onMount(() => {
    loadGroups();
  });

  async function loadGroups() {
    loading = true;
    error = '';

    try {
      groups = await getGroups();
    } catch (e: any) {
      error = e.message || 'Failed to load groups';
      console.error('Load groups error:', e);
    } finally {
      loading = false;
    }
  }

  function handleViewGroup(group: Group) {
    // TODO: Navigate to group detail view or show modal
    console.log('View group:', group);
  }

  async function handleTrustGroup(group: Group) {
    // Prompt for trust value
    const trustValue = prompt(
      `Set trust level for "${group.name}" (0-1):`,
      '0.7'
    );

    if (trustValue === null) return;

    const value = parseFloat(trustValue);
    if (isNaN(value) || value < 0 || value > 1) {
      alert('Please enter a value between 0 and 1');
      return;
    }

    try {
      await setTrust({
        targetId: group.groupId,
        targetType: 'group',
        trustValue: value,
      });
      alert(`Trust set to ${value} for ${group.name}`);
    } catch (e: any) {
      alert(`Failed to set trust: ${e.message}`);
    }
  }

  function handleGroupCreated(event: CustomEvent<Group>) {
    groups = [...groups, event.detail];
  }

  $: filteredGroups = groups.filter((g) => {
    if (filterType === 'all') return true;
    if (filterType === 'system') return g.isSystemDefined;
    if (filterType === 'mine') return !g.isSystemDefined && g.createdBy === 'current-user'; // TODO: Use actual userId
    if (filterType === 'public') return g.visibility === 'public';
    return true;
  });
</script>

<div class="max-w-6xl mx-auto">
  <!-- Header -->
  <div class="mb-8">
    <div class="flex items-center justify-between mb-2">
      <h1 class="text-4xl font-bold text-gray-900 dark:text-white">Groups</h1>
      <Button on:click={() => (showCreateModal = true)}>
        Create Group
      </Button>
    </div>
    <p class="text-gray-600 dark:text-gray-400">
      Organize and trust collections of users, sources, and assertions
    </p>
  </div>

  <!-- Filters -->
  <div class="mb-6 flex gap-2">
    <Button
      variant={filterType === 'all' ? 'primary' : 'secondary'}
      size="sm"
      on:click={() => (filterType = 'all')}
    >
      All Groups
    </Button>
    <Button
      variant={filterType === 'system' ? 'primary' : 'secondary'}
      size="sm"
      on:click={() => (filterType = 'system')}
    >
      System
    </Button>
    <Button
      variant={filterType === 'mine' ? 'primary' : 'secondary'}
      size="sm"
      on:click={() => (filterType = 'mine')}
    >
      My Groups
    </Button>
    <Button
      variant={filterType === 'public' ? 'primary' : 'secondary'}
      size="sm"
      on:click={() => (filterType = 'public')}
    >
      Public
    </Button>
  </div>

  <!-- Loading -->
  {#if loading}
    <div class="text-center py-12">
      <div class="text-4xl mb-4">⏳</div>
      <p class="text-gray-600 dark:text-gray-400">Loading groups...</p>
    </div>
  {/if}

  <!-- Error -->
  {#if error}
    <div class="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
      <p class="text-red-800 dark:text-red-200">
        <strong>Error:</strong>
        {error}
      </p>
      <Button variant="secondary" size="sm" on:click={loadGroups} class="mt-3">
        Retry
      </Button>
    </div>
  {/if}

  <!-- Groups Grid -->
  {#if !loading && !error}
    {#if filteredGroups.length === 0}
      <div class="text-center py-12">
        <div class="text-6xl mb-4">👥</div>
        <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No groups found
        </h3>
        <p class="text-gray-600 dark:text-gray-400 mb-4">
          {filterType === 'mine'
            ? "You haven't created any groups yet"
            : 'No groups match your filter'}
        </p>
        {#if filterType === 'all' || filterType === 'mine'}
          <Button on:click={() => (showCreateModal = true)}>
            Create Your First Group
          </Button>
        {/if}
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each filteredGroups as group (group.groupId)}
          <GroupCard
            {group}
            onView={handleViewGroup}
            onTrust={handleTrustGroup}
          />
        {/each}
      </div>

      <div class="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
        Showing {filteredGroups.length} of {groups.length} groups
      </div>
    {/if}
  {/if}
</div>

<!-- Create Group Modal -->
<CreateGroupModal
  bind:show={showCreateModal}
  on:created={handleGroupCreated}
/>
