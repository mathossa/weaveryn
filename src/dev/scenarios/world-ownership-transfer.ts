import type { WorldRole } from '@/server/worlds/world-role'

export type LabUserKey = 'A' | 'B' | 'C'

export type FormerOwnerState = WorldRole | 'LEAVE'

export interface WorldOwnershipTransferAction {
  action: 'transfer'
  actor: 'A' | 'C'
  formerOwnerState: FormerOwnerState
}

export interface LabPerson {
  id: string
  key: LabUserKey
  displayName: string
  email: string
}

export interface LabMembership {
  role: WorldRole
  user: LabPerson
}

export interface LabWorldState {
  id: string
  name: string
  owner: LabPerson | null
  memberships: LabMembership[]
}
