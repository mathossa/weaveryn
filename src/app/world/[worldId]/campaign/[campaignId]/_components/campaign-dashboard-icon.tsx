import type { SVGProps } from 'react'

export type CampaignDashboardIconName =
  | 'note'
  | 'event'
  | 'dice'
  | 'map'
  | 'npc'
  | 'item'
  | 'entities'
  | 'timeline'
  | 'manage'
  | 'party'
  | 'activity'
  | 'objective'
  | 'status'
  | 'location'

interface CampaignDashboardIconProps extends SVGProps<SVGSVGElement> {
  name: CampaignDashboardIconName
}

export function CampaignDashboardIcon({
  name,
  ...props
}: CampaignDashboardIconProps) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...props,
  }

  if (name === 'note') {
    return (
      <svg {...common}>
        <path d="M6 3.5h9.5L19 7v13.5H6z" />
        <path d="M15.5 3.5V7H19M9 11h7M9 14h7M9 17h4" />
      </svg>
    )
  }

  if (name === 'event') {
    return (
      <svg {...common}>
        <rect x="4" y="5.5" width="16" height="14" rx="2" />
        <path d="M8 3.5v4M16 3.5v4M4 9.5h16M9 13h2v2H9z" />
      </svg>
    )
  }

  if (name === 'dice') {
    return (
      <svg {...common}>
        <path d="m12 3 8 5-3 10H7L4 8z" />
        <path d="m4 8 8 4 8-4M12 12v6" />
        <circle cx="12" cy="7.2" r=".8" fill="currentColor" stroke="none" />
      </svg>
    )
  }

  if (name === 'map') {
    return (
      <svg {...common}>
        <path d="m4 5 5-2 6 2 5-2v16l-5 2-6-2-5 2z" />
        <path d="M9 3v16M15 5v16" />
      </svg>
    )
  }

  if (name === 'npc') {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3" />
        <path d="M5.5 20c.8-4 3-6 6.5-6s5.7 2 6.5 6" />
      </svg>
    )
  }

  if (name === 'item') {
    return (
      <svg {...common}>
        <path d="M5 8h14v11H5zM8 8V5h8v3M9 12h6" />
        <path d="M10 12v2h4v-2" />
      </svg>
    )
  }

  if (name === 'entities') {
    return (
      <svg {...common}>
        <circle cx="6" cy="7" r="2.5" />
        <circle cx="18" cy="7" r="2.5" />
        <circle cx="12" cy="18" r="2.5" />
        <path d="m8.3 8.2 2.6 7.3M15.7 8.2l-2.6 7.3M8.5 7h7" />
      </svg>
    )
  }

  if (name === 'timeline') {
    return (
      <svg {...common}>
        <path d="M6 4v16M6 7h5M6 12h9M6 17h6" />
        <circle cx="6" cy="7" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="6" cy="12" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="6" cy="17" r="1.2" fill="currentColor" stroke="none" />
      </svg>
    )
  }

  if (name === 'manage') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18" />
      </svg>
    )
  }

  if (name === 'party') {
    return (
      <svg {...common}>
        <circle cx="8" cy="8" r="2.5" />
        <circle cx="16.5" cy="9" r="2" />
        <path d="M3.5 19c.7-3.8 2.3-5.7 4.8-5.7s4.2 1.9 4.8 5.7M13.5 14c3.5-1 5.8.7 6.5 4" />
      </svg>
    )
  }

  if (name === 'activity') {
    return (
      <svg {...common}>
        <path d="M4 12h3l2-5 4 10 2-5h5" />
      </svg>
    )
  }

  if (name === 'objective') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      </svg>
    )
  }

  if (name === 'status') {
    return (
      <svg {...common}>
        <path d="M5 4h14v16H5zM8 8h8M8 12h5M8 16h7" />
      </svg>
    )
  }

  return (
    <svg {...common}>
      <path d="M12 21s6-5.3 6-11a6 6 0 1 0-12 0c0 5.7 6 11 6 11Z" />
      <circle cx="12" cy="10" r="2" />
    </svg>
  )
}
