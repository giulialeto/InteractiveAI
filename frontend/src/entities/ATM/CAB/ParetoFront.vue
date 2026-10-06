<template>
  <div class="pareto-front flex flex-col">
    <p v-if="aircraft">{{ $t('ATM.pareto.helpAircraft', { id: aircraft }) }}</p>
    <p v-else>{{ $t('ATM.pareto.help') }}</p>
    <p v-if="aircraft" class="pareto-aircraft" role="status">
      {{ policyStatus }}
    </p>
    <p v-if="aircraft && previewing" role="status">
      {{ $t('ATM.pareto.previewing', { policy: previewId, id: aircraft }) }}
    </p>
    <p v-if="aircraft" class="pareto-actions">
      <button v-if="canFix" :disabled="switching" @click="fixPolicy">
        {{ $t('ATM.pareto.fixPolicy', { policy: targetPolicyId, id: aircraft }) }}
      </button>
      <button v-if="hasOwnPolicy" :disabled="switching" @click="useDefaultPolicy">
        {{ $t('ATM.pareto.useDefault', { id: aircraft }) }}
      </button>
    </p>
    <p v-if="front?.demo">{{ $t('ATM.pareto.demo') }}</p>
    <p v-if="switching" role="status">{{ $t('ATM.pareto.switching') }}</p>
    <p v-if="error" class="pareto-error" role="alert">{{ error }}</p>
    <p v-if="status === 'LOADING'">
      {{ $t('ATM.pareto.loading') }}
    </p>
    <p v-else-if="status === 'ERROR'" class="pareto-error">
      {{ $t('ATM.pareto.error') }} <button @click="loadFront">{{ $t('ATM.pareto.retry') }}</button>
    </p>
    <p v-else-if="!front?.points.length">{{ $t('ATM.pareto.empty') }}</p>
    <template v-else>
      <div class="pareto-layout">
        <svg
          class="pareto-plot"
          viewBox="0 0 760 480"
          role="img"
          :aria-label="$t('ATM.pareto.title')">
          <g class="pareto-grid">
            <line
              v-for="tick in xTicks"
              :key="`x-grid-${tick}`"
              :x1="xScale(tick)"
              :x2="xScale(tick)"
              :y1="plot.top"
              :y2="plot.bottom" />
            <line
              v-for="tick in yTicks"
              :key="`y-grid-${tick}`"
              :x1="plot.left"
              :x2="plot.right"
              :y1="yScale(tick)"
              :y2="yScale(tick)" />
          </g>
          <line class="pareto-axis" :x1="plot.left" :x2="plot.right" :y1="plot.bottom" :y2="plot.bottom" />
          <line class="pareto-axis" :x1="plot.left" :x2="plot.left" :y1="plot.top" :y2="plot.bottom" />
          <text
            v-for="tick in xTicks"
            :key="`x-label-${tick}`"
            class="pareto-tick"
            :x="xScale(tick)"
            :y="plot.bottom + 24">
            {{ formatNumber(tick) }}
          </text>
          <text
            v-for="tick in yTicks"
            :key="`y-label-${tick}`"
            class="pareto-tick pareto-y-tick"
            :x="plot.left - 12"
            :y="yScale(tick) + 4">
            {{ formatNumber(tick) }}
          </text>
          <text class="pareto-label pareto-x-label" x="410" y="466">{{ xObjective.label }}</text>
          <text class="pareto-label pareto-y-label" transform="translate(18 245) rotate(-90)">
            {{ yObjective.label }}
          </text>
          <g
            v-for="point in front.points"
            :key="point.id"
            class="pareto-point"
            :class="{ selected: point.id === shownPolicyId, current: !!aircraft && point.id === effectivePolicyId }"
            :transform="`translate(${xScale(point.reward[xObjective.id])} ${yScale(point.reward[yObjective.id])})`"
            role="button"
            :tabindex="switching ? -1 : 0"
            :aria-disabled="switching"
            :aria-pressed="point.id === shownPolicyId"
            :aria-label="$t('ATM.pareto.policy', { id: point.id })"
            @click="selectPolicy(point.id)"
            @keydown.enter.prevent="selectPolicy(point.id)"
            @keydown.space.prevent="selectPolicy(point.id)">
            <circle r="11"><title>{{ tooltip(point) }}</title></circle>
          </g>
        </svg>
        <aside v-if="selectedPoint" class="pareto-details">
          <h2>
            {{
              !aircraft
                ? $t('ATM.pareto.selected')
                : previewing
                  ? $t('ATM.pareto.previewFor', { id: aircraft })
                  : $t('ATM.pareto.selectedFor', { id: aircraft })
            }}
          </h2>
          <strong>{{ selectedPoint.checkpoint || $t('ATM.pareto.policy', { id: selectedPoint.id }) }}</strong>
          <h3>{{ $t('ATM.pareto.rewards') }}</h3>
          <dl>
            <template v-for="objective in front.objectives" :key="`reward-${objective.id}`">
              <dt :title="objective.description">{{ objective.label }}</dt>
              <dd>{{ formatNumber(selectedPoint.reward[objective.id]) }}</dd>
            </template>
          </dl>
          <h3>{{ $t('ATM.pareto.weights') }}</h3>
          <dl>
            <template v-for="objective in front.objectives" :key="`weight-${objective.id}`">
              <dt>{{ objective.label }}</dt>
              <dd>{{ formatNumber(selectedPoint.weights[objective.id]) }}</dd>
            </template>
          </dl>
          <template v-if="assignments.length">
            <h3>{{ $t('ATM.pareto.assigned') }}</h3>
            <dl>
              <template v-for="[acid, policyId] in assignments" :key="`assigned-${acid}`">
                <dt>{{ acid }}</dt>
                <dd>{{ $t('ATM.pareto.policy', { id: policyId }) }}</dd>
              </template>
            </dl>
          </template>
        </aside>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { getATMParetoFront, selectATMPolicy, type ATMParetoFront } from '@/entities/ATM/paretoApi'
