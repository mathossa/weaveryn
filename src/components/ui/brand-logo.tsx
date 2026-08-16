import Image from 'next/image'
import { uiAssets } from '@/lib/ui-assets'

export interface BrandLogoProps {
  className?: string
}

export function BrandLogo({ className }: BrandLogoProps) {
  const logo = uiAssets.brand.logo

  return (
    <Image
      src={logo.src}
      alt={logo.alt}
      width={logo.width}
      height={logo.height}
      className={className}
      loading="eager"
    />
  )
}
