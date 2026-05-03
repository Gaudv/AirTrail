<script lang="ts">
  import NumberFlow from '@number-flow/svelte';

  import type { FlightData } from '$lib/utils';

  import { Duration } from '$lib/utils/datetime';
  import {
    calculateDelayStats,
    getWorstAirlinesByDelay,
  } from '$lib/stats/aggregations';

  let {
    flights,
  }: {
    flights: FlightData[];
  } = $props();

  const delayStats = $derived(calculateDelayStats(flights));

  const delayPercentage = $derived.by(() => {
    if (delayStats.totalFlights === 0) return 0;
    return (delayStats.delayedFlights / delayStats.totalFlights) * 100;
  });

  const totalDelayDuration = $derived.by(() =>
    Duration.fromSeconds(delayStats.totalDelayMinutes * 60),
  );

  const maxDelayDuration = $derived.by(() =>
    Duration.fromSeconds(delayStats.maxDelayMinutes * 60),
  );

  const worstAirlines = $derived(
    getWorstAirlinesByDelay(delayStats.airlineDelays, 3),
  );

  function formatDelayTime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
</script>

<div
  class="relative rounded-xl overflow-hidden border border-opacity-20 shadow-lg hover:shadow-xl transition-shadow duration-300"
  style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(234, 88, 12, 0.1) 100%); border-color: rgba(239, 68, 68, 0.3);"
>
  <!-- Gradient overlay for depth -->
  <div
    class="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity"
    style="background: linear-gradient(135deg, rgb(239, 68, 68) 0%, rgb(234, 88, 12) 100%);"
  />

  <div class="relative z-10 p-6">
    <h3 class="text-lg font-semibold mb-4 text-foreground">
      Punctuality Report
    </h3>

    <div class="space-y-4">
      <!-- Delayed Flight Percentage -->
      <div
        class="flex items-center justify-between p-3 rounded-lg bg-background/40 backdrop-blur-sm border border-red-500/10"
      >
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-muted-foreground">
            Delayed Flights
          </span>
          <span
            title="Only delays exceeding 10 minutes are counted"
            class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-muted text-muted-foreground text-xs cursor-help hover:bg-muted/80"
          >
            ?
          </span>
        </div>
        <div class="text-right">
          <div class="text-lg font-bold text-red-600 dark:text-red-400">
            <NumberFlow
              value={delayPercentage}
              format={{ maximumFractionDigits: 1 }}
            />%
          </div>
          <div class="text-xs text-muted-foreground">
            <NumberFlow value={delayStats.delayedFlights} />
            out of
            <NumberFlow value={delayStats.totalFlights} />
            flights
          </div>
        </div>
      </div>

      <!-- Total Hours Lost -->
      <div
        class="flex items-center justify-between p-3 rounded-lg bg-background/40 backdrop-blur-sm border border-red-500/10"
      >
        <span class="text-sm font-medium text-muted-foreground">
          Total Time Lost
        </span>
        <div class="text-right">
          <div class="text-sm font-semibold text-foreground">
            {#if totalDelayDuration.days}
              <NumberFlow value={totalDelayDuration.days} />d
            {/if}
            {#if totalDelayDuration.hours}
              <NumberFlow value={totalDelayDuration.hours} />h
            {/if}
            {#if totalDelayDuration.minutes}
              <NumberFlow value={totalDelayDuration.minutes} />m
            {/if}
          </div>
          <div class="text-xs text-muted-foreground">
            <NumberFlow value={delayStats.totalDelayMinutes} /> minutes total
          </div>
        </div>
      </div>

      <!-- Maximum Delay -->
      <div
        class="flex items-center justify-between p-3 rounded-lg bg-background/40 backdrop-blur-sm border border-orange-500/10"
      >
        <span class="text-sm font-medium text-muted-foreground">
          Worst Delay
        </span>
        <div class="text-right">
          <div
            class="text-sm font-semibold text-orange-600 dark:text-orange-400"
          >
            {#if maxDelayDuration.hours}
              <NumberFlow value={maxDelayDuration.hours} />h
            {/if}
            {#if maxDelayDuration.minutes}
              <NumberFlow value={maxDelayDuration.minutes} />m
            {/if}
          </div>
          <div class="text-xs text-muted-foreground">
            <NumberFlow value={delayStats.maxDelayMinutes} /> minutes
          </div>
        </div>
      </div>

      <!-- Worst Airlines by Delay -->
      <div class="space-y-2">
        <h4 class="text-sm font-medium text-muted-foreground">
          Worst Airlines by Delays
        </h4>
        {#if worstAirlines.length > 0}
          {#each worstAirlines as airline, idx (airline.airline)}
            <div
              class="flex items-center justify-between p-3 rounded-lg bg-background/40 backdrop-blur-sm border border-orange-500/10"
            >
              <div class="flex items-center gap-2">
                <span class="text-xs font-medium text-muted-foreground">
                  #{idx + 1}
                </span>
                <span class="text-sm font-medium text-foreground">
                  {airline.airline}
                </span>
              </div>
              <div class="text-right">
                <div class="text-xs font-semibold text-foreground">
                  {formatDelayTime(airline.totalDelayMinutes)}
                </div>
                <div class="text-xs text-muted-foreground">
                  <NumberFlow
                    value={airline.delayPercentage}
                    format={{ maximumFractionDigits: 1 }}
                  />% flights delayed
                </div>
              </div>
            </div>
          {/each}
        {:else}
          <div
            class="p-3 rounded-lg bg-background/40 backdrop-blur-sm border border-green-500/10"
          >
            <span class="text-xs text-muted-foreground">
              ✓ No delays recorded - excellent punctuality!
            </span>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>
