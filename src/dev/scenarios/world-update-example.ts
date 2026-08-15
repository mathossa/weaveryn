export interface WorldUpdateState {
  id: string
  name: string
  ownerId: string | null
}

export interface WorldUpdateAction {
  action: 'rename'
  actor: 'OWNER' | 'OUTSIDER'
}
