import Image from 'next/image'
import { uiAssets } from '@/lib/ui-assets'

export interface BrandLogoProps {
  className?: string
  preload?: boolean
}

export function BrandLogo({ className, preload = false }: BrandLogoProps) {
  const logo = uiAssets.brand.logo

  return (
    <Image
      src={logo.src}
      alt={logo.alt}
      width={logo.width}
      height={logo.height}
      className={className}
      preload={preload}
    />
  )
}
