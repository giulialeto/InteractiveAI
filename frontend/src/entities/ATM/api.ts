import http from '@/plugins/http'
import type { Action } from '@/types/entities'

export function applyRecommendation(data: Action<'ATM'>) {
  return http.post<{ message: string }>(
    import.meta.env.VITE_ATM_SIMU + '/update-flight-plan',
    data
  )
}

// Tells the bridge which aircraft is selected on the map. Used to push a
// live "<ACID> Information" card (AIRCRAFT_INFO, see
// ai4realnet_rl_batch_bridge.py) for as long as it stays selected.
export function selectAircraft(id_plane: string | null) {
  return http.post<{ ok: boolean; id_plane: string | null }>(
    import.meta.env.VITE_ATM_SIMU + '/select-aircraft',
    { id_plane }
  )
}
