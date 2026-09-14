<template>
  <section class="cab-panel">
    <h1>{{ $t('cab.timeline') }}</h1>
    <Timeline v-slot="{ card }" :start="-60" :end="60" entity="ATM" :now="simNow">
      <SVG
        src="/img/icons/warning_hex.svg"
        :fill="`var(--color-${criticalityToColor(card.data.criticality)})`"
        :width="16"></SVG>
    </Timeline>
  </section>
</template>
<script setup lang="ts">
import { computed } from 'vue'

import SVG from '@/components/atoms/SVG.vue'
import Timeline from '@/components/organisms/Timeline.vue'
import { useServicesStore } from '@/stores/services'
import { criticalityToColor } from '@/utils/utils'

const servicesStore = useServicesStore()

// Use BlueSky's simulated clock (bs.sim.utc, forwarded as this context's
// 'date') for the 'now' cursor.
const simNow = computed(() => {
  const date = servicesStore.context('ATM')?.date
  return date === undefined ? undefined : new Date(date)
})
</script>
