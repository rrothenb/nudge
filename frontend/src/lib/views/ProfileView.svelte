<script lang="ts">
  import { onMount } from 'svelte';
  import Button from '../components/common/Button.svelte';
  import Input from '../components/common/Input.svelte';
  import Card from '../components/common/Card.svelte';
  import TrustSlider from '../components/trust/TrustSlider.svelte';
  import { userStore } from '../stores/user';
  import { updateUserProfile } from '../api/users';
  import { authStore } from '../stores/auth';
  import type { ViewType } from '@nudge/shared';

  let editing = false;
  let loading = false;
  let error = '';
  let success = '';

  // Form fields
  let displayName = '';
  let bio = '';
  let defaultTrustThreshold = 0.5;
  let defaultView: ViewType = 'wiki';

  // Load user data
  onMount(() => {
    loadProfileData();
  });

  userStore.subscribe((user) => {
    if (user && !editing) {
      loadProfileData();
    }
  });

  function loadProfileData() {
    const user = $userStore;
    if (user) {
      displayName = user.displayName;
      bio = user.bio || '';
      defaultTrustThreshold = user.defaultTrustThreshold;
      defaultView = user.defaultView;
    }
  }

  function handleEdit() {
    editing = true;
    error = '';
    success = '';
  }

  function handleCancel() {
    editing = false;
    loadProfileData();
    error = '';
    success = '';
  }

  async function handleSave() {
    loading = true;
    error = '';
    success = '';

    try {
      const updates = {
        displayName: displayName.trim(),
        bio: bio.trim() || undefined,
        defaultTrustThreshold,
        defaultView,
      };

      await updateUserProfile(updates);
      await userStore.load(); // Reload user data

      editing = false;
      success = 'Profile updated successfully!';

      setTimeout(() => {
        success = '';
      }, 3000);
    } catch (e: any) {
      error = e.message || 'Failed to update profile';
      console.error('Profile update error:', e);
    } finally {
      loading = false;
    }
  }

  async function handleLogout() {
    if (confirm('Are you sure you want to log out?')) {
      await authStore.logout();
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
</script>

<div class="max-w-3xl mx-auto">
  <!-- Header -->
  <div class="mb-8">
    <h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-2">Profile</h1>
    <p class="text-gray-600 dark:text-gray-400">
      Manage your account and preferences
    </p>
  </div>

  <!-- Success Message -->
  {#if success}
    <div class="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
      <p class="text-green-800 dark:text-green-200">
        {success}
      </p>
    </div>
  {/if}

  <!-- Error Message -->
  {#if error}
    <div class="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
      <p class="text-red-800 dark:text-red-200">
        <strong>Error:</strong>
        {error}
      </p>
    </div>
  {/if}

  <!-- Profile Information Card -->
  <Card padding="lg">
    <div class="space-y-6">
      <div class="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-2xl font-semibold text-gray-900 dark:text-white">
          Account Information
        </h2>
        {#if !editing}
          <Button on:click={handleEdit}>Edit Profile</Button>
        {/if}
      </div>

      <!-- Email (read-only) -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Email
        </label>
        <p class="text-gray-900 dark:text-gray-100">
          {$userStore?.email || 'Loading...'}
        </p>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Email cannot be changed
        </p>
      </div>

      <!-- Display Name -->
      <div>
        {#if editing}
          <Input
            type="text"
            bind:value={displayName}
            label="Display Name"
            placeholder="Your name"
            disabled={loading}
          />
        {:else}
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Display Name
          </label>
          <p class="text-gray-900 dark:text-gray-100">
            {displayName || 'Not set'}
          </p>
        {/if}
      </div>

      <!-- Bio -->
      <div>
        {#if editing}
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Bio
          </label>
          <textarea
            bind:value={bio}
            placeholder="Tell us about yourself (optional)"
            disabled={loading}
            rows="3"
            class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        {:else}
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Bio
          </label>
          <p class="text-gray-900 dark:text-gray-100">
            {bio || 'No bio provided'}
          </p>
        {/if}
      </div>

      <!-- Account Metadata -->
      {#if $userStore}
        <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-gray-500 dark:text-gray-400">Member since:</span>
              <p class="text-gray-900 dark:text-gray-100 mt-1">
                {formatDate($userStore.createdAt)}
              </p>
            </div>
            {#if $userStore.lastLoginAt}
              <div>
                <span class="text-gray-500 dark:text-gray-400">Last login:</span>
                <p class="text-gray-900 dark:text-gray-100 mt-1">
                  {formatDate($userStore.lastLoginAt)}
                </p>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </Card>

  <!-- Preferences Card -->
  <Card padding="lg" class="mt-6">
    <div class="space-y-6">
      <div class="pb-4 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-2xl font-semibold text-gray-900 dark:text-white">
          Preferences
        </h2>
      </div>

      <!-- Default View -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Default View
        </label>
        {#if editing}
          <select
            bind:value={defaultView}
            disabled={loading}
            class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="wiki">📚 Wiki View</option>
            <option value="news">📰 News View</option>
            <option value="chat">💬 Chat View</option>
          </select>
        {:else}
          <p class="text-gray-900 dark:text-gray-100">
            {#if defaultView === 'wiki'}
              📚 Wiki View
            {:else if defaultView === 'news'}
              📰 News View
            {:else if defaultView === 'chat'}
              💬 Chat View
            {/if}
          </p>
        {/if}
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          The view you see when you first log in
        </p>
      </div>

      <!-- Trust Threshold -->
      <div>
        <TrustSlider
          bind:value={defaultTrustThreshold}
          label="Default Trust Threshold"
          disabled={!editing}
        />
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Content from sources below this trust level will be hidden by default
        </p>
      </div>

    </div>
  </Card>

  <!-- Actions -->
  {#if editing}
    <div class="mt-6 flex gap-3">
      <Button on:click={handleSave} loading={loading} disabled={loading}>
        Save Changes
      </Button>
      <Button variant="secondary" on:click={handleCancel} disabled={loading}>
        Cancel
      </Button>
    </div>
  {:else}
    <div class="mt-6">
      <Button variant="danger" on:click={handleLogout}>
        Log Out
      </Button>
    </div>
  {/if}
</div>
