import type { SVGProps } from 'react'

export type CharacterProfileIconName = 'edit' | 'connections' | 'world'

interface CharacterProfileIconProps extends SVGProps<SVGSVGElement> {
  name: CharacterProfileIconName
}

export function CharacterProfileIcon({
  name,
  ...props
}: CharacterProfileIconProps) {
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

  if (name === 'edit') {
    return (
      <svg {...common}>
        <path d="M4.5 19.5 5.7 15 15.8 4.9a2.2 2.2 0 0 1 3.1 3.1L8.8 18.1z" />
        <path d="m14.3 6.4 3.1 3.1M5.7 15l3.1 3.1" />
      </svg>
    )
  }

  if (name === 'connections') {
    return (
      <svg {...common}>
        <circle cx="6" cy="7" r="2.5" />
        <circle cx="18" cy="7" r="2.5" />
        <circle cx="12" cy="18" r="2.5" />
        <path d="m8.3 8.2 2.6 7.3M15.7 8.2l-2.6 7.3M8.5 7h7" />
      </svg>
    )
  }

  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="8" />
      <path d="M4.4 9h15.2M4.4 15h15.2M12 4c2.2 2.1 3.4 4.8 3.4 8S14.2 17.9 12 20M12 4C9.8 6.1 8.6 8.8 8.6 12s1.2 5.9 3.4 8" />
    </svg>
  )
}
