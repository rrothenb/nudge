<script lang="ts">
  import { navigate } from '../utils/router';
  import { authStore } from '../stores/auth';
  import Button from '../components/common/Button.svelte';
  import Input from '../components/common/Input.svelte';
  import Card from '../components/common/Card.svelte';

  let mode: 'login' | 'signup' = 'login';
  let email = '';
  let password = '';
  let displayName = '';
  let loading = false;
  let error = '';

  async function handleLogin() {
    if (!email || !password) {
      error = 'Please enter email and password';
      return;
    }

    loading = true;
    error = '';

    const success = await authStore.login(email, password);

    if (success) {
      navigate('wiki'); // Redirect to default view
    } else {
      error = 'Login failed. Please try again.';
      loading = false;
    }
  }

  async function handleSignup() {
    if (!email || !password || !displayName) {
      error = 'Please fill in all fields';
      return;
    }

    if (password.length < 8) {
      error = 'Password must be at least 8 characters';
      return;
    }

    loading = true;
    error = '';

    const success = await authStore.signup(email, password, displayName);

    if (success) {
      navigate('wiki'); // Redirect to default view
    } else {
      error = 'Signup failed. Please try again.';
      loading = false;
    }
  }

  function handleSubmit(e: Event) {
    e.preventDefault();
    if (mode === 'login') {
      handleLogin();
    } else {
      handleSignup();
    }
  }

  function switchMode() {
    mode = mode === 'login' ? 'signup' : 'login';
    error = '';
    password = '';
  }

  // Quick login for demo
  function quickLogin() {
    email = 'demo@example.com';
    password = 'password';
    handleLogin();
  }
</script>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
  <div class="w-full max-w-md">
    <!-- Logo/Title -->
    <div class="text-center mb-8">
      <h1 class="text-5xl font-bold text-gray-900 dark:text-white mb-2">Nudge</h1>
      <p class="text-lg text-gray-600 dark:text-gray-400">
        Trust-Based Knowledge Platform
      </p>
    </div>

    <!-- Login/Signup Card -->
    <Card padding="lg">
      <div class="space-y-6">
        <!-- Mode Toggle -->
        <div class="flex border-b border-gray-200 dark:border-gray-700">
          <button
            type="button"
            on:click={() => (mode = 'login')}
            class="flex-1 py-3 text-center font-medium transition-colors {mode === 'login'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}"
          >
            Log In
          </button>
          <button
            type="button"
            on:click={() => (mode = 'signup')}
            class="flex-1 py-3 text-center font-medium transition-colors {mode === 'signup'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}"
          >
            Sign Up
          </button>
        </div>

        <!-- Form -->
        <form on:submit={handleSubmit} class="space-y-4">
          {#if mode === 'signup'}
            <Input
              type="text"
              bind:value={displayName}
              label="Display Name"
              placeholder="Your name"
              disabled={loading}
              required
            />
          {/if}

          <Input
            type="email"
            bind:value={email}
            label="Email"
            placeholder="you@example.com"
            disabled={loading}
            required
          />

          <Input
            type="password"
            bind:value={password}
            label="Password"
            placeholder="••••••••"
            disabled={loading}
            required
          />

          {#if error}
            <div class="p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
              <p class="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          {/if}

          <Button type="submit" class="w-full" loading={loading} disabled={loading}>
            {mode === 'login' ? 'Log In' : 'Create Account'}
          </Button>
        </form>

        <!-- Divider -->
        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-300 dark:border-gray-600" />
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              For Demo
            </span>
          </div>
        </div>

        <!-- Quick Login -->
        <Button variant="secondary" on:click={quickLogin} class="w-full" disabled={loading}>
          Quick Login (Demo User)
        </Button>

        <!-- Info -->
        <div class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p class="text-xs text-blue-800 dark:text-blue-200">
            <strong>Development Mode:</strong> Using mock authentication. Any email/password
            will work for testing.
          </p>
        </div>
      </div>
    </Card>

    <!-- Footer -->
    <div class="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
      <p>
        Build your personalized knowledge network based on who and what you trust.
      </p>
    </div>
  </div>
</div>
