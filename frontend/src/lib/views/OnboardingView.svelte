<script lang="ts">
  import { onMount } from 'svelte';
  import { navigate } from '../utils/router';
  import { userStore } from '../stores/user';
  import { setTrust } from '../api/trust';
  import { getGroups } from '../api/groups';
  import Button from '../components/common/Button.svelte';
  import Card from '../components/common/Card.svelte';
  import TrustSlider from '../components/trust/TrustSlider.svelte';
  import type { Group, SetTrustInput } from '@nudge/shared';

  let step = 1;
  const totalSteps = 4;
  let loading = false;
  let error = '';

  // Step 1: Groups
  let groups: Group[] = [];
  let groupTrust: Record<string, number> = {};

  // Step 2: Sources
  const sources = [
    { id: 'Wikipedia', name: 'Wikipedia', description: 'Crowdsourced encyclopedia' },
    { id: 'NYT', name: 'New York Times', description: 'Major US newspaper' },
    { id: 'BBC', name: 'BBC News', description: 'British public broadcaster' },
    { id: 'Nature', name: 'Nature', description: 'Peer-reviewed scientific journal' },
    { id: 'ArXiv', name: 'ArXiv', description: 'Preprint repository' },
    { id: 'FoxNews', name: 'Fox News', description: 'Conservative US news' },
    { id: 'MSNBC', name: 'MSNBC', description: 'Progressive US news' },
  ];
  let sourceTrust: Record<string, number> = {};

  // Step 3: Polarizing assertions that help filter content
  const assertions = [
    {
      id: 'assertion-climate',
      content: 'Climate change is primarily caused by human activities',
      topic: 'climate',
    },
    {
      id: 'assertion-vaccines',
      content: 'Vaccines are safe and effective for most people',
      topic: 'health',
    },
    {
      id: 'assertion-evolution',
      content: 'Evolution by natural selection explains the diversity of life',
      topic: 'science',
    },
    {
      id: 'assertion-ai-risk',
      content: 'Advanced AI poses significant existential risks to humanity',
      topic: 'technology',
    },
    {
      id: 'assertion-free-market',
      content: 'Free markets generally produce better outcomes than government intervention',
      topic: 'economics',
    },
  ];
  let assertionTrust: Record<string, number> = {};

  onMount(async () => {
    // Initialize all trust values to 0.5 (neutral)
    sources.forEach(s => sourceTrust[s.id] = 0.5);
    assertions.forEach(a => assertionTrust[a.id] = 0.5);

    // Load groups
    try {
      groups = await getGroups();
      groups.forEach(g => groupTrust[g.groupId] = 0.5);
    } catch (e) {
      console.error('Failed to load groups:', e);
    }
  });

  async function handleNext() {
    if (step < totalSteps) {
      step++;
    } else {
      await saveAndFinish();
    }
  }

  function handleBack() {
    if (step > 1) {
      step--;
    }
  }

  function handleSkip() {
    navigate('wiki');
  }

  async function saveAndFinish() {
    loading = true;
    error = '';

    try {
      const trustInputs: SetTrustInput[] = [];

      // Collect group trust (only non-neutral values)
      Object.entries(groupTrust).forEach(([targetId, trustValue]) => {
        if (trustValue !== 0.5) {
          trustInputs.push({ targetId, targetType: 'group', trustValue });
        }
      });

      // Collect source trust
      Object.entries(sourceTrust).forEach(([targetId, trustValue]) => {
        if (trustValue !== 0.5) {
          trustInputs.push({ targetId, targetType: 'source', trustValue });
        }
      });

      // Collect assertion trust
      Object.entries(assertionTrust).forEach(([targetId, trustValue]) => {
        if (trustValue !== 0.5) {
          trustInputs.push({ targetId, targetType: 'assertion', trustValue });
        }
      });

      // Save all trust relationships
      for (const input of trustInputs) {
        await setTrust(input);
      }

      // Mark onboarding complete
      localStorage.setItem('onboarding_complete', 'true');

      // Reload user to get updated trust network
      await userStore.load();

      // Navigate to wiki
      navigate('wiki');
    } catch (e: any) {
      error = e.message || 'Failed to save preferences';
      console.error('Onboarding error:', e);
    } finally {
      loading = false;
    }
  }

  function getTrustLabel(value: number): string {
    if (value >= 0.9) return 'Highly Trust';
    if (value >= 0.7) return 'Trust';
    if (value >= 0.4) return 'Neutral';
    if (value >= 0.2) return 'Distrust';
    return 'Strongly Distrust';
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
  <div class="max-w-2xl mx-auto">
    <!-- Header -->
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        Set Up Your Trust Network
      </h1>
      <p class="text-gray-600 dark:text-gray-400">
        Help us personalize your experience by telling us what you trust
      </p>
    </div>

    <!-- Progress -->
    <div class="mb-8">
      <div class="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
        <span>Step {step} of {totalSteps}</span>
        <button on:click={handleSkip} class="text-blue-600 hover:underline">
          Skip for now
        </button>
      </div>
      <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          class="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style="width: {(step / totalSteps) * 100}%"
        ></div>
      </div>
    </div>

    <!-- Content -->
    <Card padding="lg">
      {#if step === 1}
        <!-- Welcome -->
        <div class="text-center py-8">
          <div class="text-6xl mb-4">🎯</div>
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to Nudge!
          </h2>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            Nudge shows you information filtered by <strong>your trust network</strong>.
            Instead of algorithms deciding what you see, <strong>you decide</strong> who
            and what to trust.
          </p>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            This quick questionnaire helps us understand your initial preferences.
            You can always change these later.
          </p>
          <div class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-200">
            <strong>Tip:</strong> Move sliders away from the center (0.5) for topics
            you have strong opinions about. This helps filter content more effectively.
          </div>
        </div>

      {:else if step === 2}
        <!-- Groups -->
        <div>
          <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">
            How much do you trust these groups?
          </h2>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            Groups are collections of sources that share a common characteristic.
          </p>

          {#if groups.length === 0}
            <p class="text-gray-500 italic">Loading groups...</p>
          {:else}
            <div class="space-y-6">
              {#each groups.filter(g => g.isSystemDefined) as group}
                <div class="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div class="flex justify-between items-start mb-3">
                    <div>
                      <h3 class="font-semibold text-gray-900 dark:text-white">
                        {group.name}
                      </h3>
                      {#if group.description}
                        <p class="text-sm text-gray-600 dark:text-gray-400">
                          {group.description}
                        </p>
                      {/if}
                    </div>
                    <span class="text-sm text-gray-500 dark:text-gray-400">
                      {getTrustLabel(groupTrust[group.groupId] || 0.5)}
                    </span>
                  </div>
                  <TrustSlider
                    bind:value={groupTrust[group.groupId]}
                    showValue={true}
                  />
                </div>
              {/each}
            </div>
          {/if}
        </div>

      {:else if step === 3}
        <!-- Sources -->
        <div>
          <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">
            How much do you trust these sources?
          </h2>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            These are common information sources. Set your trust level for each.
          </p>

          <div class="space-y-6">
            {#each sources as source}
              <div class="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div class="flex justify-between items-start mb-3">
                  <div>
                    <h3 class="font-semibold text-gray-900 dark:text-white">
                      {source.name}
                    </h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                      {source.description}
                    </p>
                  </div>
                  <span class="text-sm text-gray-500 dark:text-gray-400">
                    {getTrustLabel(sourceTrust[source.id] || 0.5)}
                  </span>
                </div>
                <TrustSlider
                  bind:value={sourceTrust[source.id]}
                  showValue={true}
                />
              </div>
            {/each}
          </div>
        </div>

      {:else if step === 4}
        <!-- Assertions -->
        <div>
          <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">
            How much do you trust these claims?
          </h2>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            These are commonly debated claims. Your trust levels help filter related content.
          </p>

          <div class="space-y-6">
            {#each assertions as assertion}
              <div class="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div class="flex justify-between items-start mb-3">
                  <div class="flex-1 pr-4">
                    <p class="text-gray-900 dark:text-white">
                      "{assertion.content}"
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Topic: {assertion.topic}
                    </p>
                  </div>
                  <span class="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {getTrustLabel(assertionTrust[assertion.id] || 0.5)}
                  </span>
                </div>
                <TrustSlider
                  bind:value={assertionTrust[assertion.id]}
                  showValue={true}
                />
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Error -->
      {#if error}
        <div class="mt-6 p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
          <p class="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      {/if}

      <!-- Navigation -->
      <div class="mt-8 flex justify-between">
        {#if step > 1}
          <Button variant="secondary" on:click={handleBack} disabled={loading}>
            Back
          </Button>
        {:else}
          <div></div>
        {/if}

        <Button on:click={handleNext} {loading} disabled={loading}>
          {step === totalSteps ? 'Finish Setup' : 'Continue'}
        </Button>
      </div>
    </Card>
  </div>
</div>
