import Image from 'next/image'
import { uiAssets } from '@/lib/ui-assets'
import type { UiBrandArtwork } from '@/lib/ui-assets'

function resolveWordmark(): UiBrandArtwork | null {
  return uiAssets.brand.wordmark
}

export interface BrandWordmarkProps {
  className?: string
}

export function BrandWordmark({ className }: BrandWordmarkProps) {
  const wordmark = resolveWordmark()

  if (!wordmark) {
    return <span className={className}>Weaveryn</span>
  }

  return (
    <Image
      src={wordmark.src}
      alt={wordmark.alt}
      width={wordmark.width}
      height={wordmark.height}
      className={className}
      loading="eager"
    />
  )
}
