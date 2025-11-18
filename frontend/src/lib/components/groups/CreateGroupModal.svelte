<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { CreateGroupInput } from '@nudge/shared';
  import Modal from '../common/Modal.svelte';
  import Input from '../common/Input.svelte';
  import Button from '../common/Button.svelte';
  import { createGroup } from '../../api/groups';

  export let show: boolean = false;

  const dispatch = createEventDispatcher();

  let name = '';
  let description = '';
  let visibility: 'public' | 'private' = 'public';
  let tags: string = '';
  let loading = false;
  let error = '';

  function handleClose() {
    show = false;
    dispatch('close');
    resetForm();
  }

  function resetForm() {
    name = '';
    description = '';
    visibility = 'public';
    tags = '';
    error = '';
  }

  async function handleSubmit() {
    error = '';

    if (!name.trim()) {
      error = 'Group name is required';
      return;
    }

    loading = true;

    try {
      const input: CreateGroupInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        visibility,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t.length > 0),
      };

      const newGroup = await createGroup(input);
      dispatch('created', newGroup);
      handleClose();
    } catch (e: any) {
      error = e.message || 'Failed to create group';
      console.error('Create group error:', e);
    } finally {
      loading = false;
    }
  }
</script>

<Modal {show} title="Create New Group" on:close={handleClose}>
  <form on:submit|preventDefault={handleSubmit} class="space-y-4">
    <!-- Name -->
    <Input
      bind:value={name}
      label="Group Name"
      placeholder="e.g., Climate Scientists, Tech Journalists..."
      required
      disabled={loading}
    />

    <!-- Description -->
    <div>
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Description (optional)
      </label>
      <textarea
        bind:value={description}
        placeholder="What does this group represent?"
        rows="3"
        disabled={loading}
        class="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600
               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
               bg-white dark:bg-gray-700 text-gray-900 dark:text-white
               placeholder-gray-500 dark:placeholder-gray-400"
      ></textarea>
    </div>

    <!-- Visibility -->
    <div>
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Visibility
      </label>
      <div class="flex gap-4">
        <label class="flex items-center cursor-pointer">
          <input
            type="radio"
            bind:group={visibility}
            value="public"
            disabled={loading}
            class="mr-2"
          />
          <span class="text-sm text-gray-700 dark:text-gray-300">
            Public (others can see and use this group)
          </span>
        </label>
        <label class="flex items-center cursor-pointer">
          <input
            type="radio"
            bind:group={visibility}
            value="private"
            disabled={loading}
            class="mr-2"
          />
          <span class="text-sm text-gray-700 dark:text-gray-300">
            Private (only you can see this)
          </span>
        </label>
      </div>
    </div>

    <!-- Tags -->
    <Input
      bind:value={tags}
      label="Tags (optional)"
      placeholder="science, media, tech (comma-separated)"
      disabled={loading}
    />

    <!-- Error -->
    {#if error}
      <div class="p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
        <p class="text-sm text-red-800 dark:text-red-200">{error}</p>
      </div>
    {/if}

    <!-- Actions -->
    <div class="flex gap-3 justify-end pt-4">
      <Button
        type="button"
        variant="secondary"
        on:click={handleClose}
        disabled={loading}
      >
        Cancel
      </Button>
      <Button
        type="submit"
        {loading}
        disabled={loading || !name.trim()}
      >
        Create Group
      </Button>
    </div>
  </form>
</Modal>
