<script lang="ts">
  import { onMount } from 'svelte';
  import type { TrustRelationship } from '@nudge/shared';
  import TrustBadge from './TrustBadge.svelte';

  export let userId: string = 'You';
  export let relationships: TrustRelationship[] = [];
  export let onNodeClick: (targetId: string) => void = () => {};

  interface Node {
    id: string;
    x: number;
    y: number;
    type: 'user' | 'source' | 'assertion';
    trustValue: number;
    label: string;
  }

  interface Edge {
    from: string;
    to: string;
    trustValue: number;
  }

  let width = 800;
  let height = 600;
  let nodes: Node[] = [];
  let edges: Edge[] = [];

  $: if (relationships) {
    buildGraph();
  }

  function buildGraph() {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;

    // Create user node at center
    const newNodes: Node[] = [
      {
        id: userId,
        x: centerX,
        y: centerY,
        type: 'user',
        trustValue: 1.0,
        label: userId,
      },
    ];

    // Create nodes for each trust relationship
    const sourceNodes = relationships.filter((r) => r.targetType === 'source');
    const userNodes = relationships.filter((r) => r.targetType === 'user');
    const assertionNodes = relationships.filter((r) => r.targetType === 'assertion');

    const allTargets = [...sourceNodes, ...userNodes, ...assertionNodes];
    const angleStep = (2 * Math.PI) / Math.max(allTargets.length, 1);

    allTargets.forEach((rel, i) => {
      const angle = i * angleStep - Math.PI / 2; // Start from top
      newNodes.push({
        id: rel.targetId,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        type: rel.targetType,
        trustValue: rel.trustValue,
        label: formatLabel(rel.targetId, rel.targetType),
      });
    });

    nodes = newNodes;

    // Create edges
    edges = relationships.map((rel) => ({
      from: userId,
      to: rel.targetId,
      trustValue: rel.trustValue,
    }));
  }

  function formatLabel(id: string, type: string): string {
    if (type === 'source') {
      return id;
    } else if (type === 'assertion') {
      return id.substring(0, 10) + '...';
    } else {
      // user
      return id.replace('user-', '').replace('-', ' ');
    }
  }

  function getNodeColor(node: Node): string {
    if (node.id === userId) {
      return '#3b82f6'; // Blue for current user
    }

    const trust = node.trustValue;
    if (trust >= 0.9) return '#16a34a'; // green-600
    if (trust >= 0.7) return '#84cc16'; // lime-500
    if (trust >= 0.5) return '#eab308'; // yellow-500
    if (trust >= 0.3) return '#f97316'; // orange-500
    return '#dc2626'; // red-600
  }

  function getNodeIcon(type: string): string {
    switch (type) {
      case 'user':
        return '👤';
      case 'source':
        return '📰';
      case 'assertion':
        return '💬';
      default:
        return '⭐';
    }
  }

  function getEdgeColor(trustValue: number): string {
    if (trustValue >= 0.7) return '#16a34a';
    if (trustValue >= 0.5) return '#eab308';
    if (trustValue >= 0.3) return '#f97316';
    return '#dc2626';
  }

  function getEdgeWidth(trustValue: number): number {
    return 1 + trustValue * 3; // 1-4px based on trust
  }

  function handleNodeClick(node: Node) {
    if (node.id !== userId) {
      onNodeClick(node.id);
    }
  }

  onMount(() => {
    // Resize handler
    const handleResize = () => {
      const container = document.querySelector('.trust-graph-container');
      if (container) {
        width = container.clientWidth;
        height = Math.min(600, window.innerHeight - 200);
        buildGraph();
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  });
</script>

<div class="trust-graph-container w-full">
  {#if relationships.length === 0}
    <div class="text-center py-12">
      <p class="text-gray-600 dark:text-gray-400">
        No trust relationships yet. Start by trusting some sources!
      </p>
    </div>
  {:else}
    <svg {width} {height} class="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
      <!-- Edges -->
      <g class="edges">
        {#each edges as edge}
          {@const fromNode = nodes.find((n) => n.id === edge.from)}
          {@const toNode = nodes.find((n) => n.id === edge.to)}
          {#if fromNode && toNode}
            <line
              x1={fromNode.x}
              y1={fromNode.y}
              x2={toNode.x}
              y2={toNode.y}
              stroke={getEdgeColor(edge.trustValue)}
              stroke-width={getEdgeWidth(edge.trustValue)}
              opacity="0.6"
            />
          {/if}
        {/each}
      </g>

      <!-- Nodes -->
      <g class="nodes">
        {#each nodes as node}
          <g
            class="node {node.id === userId ? '' : 'cursor-pointer hover:opacity-80'}"
            on:click={() => handleNodeClick(node)}
            on:keypress={(e) => e.key === 'Enter' && handleNodeClick(node)}
            role="button"
            tabindex={node.id === userId ? -1 : 0}
          >
            <!-- Node circle -->
            <circle
              cx={node.x}
              cy={node.y}
              r={node.id === userId ? 35 : 25}
              fill={getNodeColor(node)}
              stroke="#fff"
              stroke-width="3"
              class="transition-all"
            />

            <!-- Node icon -->
            <text
              x={node.x}
              y={node.y}
              text-anchor="middle"
              dominant-baseline="central"
              font-size={node.id === userId ? '24' : '18'}
              class="pointer-events-none select-none"
            >
              {getNodeIcon(node.type)}
            </text>

            <!-- Node label -->
            <text
              x={node.x}
              y={node.y + (node.id === userId ? 50 : 40)}
              text-anchor="middle"
              font-size="12"
              font-weight={node.id === userId ? 'bold' : 'normal'}
              fill="currentColor"
              class="pointer-events-none select-none dark:fill-gray-300"
            >
              {node.label}
            </text>

            <!-- Trust value badge for non-user nodes -->
            {#if node.id !== userId}
              <text
                x={node.x}
                y={node.y + 55}
                text-anchor="middle"
                font-size="10"
                fill="currentColor"
                class="pointer-events-none select-none dark:fill-gray-400"
              >
                {node.trustValue.toFixed(2)}
              </text>
            {/if}
          </g>
        {/each}
      </g>
    </svg>

    <!-- Legend -->
    <div class="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">Legend</h4>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 rounded-full bg-blue-600"></div>
          <span class="text-gray-700 dark:text-gray-300">You (Center)</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 rounded-full bg-green-600"></div>
          <span class="text-gray-700 dark:text-gray-300">High Trust (0.9+)</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 rounded-full bg-yellow-500"></div>
          <span class="text-gray-700 dark:text-gray-300">Medium Trust (0.5-0.7)</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 rounded-full bg-red-600"></div>
          <span class="text-gray-700 dark:text-gray-300">Low Trust (&lt;0.3)</span>
        </div>
      </div>
      <p class="mt-3 text-xs text-gray-600 dark:text-gray-400">
        Click on any node to view or edit trust relationship. Line thickness and color represent trust level.
      </p>
    </div>
  {/if}
</div>

<style>
  .node {
    transition: opacity 0.2s;
  }
</style>