import { useATMSelectionStore } from '@/entities/ATM/selection'
import type { ParetoPoint } from '@/types/services'

const { t } = useI18n()

// Aircraft clicked on the map: while one is selected, the policy chosen is assigned only to that aircraft.
const aircraft = computed(() => useATMSelectionStore().aircraftId)

const front = ref<ATMParetoFront>()
const selectedPolicyId = ref<number>()
const aircraftPolicies = ref<Record<string, number>>({})
const status = ref<'LOADING' | 'READY' | 'ERROR'>('LOADING')
// Point clicked while an aircraft is selected: only shown, not applied until confirmed with the button.
const previewId = ref<number>()
const switching = ref(false)
const error = ref('')

async function loadFront() {
  status.value = 'LOADING'
  error.value = ''
  try {
    front.value = await getATMParetoFront()
    selectedPolicyId.value = front.value.selected_policy_id
    aircraftPolicies.value = { ...(front.value.aircraft_policies ?? {}) }
    status.value = 'READY'
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause)
    status.value = 'ERROR'
  }
}

async function applyPolicy(id: number | null, fixed = false) {
  if (switching.value) return
  switching.value = true
  error.value = ''
  const acid = aircraft.value
  try {
    const result = await selectATMPolicy(id, acid, fixed)
    selectedPolicyId.value = result.selected_policy_id
    aircraftPolicies.value = { ...result.aircraft_policies }
    previewId.value = undefined
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause)
  } finally {
    switching.value = false
  }
}

// With an aircraft selected, clicking a point previews the policy's weights and rewards achieved during training. The button above the plot confirmsthe selection.
// With no aircraft selected, clicking a point sets the policy as default straight away
function selectPolicy(id: number) {
  if (aircraft.value) previewId.value = id
  else applyPolicy(id)
}
// Return the clicked aircraft to the default policy
const useDefaultPolicy = () => applyPolicy(null)
// Fix the policy for the clicked aircraft
const fixPolicy = () => {
  if (targetPolicyId.value !== undefined) applyPolicy(targetPolicyId.value, true)
}


// Policy shown as selected: the clicked aircraft's own, else the default one
const hasOwnPolicy = computed(() => !!aircraft.value && aircraft.value in aircraftPolicies.value)
const effectivePolicyId = computed(() =>
  aircraft.value && hasOwnPolicy.value ? aircraftPolicies.value[aircraft.value] : selectedPolicyId.value
)
// Policy shown in the plot and in the details: the previewed policy, else the aircraft's current one
const shownPolicyId = computed(() => (aircraft.value ? previewId.value : undefined) ?? effectivePolicyId.value)
const previewing = computed(() => previewId.value !== undefined && previewId.value !== effectivePolicyId.value)
const targetPolicyId = shownPolicyId
// if the policy is already fixed for the aircraft, on't show the 'fix policy' button
const canFix = computed(
  () =>
    targetPolicyId.value !== undefined &&
    !(hasOwnPolicy.value && aircraftPolicies.value[aircraft.value!] === targetPolicyId.value)
)
watch(aircraft, () => (previewId.value = undefined))
const assignments = computed(() => Object.entries(aircraftPolicies.value))

