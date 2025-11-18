<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let open = false;
  export let title = '';
  export let size: 'sm' | 'md' | 'lg' | 'xl' = 'md';

  const dispatch = createEventDispatcher();

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  function handleClose() {
    dispatch('close');
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }
</script>

{#if open}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
    on:click={handleBackdropClick}
    on:keydown={(e) => e.key === 'Escape' && handleClose()}
    role="button"
    tabindex="-1"
  >
    <!-- Modal -->
    <div
      class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full {sizeClasses[
        size
      ]} max-h-[90vh] overflow-y-auto"
      on:click|stopPropagation
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <!-- Header -->
      {#if title || $$slots.header}
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between">
            {#if $$slots.header}
              <slot name="header" />
            {:else}
              <h3
                id="modal-title"
                class="text-lg font-semibold text-gray-900 dark:text-white"
              >
                {title}
              </h3>
            {/if}
            <button
              on:click={handleClose}
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg
                class="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      {/if}

      <!-- Body -->
      <div class="px-6 py-4">
        <slot />
      </div>

      <!-- Footer -->
      {#if $$slots.footer}
        <div
          class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3"
        >
          <slot name="footer" />
        </div>
      {/if}
    </div>
  </div>
{/if}
