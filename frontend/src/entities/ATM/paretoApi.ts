import type { ParetoFront } from '@/types/services'

export type ATMParetoFront = ParetoFront & {
  selected_policy_id: number
  demo: boolean
  // policy fixed for specific aircraft, by callsign
  aircraft_policies: Record<string, number>
}

export type ATMPolicySelection = {
  selected_policy_id: number
  id_plane: string | null
  aircraft_policies: Record<string, number>
}

// Use the configured bridge URL, or the UI host's default bridge port.
const configured = import.meta.env.VITE_ATM_SIMU?.trim()
const bridgeUrl = (configured && configured !== 'false'
  ? configured
  : `${window.location.protocol}//${window.location.hostname}:6100`).replace(/\/$/, '')

async function bridgeRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${bridgeUrl}${path}`, options)
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || `Bridge returned HTTP ${response.status}`)
  return data as T
}

export function getATMParetoFront() {
  return bridgeRequest<ATMParetoFront>('/pareto-front')
}

// Without idPlane the policy applies to every aircraft that has no fixed policy in use; with idPlane it
// applies to that aircraft only. policyId null (with an idPlane) returns that aircraft to the default policy.
// When the default policy gets changed, fixed keeps the policy for a specific aircraft fixed (even when it happens to be the same as the old default policy)
export function selectATMPolicy(policyId: number | null, idPlane?: string, fixed = false) {
  return bridgeRequest<ATMPolicySelection>('/policy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(
      idPlane
        ? { policy_id: policyId, id_plane: idPlane, fixed }
        : { policy_id: policyId }
    )
  })
}
