export type CampaignRoleCode = 'GM' | 'ASSISTANT_GM' | 'PLAYER' | 'SPECTATOR'

export type WorldRoleCode = 'ADMIN' | 'MEMBER' | 'VIEWER'

export type WorldAccessCode =
  'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | 'CAMPAIGN_ONLY'

const CAMPAIGN_ROLE_LABELS: Record<CampaignRoleCode, string> = {
  GM: 'Weaver',
  ASSISTANT_GM: 'Weaver (Assistant)',
  PLAYER: 'Threadwalker',
  SPECTATOR: 'Threadwatcher',
}

const WORLD_ROLE_LABELS: Record<WorldRoleCode, string> = {
  ADMIN: 'Weaver (Admin)',
  MEMBER: 'Threadwalker',
  VIEWER: 'Threadwatcher',
}

const WORLD_ACCESS_LABELS: Record<WorldAccessCode, string> = {
  OWNER: 'Weaver (Owner)',
  ADMIN: 'Weaver (Admin)',
  MEMBER: 'Threadwalker',
  VIEWER: 'Threadwatcher',
  CAMPAIGN_ONLY: 'Campaign access',
}

export function campaignRoleLabel(role: CampaignRoleCode) {
  return CAMPAIGN_ROLE_LABELS[role]
}

export function worldRoleLabel(role: WorldRoleCode) {
  return WORLD_ROLE_LABELS[role]
}

export function worldAccessLabel(access: WorldAccessCode) {
  return WORLD_ACCESS_LABELS[access]
}

export const CAMPAIGN_ROLE_HELP = [
  {
    label: 'Weaver',
    description:
      'Runs and manages a Campaign. Assistant Weavers have delegated game-master access while owner-only actions stay protected.',
  },
  {
    label: 'Threadwalker',
    description:
      'Participates as a player and can attach a Character to the Campaign.',
  },
  {
    label: 'Threadwatcher',
    description:
      'Observes the Campaign without taking a playable Character role.',
  },
] as const

export const WORLD_ROLE_HELP = [
  {
    label: 'Weaver',
    description:
      'World owners and administrators manage the World and its membership.',
  },
  {
    label: 'Threadwalker',
    description:
      'A normal World member who can participate in and edit World content.',
  },
  {
    label: 'Threadwatcher',
    description:
      'A read-only World viewer. Campaign access is still limited to Campaigns they actually belong to.',
  },
] as const
