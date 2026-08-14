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

export interface AcceptanceCheck {
  id: string
  title: string
  passed: boolean
  detail: string
}

export interface LabResponse {
  ok: boolean
  message: string
  state: LabWorldState | null
  checks?: AcceptanceCheck[]
  error?: {
    code: string
  }
}

