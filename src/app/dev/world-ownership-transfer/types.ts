import type { DevScenarioResponse } from '@/server/dev-scenarios/contracts'

export type LabUserKey = 'A' | 'B' | 'C'

export type FormerOwnerState = 'ADMIN' | 'MEMBER' | 'VIEWER' | 'LEAVE'

export interface LabPerson {
  id: string
  key: LabUserKey
  displayName: string
  email: string
}

export interface LabMembership {
  role: Exclude<FormerOwnerState, 'LEAVE'>
  user: LabPerson
}

export interface LabWorldState {
  id: string
  name: string
  owner: LabPerson | null
  memberships: LabMembership[]
}

export type LabResponse = DevScenarioResponse<LabWorldState>
