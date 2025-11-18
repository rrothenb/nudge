<script lang="ts">
  import { onMount } from 'svelte';
  import Button from '../components/common/Button.svelte';
  import Input from '../components/common/Input.svelte';
  import Card from '../components/common/Card.svelte';
  import Modal from '../components/common/Modal.svelte';
  import TrustSlider from '../components/trust/TrustSlider.svelte';
  import TrustBadge from '../components/trust/TrustBadge.svelte';
  import SourceBadge from '../components/trust/SourceBadge.svelte';
  import { listTrust, setTrust, removeTrust, type SetTrustInput } from '../api/trust';
  import type { TrustRelationship, TargetType } from '@nudge/shared';

  let relationships: TrustRelationship[] = [];
  let loading = false;
  let error = '';

  // Filter
  let filterType: TargetType | 'all' = 'all';
  let searchQuery = '';

  // Add/Edit modal
  let showModal = false;
  let modalMode: 'add' | 'edit' = 'add';
  let modalTargetId = '';
  let modalTargetType: TargetType = 'source';
  let modalTrustValue = 0.5;
  let modalNotes = '';
  let modalLoading = false;
  let modalError = '';
  let editingRelationship: TrustRelationship | null = null;

  onMount(() => {
    loadTrustRelationships();
  });

  async function loadTrustRelationships() {
    loading = true;
    error = '';

    try {
      relationships = await listTrust();
    } catch (e: any) {
      error = e.message || 'Failed to load trust relationships';
      console.error('Trust load error:', e);
    } finally {
      loading = false;
    }
  }

  function handleAddClick() {
    modalMode = 'add';
    modalTargetId = '';
    modalTargetType = 'source';
    modalTrustValue = 0.5;
    modalNotes = '';
    modalError = '';
    editingRelationship = null;
    showModal = true;
  }

  function handleEditClick(relationship: TrustRelationship) {
    modalMode = 'edit';
    modalTargetId = relationship.targetId;
    modalTargetType = relationship.targetType;
    modalTrustValue = relationship.trustValue;
    modalNotes = relationship.notes || '';
    modalError = '';
    editingRelationship = relationship;
    showModal = true;
  }

  async function handleModalSubmit() {
    if (!modalTargetId.trim()) {
      modalError = 'Target ID is required';
      return;
    }

    if (modalTrustValue < 0 || modalTrustValue > 1) {
      modalError = 'Trust value must be between 0 and 1';
      return;
    }

    modalLoading = true;
    modalError = '';

    try {
      const input: SetTrustInput = {
        targetId: modalTargetId.trim(),
        targetType: modalTargetType,
        trustValue: modalTrustValue,
      };

      if (modalNotes.trim()) {
        input.notes = modalNotes.trim();
      }

      await setTrust(input);
      await loadTrustRelationships();

      showModal = false;
    } catch (e: any) {
      modalError = e.message || 'Failed to save trust relationship';
      console.error('Trust save error:', e);
    } finally {
      modalLoading = false;
    }
  }

  async function handleRemove(relationship: TrustRelationship) {
    if (!confirm(`Remove trust relationship with ${relationship.targetId}?`)) {
      return;
    }

    try {
      await removeTrust(relationship.targetId);
      await loadTrustRelationships();
    } catch (e: any) {
      error = e.message || 'Failed to remove trust relationship';
      console.error('Trust remove error:', e);

      setTimeout(() => {
        error = '';
      }, 5000);
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays < 1) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;

    return date.toLocaleDateString();
  }

  function getTargetIcon(type: TargetType): string {
    switch (type) {
      case 'user':
        return '👤';
      case 'source':
        return '📰';
      case 'assertion':
        return '💬';
    }
  }

  // Filtered relationships
  $: filteredRelationships = relationships.filter((rel) => {
    // Filter by type
    if (filterType !== 'all' && rel.targetType !== filterType) {
      return false;
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        rel.targetId.toLowerCase().includes(query) ||
        rel.notes?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  // Group by type
  $: groupedRelationships = {
    user: filteredRelationships.filter((r) => r.targetType === 'user'),
    source: filteredRelationships.filter((r) => r.targetType === 'source'),
    assertion: filteredRelationships.filter((r) => r.targetType === 'assertion'),
  };

  // Statistics
  $: stats = {
    total: relationships.length,
    users: relationships.filter((r) => r.targetType === 'user').length,
    sources: relationships.filter((r) => r.targetType === 'source').length,
    assertions: relationships.filter((r) => r.targetType === 'assertion').length,
    direct: relationships.filter((r) => r.isDirectTrust).length,
    propagated: relationships.filter((r) => !r.isDirectTrust).length,
  };
</script>

<div class="max-w-6xl mx-auto">
  <!-- Header -->
  <div class="mb-8">
    <div class="flex items-center justify-between mb-2">
      <h1 class="text-4xl font-bold text-gray-900 dark:text-white">Trust Network</h1>
      <Button on:click={handleAddClick}>Add Trust Relationship</Button>
    </div>
    <p class="text-gray-600 dark:text-gray-400">
      Manage your trust relationships and see how trust propagates
    </p>
  </div>

  <!-- Statistics -->
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
    <Card padding="md">
      <div class="text-center">
        <p class="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Total</p>
      </div>
    </Card>
    <Card padding="md">
      <div class="text-center">
        <p class="text-3xl font-bold text-gray-900 dark:text-white">{stats.direct}</p>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Direct</p>
      </div>
    </Card>
    <Card padding="md">
      <div class="text-center">
        <p class="text-3xl font-bold text-gray-900 dark:text-white">{stats.sources}</p>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Sources</p>
      </div>
    </Card>
    <Card padding="md">
      <div class="text-center">
        <p class="text-3xl font-bold text-gray-900 dark:text-white">{stats.users}</p>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Users</p>
      </div>
    </Card>
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

  <!-- Filters -->
  <div class="mb-6 p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
    <div class="grid md:grid-cols-2 gap-4">
      <!-- Type filter -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Filter by Type
        </label>
        <div class="flex gap-2 flex-wrap">
          {#each [['all', 'All'], ['user', 'Users'], ['source', 'Sources'], ['assertion', 'Assertions']] as [type, label]}
            <button
              on:click={() => (filterType = type)}
              class="px-4 py-2 text-sm rounded-md transition-colors {filterType === type
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}"
            >
              {label}
            </button>
          {/each}
        </div>
      </div>

      <!-- Search -->
      <div>
        <Input
          type="text"
          bind:value={searchQuery}
          placeholder="Search by ID or notes..."
          label="Search"
        />
      </div>
    </div>
  </div>

  <!-- Loading -->
  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
        <p class="text-gray-600 dark:text-gray-400">Loading trust relationships...</p>
      </div>
    </div>
  {:else if filteredRelationships.length === 0}
    <!-- Empty state -->
    <div class="text-center py-12">
      <div class="text-6xl mb-4">🤝</div>
      <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        {relationships.length === 0 ? 'No trust relationships yet' : 'No matching relationships'}
      </h3>
      <p class="text-gray-600 dark:text-gray-400 mb-6">
        {relationships.length === 0
          ? 'Add trust relationships to build your personalized knowledge network'
          : 'Try adjusting your filters'}
      </p>
      {#if relationships.length === 0}
        <Button on:click={handleAddClick}>Add Your First Trust Relationship</Button>
      {/if}
    </div>
  {:else}
    <!-- Relationships List -->
    <div class="space-y-6">
      {#if filterType === 'all' || filterType === 'source'}
        {#if groupedRelationships.source.length > 0}
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              📰 Sources ({groupedRelationships.source.length})
            </h3>
            <div class="space-y-3">
              {#each groupedRelationships.source as rel (rel.targetId)}
                <Card padding="md" hover>
                  <div class="flex items-center justify-between gap-4">
                    <div class="flex-1">
                      <SourceBadge sourceId={rel.targetId} />
                      {#if rel.notes}
                        <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          {rel.notes}
                        </p>
                      {/if}
                      <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Updated {formatDate(rel.lastUpdated)}
                        {#if !rel.isDirectTrust}
                          • Propagated
                        {/if}
                      </p>
                    </div>
                    <div class="flex items-center gap-3">
                      <TrustBadge value={rel.trustValue} size="sm" />
                      {#if rel.isDirectTrust}
                        <div class="flex gap-2">
                          <Button variant="secondary" on:click={() => handleEditClick(rel)}>
                            Edit
                          </Button>
                          <Button variant="danger" on:click={() => handleRemove(rel)}>
                            Remove
                          </Button>
                        </div>
                      {/if}
                    </div>
                  </div>
                </Card>
              {/each}
            </div>
          </div>
        {/if}
      {/if}

      {#if filterType === 'all' || filterType === 'user'}
        {#if groupedRelationships.user.length > 0}
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              👤 Users ({groupedRelationships.user.length})
            </h3>
            <div class="space-y-3">
              {#each groupedRelationships.user as rel (rel.targetId)}
                <Card padding="md" hover>
                  <div class="flex items-center justify-between gap-4">
                    <div class="flex-1">
                      <div class="flex items-center gap-2">
                        <span class="text-lg">👤</span>
                        <span class="text-sm font-medium text-gray-900 dark:text-white">
                          {rel.targetId}
                        </span>
                      </div>
                      {#if rel.notes}
                        <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          {rel.notes}
                        </p>
                      {/if}
                      <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Updated {formatDate(rel.lastUpdated)}
                        {#if !rel.isDirectTrust}
                          • Propagated
                        {/if}
                      </p>
                    </div>
                    <div class="flex items-center gap-3">
                      <TrustBadge value={rel.trustValue} size="sm" />
                      {#if rel.isDirectTrust}
                        <div class="flex gap-2">
                          <Button variant="secondary" on:click={() => handleEditClick(rel)}>
                            Edit
                          </Button>
                          <Button variant="danger" on:click={() => handleRemove(rel)}>
                            Remove
                          </Button>
                        </div>
                      {/if}
                    </div>
                  </div>
                </Card>
              {/each}
            </div>
          </div>
        {/if}
      {/if}

      {#if filterType === 'all' || filterType === 'assertion'}
        {#if groupedRelationships.assertion.length > 0}
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              💬 Assertions ({groupedRelationships.assertion.length})
            </h3>
            <div class="space-y-3">
              {#each groupedRelationships.assertion as rel (rel.targetId)}
                <Card padding="md" hover>
                  <div class="flex items-center justify-between gap-4">
                    <div class="flex-1">
                      <div class="flex items-center gap-2">
                        <span class="text-lg">💬</span>
                        <span class="text-sm font-mono text-gray-700 dark:text-gray-300">
                          {rel.targetId.substring(0, 16)}...
                        </span>
                      </div>
                      {#if rel.notes}
                        <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          {rel.notes}
                        </p>
                      {/if}
                      <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Updated {formatDate(rel.lastUpdated)}
                        {#if !rel.isDirectTrust}
                          • Propagated
                        {/if}
                      </p>
                    </div>
                    <div class="flex items-center gap-3">
                      <TrustBadge value={rel.trustValue} size="sm" />
                      {#if rel.isDirectTrust}
                        <div class="flex gap-2">
                          <Button variant="secondary" on:click={() => handleEditClick(rel)}>
                            Edit
                          </Button>
                          <Button variant="danger" on:click={() => handleRemove(rel)}>
                            Remove
                          </Button>
                        </div>
                      {/if}
                    </div>
                  </div>
                </Card>
              {/each}
            </div>
          </div>
        {/if}
      {/if}
    </div>
  {/if}
</div>

<!-- Add/Edit Modal -->
<Modal
  bind:open={showModal}
  title={modalMode === 'add' ? 'Add Trust Relationship' : 'Edit Trust Relationship'}
  size="md"
  on:close={() => (showModal = false)}
>
  <div class="space-y-4">
    {#if modalError}
      <div class="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <p class="text-red-800 dark:text-red-200">
          {modalError}
        </p>
      </div>
    {/if}

    <!-- Target Type -->
    <div>
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Target Type
      </label>
      <select
        bind:value={modalTargetType}
        disabled={modalLoading || modalMode === 'edit'}
        class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      >
        <option value="source">📰 Source</option>
        <option value="user">👤 User</option>
        <option value="assertion">💬 Assertion</option>
      </select>
    </div>

    <!-- Target ID -->
    <Input
      type="text"
      bind:value={modalTargetId}
      label="Target ID"
      placeholder={modalTargetType === 'source'
        ? 'e.g., Wikipedia, NYT, BBC'
        : modalTargetType === 'user'
          ? 'e.g., user-uuid'
          : 'e.g., assertion-uuid'}
      disabled={modalLoading || modalMode === 'edit'}
    />

    <!-- Trust Value -->
    <TrustSlider bind:value={modalTrustValue} label="Trust Value" disabled={modalLoading} />

    <!-- Notes -->
    <div>
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Notes (optional)
      </label>
      <textarea
        bind:value={modalNotes}
        placeholder="Why do you trust or distrust this target?"
        disabled={modalLoading}
        rows="3"
        class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      />
    </div>
  </div>

  <svelte:fragment slot="footer">
    <Button variant="secondary" on:click={() => (showModal = false)} disabled={modalLoading}>
      Cancel
    </Button>
    <Button on:click={handleModalSubmit} loading={modalLoading} disabled={modalLoading}>
      {modalMode === 'add' ? 'Add' : 'Save'}
    </Button>
  </svelte:fragment>
</Modal>
