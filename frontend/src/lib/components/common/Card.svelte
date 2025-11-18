<script lang="ts">
  export let padding: 'none' | 'sm' | 'md' | 'lg' = 'md';
  export let hover = false;
  export let clickable = false;

  const paddingClasses = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  $: classes = [
    'bg-white dark:bg-gray-800 rounded-lg shadow',
    paddingClasses[padding],
    hover ? 'hover:shadow-lg transition-shadow duration-200' : '',
    clickable ? 'cursor-pointer' : '',
  ].join(' ');
</script>

<div class={classes} on:click {...$$restProps}>
  <slot />
</div>
