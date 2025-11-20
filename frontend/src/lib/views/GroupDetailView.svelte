<script lang="ts">
  import { onMount } from 'svelte';
  import type { Group, GroupMember } from '@nudge/shared';
  import Button from '../components/common/Button.svelte';
  import TrustSetterModal from '../components/trust/TrustSetterModal.svelte';
  import { getGroup, deleteGroup, removeGroupMember, addGroupMember } from '../api/groups';
  import { navigate, routeParams } from '../utils/router';
  import { user } from '../stores/user';

  let group: Group | null = null;
  let loading = true;
  let error = '';
  let showTrustModal = false;
  let showAddMemberModal = false;

  // Add member form
  let newMemberId = '';
  let newMemberType: 'user' | 'source' | 'assertion' = 'user';
  let newMemberNotes = '';
  let addingMember = false;

  $: groupId = $routeParams.groupId || '';

  $: if (groupId) {
    loadGroup();
  }

  async function loadGroup() {
    if (!groupId) return;

    loading = true;
    error = '';

    try {
      group = await getGroup(groupId);
    } catch (e: any) {
      error = e.message || 'Failed to load group';
      console.error('Load group error:', e);
    } finally {
      loading = false;
    }
  }

  async function handleDeleteGroup() {
    if (!group) return;

    if (!confirm(`Are you sure you want to delete "${group.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      await deleteGroup(group.groupId);
      navigate('groups');
    } catch (e: any) {
      error = e.message || 'Failed to delete group';
    }
  }

  async function handleRemoveMember(member: GroupMember) {
    if (!group) return;

    if (!confirm(`Remove this ${member.memberType} from the group?`)) {
      return;
    }

    try {
      group = await removeGroupMember(group.groupId, member.memberId);
    } catch (e: any) {
      error = e.message || 'Failed to remove member';
    }
  }

  async function handleAddMember() {
    if (!group || !newMemberId.trim()) return;

    addingMember = true;
    error = '';

    try {
      group = await addGroupMember(group.groupId, {
        memberId: newMemberId.trim(),
        memberType: newMemberType,
        notes: newMemberNotes.trim() || undefined,
      });

      // Reset form
      newMemberId = '';
      newMemberNotes = '';
      showAddMemberModal = false;
    } catch (e: any) {
      error = e.message || 'Failed to add member';
    } finally {
      addingMember = false;
    }
  }

  function handleTrustSaved() {
    console.log('Trust saved for group');
  }

  function getMemberTypeIcon(type: string): string {
    switch (type) {
      case 'user': return '👤';
      case 'source': return '📰';
      case 'assertion': return '📝';
      default: return '❓';
    }
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  function canEdit(): boolean {
    if (!group) return false;
    // System groups cannot be edited
    if (group.isSystemDefined) return false;
    // Only the creator can edit
    return group.createdBy === $user?.userId;
  }
</script>

<div class="max-w-4xl mx-auto">
  <!-- Back button -->
  <div class="mb-6">
    <Button variant="secondary" size="sm" on:click={() => navigate('groups')}>
      ← Back to Groups
    </Button>
  </div>

  <!-- Loading -->
  {#if loading}
    <div class="text-center py-12">
      <div class="text-4xl mb-4">⏳</div>
      <p class="text-gray-600 dark:text-gray-400">Loading group...</p>
    </div>
  {/if}

  <!-- Error -->
  {#if error}
    <div class="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
      <p class="text-red-800 dark:text-red-200">
        <strong>Error:</strong> {error}
      </p>
      <Button variant="secondary" size="sm" on:click={loadGroup} class="mt-3">
        Retry
      </Button>
    </div>
  {/if}

  <!-- Group Details -->
  {#if !loading && group}
    <!-- Header -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
      <div class="flex items-start justify-between mb-4">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {group.name}
          </h1>
          {#if group.description}
            <p class="text-gray-600 dark:text-gray-400">
              {group.description}
            </p>
          {/if}
        </div>
        <div class="flex gap-2">
          <Button on:click={() => (showTrustModal = true)}>
            Set Trust
          </Button>
          {#if canEdit()}
            <Button variant="danger" on:click={handleDeleteGroup}>
              Delete
            </Button>
          {/if}
        </div>
      </div>

      <!-- Metadata -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <span class="text-gray-500 dark:text-gray-400">Visibility</span>
          <p class="font-medium text-gray-900 dark:text-white capitalize">
            {group.visibility}
          </p>
        </div>
        <div>
          <span class="text-gray-500 dark:text-gray-400">Type</span>
          <p class="font-medium text-gray-900 dark:text-white">
            {group.isSystemDefined ? 'System' : 'User-created'}
          </p>
        </div>
        <div>
          <span class="text-gray-500 dark:text-gray-400">Members</span>
          <p class="font-medium text-gray-900 dark:text-white">
            {group.members.length}
          </p>
        </div>
        <div>
          <span class="text-gray-500 dark:text-gray-400">Created</span>
          <p class="font-medium text-gray-900 dark:text-white">
            {formatDate(group.createdAt)}
          </p>
        </div>
      </div>

      <!-- Tags -->
      {#if group.tags && group.tags.length > 0}
        <div class="mt-4 flex flex-wrap gap-2">
          {#each group.tags as tag}
            <span class="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
              {tag}
            </span>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Members Section -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
          Members
        </h2>
        {#if canEdit()}
          <Button size="sm" on:click={() => (showAddMemberModal = true)}>
            Add Member
          </Button>
        {/if}
      </div>

      {#if group.members.length === 0}
        <div class="text-center py-8">
          <p class="text-gray-500 dark:text-gray-400">
            This group has no members yet.
          </p>
          {#if canEdit()}
            <Button size="sm" on:click={() => (showAddMemberModal = true)} class="mt-3">
              Add First Member
            </Button>
          {/if}
        </div>
      {:else}
        <div class="space-y-3">
          {#each group.members as member (member.memberId)}
            <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div class="flex items-center gap-3">
                <span class="text-2xl">{getMemberTypeIcon(member.memberType)}</span>
                <div>
                  <p class="font-medium text-gray-900 dark:text-white">
                    {member.memberId}
                  </p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    {member.memberType} • Added {formatDate(member.addedAt)}
                  </p>
                  {#if member.notes}
                    <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      {member.notes}
                    </p>
                  {/if}
                </div>
              </div>
              {#if canEdit()}
                <Button
                  variant="secondary"
                  size="sm"
                  on:click={() => handleRemoveMember(member)}
                >
                  Remove
                </Button>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- Trust Setter Modal -->
{#if group}
  <TrustSetterModal
    bind:show={showTrustModal}
    targetId={group.groupId}
    targetType="group"
    targetName={group.name}
    initialValue={0.5}
    on:saved={handleTrustSaved}
  />
{/if}

<!-- Add Member Modal -->
{#if showAddMemberModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
      <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Add Member
      </h3>

      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Member Type
          </label>
          <select
            bind:value={newMemberType}
            class="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="user">User</option>
            <option value="source">Source</option>
            <option value="assertion">Assertion</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Member ID
          </label>
          <input
            type="text"
            bind:value={newMemberId}
            placeholder="Enter the {newMemberType} ID"
            class="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Notes (optional)
          </label>
          <input
            type="text"
            bind:value={newMemberNotes}
            placeholder="Why are you adding this member?"
            class="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      <div class="flex justify-end gap-3 mt-6">
        <Button variant="secondary" on:click={() => (showAddMemberModal = false)}>
          Cancel
        </Button>
        <Button
          on:click={handleAddMember}
          loading={addingMember}
          disabled={!newMemberId.trim() || addingMember}
        >
          Add Member
        </Button>
      </div>
    </div>
  </div>
{/if}