const policyStatus = computed(() => {
  const id = aircraft.value
  if (!id) return ''
  if (!hasOwnPolicy.value) return t('ATM.pareto.defaultPolicy', { id })
  return aircraftPolicies.value[id] === selectedPolicyId.value
    ? t('ATM.pareto.ownPolicySame', { id })
    : t('ATM.pareto.ownPolicy', { id })
})

onMounted(loadFront)
const xObjective = computed(() => front.value!.objectives[0])
const yObjective = computed(() => front.value!.objectives[1])
const selectedPoint = computed(() =>
  front.value?.points.find((point) => point.id === shownPolicyId.value)
)

const plot = { left: 80, right: 735, top: 25, bottom: 420 }

function extent(values: number[]) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const padding = max === min ? Math.max(Math.abs(min) * 0.1, 1) : (max - min) * 0.08
  return [min - padding, max + padding] as const
}

const xDomain = computed(() =>
  extent(front.value!.points.map((point) => point.reward[xObjective.value.id]))
)
const yDomain = computed(() =>
  extent(front.value!.points.map((point) => point.reward[yObjective.value.id]))
)

function scale(value: number, domain: readonly [number, number], range: readonly [number, number]) {
  return range[0] + ((value - domain[0]) / (domain[1] - domain[0])) * (range[1] - range[0])
}

const xScale = (value: number) => scale(value, xDomain.value, [plot.left, plot.right])
const yScale = (value: number) => scale(value, yDomain.value, [plot.bottom, plot.top])

function ticks(domain: readonly [number, number]) {
  return Array.from({ length: 5 }, (_, index) => domain[0] + ((domain[1] - domain[0]) * index) / 4)
}

const xTicks = computed(() => ticks(xDomain.value))
const yTicks = computed(() => ticks(yDomain.value))

function formatNumber(value: number) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 3 })
}

function tooltip(point: ParetoPoint) {
  return `${point.checkpoint || `Policy ${point.id}`}: ${xObjective.value.label} ${formatNumber(point.reward[xObjective.value.id])}, ${yObjective.value.label} ${formatNumber(point.reward[yObjective.value.id])}`
}
</script>

<style scoped lang="scss">
.pareto-front {
  position: static !important;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: var(--spacing-2);
  overflow: auto;
}
.pareto-layout {
  display: grid;
  grid-template-columns: minmax(440px, 1fr) minmax(220px, 0.32fr);
  gap: var(--spacing-3);
  min-height: 0;
  flex: 1;
}
.pareto-plot {
  width: 100%;
  height: 100%;
  min-height: 360px;
  overflow: visible;
}
.pareto-grid line {
  stroke: var(--color-grey-300);
  stroke-width: 1;
}
.pareto-axis {
  stroke: var(--color-text);
  stroke-width: 2;
}
.pareto-tick,
.pareto-label {
  fill: var(--color-text);
  text-anchor: middle;
}
.pareto-y-tick {
  text-anchor: end;
}
.pareto-label {
  font-weight: 700;
}
.pareto-point {
  cursor: pointer;
  outline: none;
  circle {
    fill: var(--color-background);
    stroke: var(--color-primary);
    stroke-width: 4;
    transition: var(--duration);
  }
  &:hover circle,
  &:focus circle,
  &.selected circle {
    fill: var(--color-primary);
    stroke-width: 7;
  }
  // policy currently applied to the clicked aircraft while another point is previewed
  &.current:not(.selected) circle {
    stroke-dasharray: 5 4;
  }
}
.pareto-details {
  align-self: center;
  background: var(--color-grey-200);
  border-radius: var(--radius-medium);
  padding: var(--spacing-3);
  dl {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--spacing-1) var(--spacing-2);
  }
  dd {
    font-weight: 700;
    margin: 0;
  }
}
.pareto-error {
  color: var(--color-error);
}
.pareto-aircraft {
  font-weight: 700;
}
@media (max-width: 900px) {
  .pareto-layout {
    grid-template-columns: 1fr;
  }
}
</style>
