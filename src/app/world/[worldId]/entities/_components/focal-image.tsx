'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface RenderedImage {
  width: number
  height: number
  left: number
  top: number
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

export function FocalImage({
  src,
  focusX,
  focusY,
  alt = '',
  className,
}: {
  src: string
  focusX: number
  focusY: number
  alt?: string
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const [rendered, setRendered] = useState<RenderedImage | null>(null)

  const recalculate = useCallback(() => {
    const container = containerRef.current
    const image = imageRef.current
    if (!container || !image || !image.naturalWidth || !image.naturalHeight)
      return

    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight
    if (!containerWidth || !containerHeight) return

    const scale = Math.max(
      containerWidth / image.naturalWidth,
      containerHeight / image.naturalHeight,
    )
    const width = image.naturalWidth * scale
    const height = image.naturalHeight * scale
    const focalPixelX = (clamp(focusX, 0, 100) / 100) * width
    const focalPixelY = (clamp(focusY, 0, 100) / 100) * height

    // Put the selected point in the visual centre whenever the crop leaves enough
    // image around it. Near an edge, clamp to the available image rather than
    // exposing empty space.
    const left = clamp(
      containerWidth / 2 - focalPixelX,
      containerWidth - width,
      0,
    )
    const top = clamp(
      containerHeight / 2 - focalPixelY,
      containerHeight - height,
      0,
    )

    setRendered({ width, height, left, top })
  }, [focusX, focusY])

  useEffect(() => {
    recalculate()
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(recalculate)
    observer.observe(container)
    return () => observer.disconnect()
  }, [recalculate])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        onLoad={recalculate}
        style={
          rendered
            ? {
                position: 'absolute',
                width: `${rendered.width}px`,
                height: `${rendered.height}px`,
                maxWidth: 'none',
                left: `${rendered.left}px`,
                top: `${rendered.top}px`,
              }
            : {
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: '50% 50%',
              }
        }
      />
    </div>
  )
}
