<script lang="ts">
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let color: 'blue' | 'white' | 'gray' = 'blue';

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  const colorClasses = {
    blue: 'border-blue-600',
    white: 'border-white',
    gray: 'border-gray-600',
  };

  $: classes = [
    'animate-spin rounded-full border-b-2',
    sizeClasses[size],
    colorClasses[color],
  ].join(' ');
</script>

<div class={classes} />
