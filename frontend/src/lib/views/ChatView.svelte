<script lang="ts">
  import { onMount } from 'svelte';
  import Button from '../components/common/Button.svelte';
  import Input from '../components/common/Input.svelte';
  import Card from '../components/common/Card.svelte';
  import TrustBadge from '../components/trust/TrustBadge.svelte';
  import { sendChatMessage, type ChatMessage, type ChatResponse } from '../api/views';

  interface Message extends ChatMessage {
    sources?: Array<{
      assertionId: string;
      content: string;
      trustValue: number;
    }>;
  }

  let messages: Message[] = [];
  let inputQuery = '';
  let loading = false;
  let error = '';

  // Load chat history from localStorage
  onMount(() => {
    const saved = localStorage.getItem('nudge_chat_history');
    if (saved) {
      try {
        messages = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to load chat history:', e);
      }
    }
  });

  // Save chat history to localStorage
  function saveHistory() {
    try {
      localStorage.setItem('nudge_chat_history', JSON.stringify(messages));
    } catch (e) {
      console.error('Failed to save chat history:', e);
    }
  }

  async function handleSendMessage() {
    const query = inputQuery.trim();
    if (!query || loading) return;

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: query,
      timestamp: new Date().toISOString(),
    };
    messages = [...messages, userMessage];
    inputQuery = '';
    loading = true;
    error = '';

    try {
      const response: ChatResponse = await sendChatMessage(query);

      // Add assistant message with sources
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.response,
        timestamp: new Date().toISOString(),
        sources: response.sources,
      };
      messages = [...messages, assistantMessage];

      saveHistory();
    } catch (e: any) {
      error = e.message || 'Failed to send message';
      console.error('Chat error:', e);

      // Add error message
      const errorMessage: Message = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error}`,
        timestamp: new Date().toISOString(),
      };
      messages = [...messages, errorMessage];
    } finally {
      loading = false;
    }
  }

  function handleKeyPress(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }

  function handleClearHistory() {
    if (confirm('Are you sure you want to clear your chat history?')) {
      messages = [];
      localStorage.removeItem('nudge_chat_history');
    }
  }

  function formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleTimeString();
  }

  // Auto-scroll to bottom when new messages arrive
  let messagesContainer: HTMLElement;
  $: if (messagesContainer && messages.length > 0) {
    setTimeout(() => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 100);
  }
</script>

<div class="max-w-5xl mx-auto flex flex-col h-[calc(100vh-200px)]">
  <!-- Header -->
  <div class="mb-6 flex items-center justify-between">
    <div>
      <h1 class="text-4xl font-bold text-gray-900 dark:text-white">Chat</h1>
      <p class="text-gray-600 dark:text-gray-400 mt-2">
        Ask questions answered from your trusted knowledge base
      </p>
    </div>
    {#if messages.length > 0}
      <Button variant="secondary" on:click={handleClearHistory}>
        Clear History
      </Button>
    {/if}
  </div>

  <!-- Messages Container -->
  <div
    bind:this={messagesContainer}
    class="flex-1 overflow-y-auto mb-6 space-y-4 scroll-smooth"
  >
    {#if messages.length === 0}
      <!-- Empty state -->
      <div class="text-center py-12">
        <div class="text-6xl mb-4">💬</div>
        <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Start a conversation
        </h3>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          Ask any question and get answers based on your trusted knowledge network
        </p>
        <div class="max-w-2xl mx-auto text-left space-y-2">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            <strong>Example questions:</strong>
          </p>
          <ul class="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside space-y-1">
            <li>What is photosynthesis?</li>
            <li>Tell me about recent developments in AI</li>
            <li>What are the main causes of climate change?</li>
            <li>Explain quantum computing in simple terms</li>
          </ul>
        </div>
      </div>
    {:else}
      {#each messages as message (message.timestamp)}
        <div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
          <div class="max-w-3xl {message.role === 'user' ? 'w-auto' : 'w-full'}">
            {#if message.role === 'user'}
              <!-- User message -->
              <div class="bg-blue-600 text-white rounded-lg px-4 py-3 shadow">
                <p class="whitespace-pre-wrap">{message.content}</p>
                <p class="text-xs text-blue-100 mt-2 text-right">
                  {formatTime(message.timestamp)}
                </p>
              </div>
            {:else}
              <!-- Assistant message -->
              <Card padding="md">
                <div class="space-y-4">
                  <div class="flex items-start gap-3">
                    <div class="text-2xl">🤖</div>
                    <div class="flex-1">
                      <div class="prose dark:prose-invert max-w-none">
                        <p class="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                          {message.content}
                        </p>
                      </div>
                      <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>

                  <!-- Sources -->
                  {#if message.sources && message.sources.length > 0}
                    <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                        Sources ({message.sources.length})
                      </h4>
                      <div class="space-y-2">
                        {#each message.sources as source}
                          <div
                            class="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md border border-gray-200 dark:border-gray-700"
                          >
                            <div class="flex items-start justify-between gap-3 mb-2">
                              <p class="text-sm text-gray-700 dark:text-gray-300 flex-1 line-clamp-2">
                                {source.content}
                              </p>
                              <TrustBadge value={source.trustValue} size="sm" />
                            </div>
                            <p class="text-xs text-gray-500 dark:text-gray-400">
                              ID: {source.assertionId.substring(0, 12)}...
                            </p>
                          </div>
                        {/each}
                      </div>
                    </div>
                  {/if}
                </div>
              </Card>
            {/if}
          </div>
        </div>
      {/each}

      <!-- Loading indicator -->
      {#if loading}
        <div class="flex justify-start">
          <Card padding="md">
            <div class="flex items-center gap-3">
              <div class="text-2xl">🤖</div>
              <div class="flex items-center gap-2">
                <div
                  class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"
                />
                <span class="text-gray-600 dark:text-gray-400">Thinking...</span>
              </div>
            </div>
          </Card>
        </div>
      {/if}
    {/if}
  </div>

  <!-- Error Message -->
  {#if error && !loading}
    <div class="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
      <p class="text-red-800 dark:text-red-200">
        <strong>Error:</strong>
        {error}
      </p>
    </div>
  {/if}

  <!-- Input Area -->
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
    <div class="flex gap-3">
      <div class="flex-1">
        <textarea
          bind:value={inputQuery}
          on:keypress={handleKeyPress}
          placeholder="Ask a question..."
          disabled={loading}
          rows="2"
          class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 resize-none"
        />
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
      <div class="flex items-start">
        <Button
          on:click={handleSendMessage}
          disabled={!inputQuery.trim() || loading}
          loading={loading}
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </Button>
      </div>
    </div>
  </div>

  <!-- Info Note -->
  <div class="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
    <p class="text-xs text-blue-800 dark:text-blue-200">
      <strong>Note:</strong> Responses are personalized based on your trust network.
      The same question may yield different answers for different users.
    </p>
  </div>
</div>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
