<script lang="ts">
  export let type: 'text' | 'email' | 'password' | 'number' | 'url' | 'search' = 'text';
  export let value = '';
  export let placeholder = '';
  export let label = '';
  export let error = '';
  export let disabled = false;
  export let required = false;
  export let id = '';

  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  $: inputClasses = [
    'w-full px-4 py-2 rounded-md border',
    'focus:outline-none focus:ring-2',
    error
      ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
      : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500',
    'bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
    'placeholder-gray-500 dark:placeholder-gray-400',
    disabled ? 'opacity-50 cursor-not-allowed' : '',
  ].join(' ');
</script>

<div class="mb-4">
  {#if label}
    <label
      for={inputId}
      class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
    >
      {label}
      {#if required}
        <span class="text-red-500">*</span>
      {/if}
    </label>
  {/if}

  <input
    {type}
    {placeholder}
    {disabled}
    {required}
    id={inputId}
    bind:value
    class={inputClasses}
    on:input
    on:change
    on:focus
    on:blur
    {...$$restProps}
  />

  {#if error}
    <p class="mt-1 text-sm text-red-600 dark:text-red-400">
      {error}
    </p>
  {/if}
</div>
