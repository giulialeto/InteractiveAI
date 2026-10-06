import { defineStore } from 'pinia'
import { ref } from 'vue'

// Aircraft clicked on the map, kept for the Pareto front tab.
export const useATMSelectionStore = defineStore('atmSelection', () => {
  const aircraftId = ref<string>()
  return { aircraftId }
})
