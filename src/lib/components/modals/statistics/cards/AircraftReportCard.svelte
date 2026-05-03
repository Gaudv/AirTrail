<script lang="ts">
  import NumberFlow from '@number-flow/svelte';
  import type { FlightData } from '$lib/utils';
  import {
    totalAircraftTypes,
    mostFlownAircraftType,
    mostFlownTail,
    FLIGHT_CHARTS,
    type StatsContext,
  } from '$lib/stats/aggregations';

  let {
    flights,
    seatUserId,
  }: {
    flights: FlightData[];
    seatUserId?: string;
  } = $props();

  const ctx = $derived.by(() => ({ userId: seatUserId }));

  const aircraftCount = $derived(totalAircraftTypes(flights));
  const mostFlown = $derived(mostFlownAircraftType(flights));
  const mostFlownTailData = $derived(mostFlownTail(flights));

  const seatClassDist = $derived.by(() =>
    FLIGHT_CHARTS['seat-class'].aggregate(flights, ctx),
  );

  const seatPosDist = $derived.by(() =>
    FLIGHT_CHARTS['seat'].aggregate(flights, ctx),
  );

  const topSeatClass = $derived.by(() => {
    const entries = Object.entries(seatClassDist);
    return entries.length > 0 ? entries[0]! : null;
  });

  const topSeatPos = $derived.by(() => {
    const entries = Object.entries(seatPosDist);
    return entries.length > 0 ? entries[0]! : null;
  });

  const reasonDist = $derived.by(() =>
    FLIGHT_CHARTS['reason'].aggregate(flights, ctx),
  );

  const topReason = $derived.by(() => {
    const entries = Object.entries(reasonDist);
    return entries.length > 0 ? entries[0]! : null;
  });
</script>

<div
  class="relative rounded-xl overflow-hidden border border-opacity-20 shadow-lg hover:shadow-xl transition-shadow duration-300"
  style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%); border-color: rgba(59, 130, 246, 0.3);"
>
  <!-- Gradient overlay for depth -->
  <div
    class="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity"
    style="background: linear-gradient(135deg, rgb(59, 130, 246) 0%, rgb(168, 85, 247) 100%);"
  />

  <div class="relative z-10 p-6">
    <h3 class="text-lg font-semibold mb-4 text-foreground">Aircraft Report</h3>

    <div class="space-y-4">
      <!-- Total Aircraft Types -->
      <div
        class="flex items-center justify-between p-3 rounded-lg bg-background/40 backdrop-blur-sm border border-blue-500/10"
      >
        <span class="text-sm font-medium text-muted-foreground">
          Total Aircraft Types
        </span>
        <span class="text-lg font-bold text-blue-600 dark:text-blue-400">
          <NumberFlow value={aircraftCount} />
        </span>
      </div>

      <!-- Most Flown Aircraft -->
      <div
        class="flex items-center justify-between p-3 rounded-lg bg-background/40 backdrop-blur-sm border border-blue-500/10"
      >
        <span class="text-sm font-medium text-muted-foreground">
          Most Flown Aircraft
        </span>
        <div class="text-right">
          {#if mostFlown}
            <div class="text-sm font-semibold text-foreground">
              {mostFlown.type}
            </div>
            <div class="text-xs text-muted-foreground">
              <NumberFlow value={mostFlown.count} /> times
            </div>
          {:else}
            <span class="text-xs text-muted-foreground">No data</span>
          {/if}
        </div>
      </div>

      <!-- Most Flown Tail -->
      <div
        class="flex items-center justify-between p-3 rounded-lg bg-background/40 backdrop-blur-sm border border-blue-500/10"
      >
        <span class="text-sm font-medium text-muted-foreground">
          Most Flown Tail
        </span>
        <div class="text-right">
          {#if mostFlownTailData}
            <div class="text-sm font-semibold text-foreground font-mono">
              {mostFlownTailData.tail}
            </div>
            <div class="text-xs text-muted-foreground">
              <NumberFlow value={mostFlownTailData.count} /> times
            </div>
          {:else}
            <span class="text-xs text-muted-foreground">No data</span>
          {/if}
        </div>
      </div>

      <!-- Preferred Seat Class -->
      <div
        class="flex items-center justify-between p-3 rounded-lg bg-background/40 backdrop-blur-sm border border-purple-500/10"
      >
        <span class="text-sm font-medium text-muted-foreground">
          Preferred Seat Class
        </span>
        <div class="text-right">
          {#if topSeatClass}
            <div
              class="text-sm font-semibold text-purple-600 dark:text-purple-400"
            >
              {topSeatClass[0]}
            </div>
            <div class="text-xs text-muted-foreground">
              <NumberFlow value={topSeatClass[1]} /> flights
            </div>
          {:else}
            <span class="text-xs text-muted-foreground">No data</span>
          {/if}
        </div>
      </div>

      <!-- Preferred Seat Position -->
      <div
        class="flex items-center justify-between p-3 rounded-lg bg-background/40 backdrop-blur-sm border border-purple-500/10"
      >
        <span class="text-sm font-medium text-muted-foreground">
          Preferred Seat Position
        </span>
        <div class="text-right">
          {#if topSeatPos}
            <div
              class="text-sm font-semibold text-purple-600 dark:text-purple-400"
            >
              {topSeatPos[0]}
            </div>
            <div class="text-xs text-muted-foreground">
              <NumberFlow value={topSeatPos[1]} /> times
            </div>
          {:else}
            <span class="text-xs text-muted-foreground">No data</span>
          {/if}
        </div>
      </div>

      <!-- Flight Reason -->
      <div
        class="flex items-center justify-between p-3 rounded-lg bg-background/40 backdrop-blur-sm border border-purple-500/10"
      >
        <span class="text-sm font-medium text-muted-foreground">
          Primary Flight Reason
        </span>
        <div class="text-right">
          {#if topReason}
            <div
              class="text-sm font-semibold text-purple-600 dark:text-purple-400"
            >
              {topReason[0]}
            </div>
            <div class="text-xs text-muted-foreground">
              <NumberFlow value={topReason[1]} /> flights
            </div>
          {:else}
            <span class="text-xs text-muted-foreground">No data</span>
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>
