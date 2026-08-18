'use client'

/* eslint-disable @next/next/no-img-element */

import { FocalImage } from './focal-image'

export function ImageFocusPicker({
  src,
  x,
  y,
  onChange,
}: {
  src: string
  x: number
  y: number
  onChange: (value: { x: number; y: number }) => void
}) {
  function setFromPointer(event: React.PointerEvent<HTMLButtonElement>) {
    const image = event.currentTarget.querySelector('img')
    if (!image) return
    const rect = image.getBoundingClientRect()
    const nextX = Math.round(((event.clientX - rect.left) / rect.width) * 100)
    const nextY = Math.round(((event.clientY - rect.top) / rect.height) * 100)
    onChange({
      x: Math.max(0, Math.min(100, nextX)),
      y: Math.max(0, Math.min(100, nextY)),
    })
  }

  return (
    <div style={{ display: 'grid', gap: '0.9rem' }}>
      <div style={{ display: 'grid', justifyItems: 'center', gap: '0.45rem' }}>
        <button
          type="button"
          onPointerDown={setFromPointer}
          aria-label="Choose the image focus point"
          style={{
            position: 'relative',
            display: 'block',
            width: 'fit-content',
            maxWidth: '100%',
            padding: 0,
            overflow: 'hidden',
            cursor: 'crosshair',
            border: '1px solid var(--ui-border)',
            borderRadius: 'var(--ui-radius-panel)',
            background: 'var(--ui-control-surface)',
          }}
        >
          <img
            src={src}
            alt=""
            style={{
              display: 'block',
              width: 'auto',
              maxWidth: '100%',
              maxHeight: '20rem',
            }}
          />
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: `${x}%`,
              top: `${y}%`,
              width: '1.2rem',
              height: '1.2rem',
              transform: 'translate(-50%, -50%)',
              border: '2px solid var(--ui-accent)',
              borderRadius: '999px',
              boxShadow: '0 0 0 2px rgba(0, 0, 0, 0.7)',
              pointerEvents: 'none',
            }}
          />
        </button>
        <small style={{ color: 'var(--ui-text-muted)' }}>
          Click the important point. Weaveryn centres that point in each crop whenever
          the image edges allow it.
        </small>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(7rem, 0.45fr) minmax(12rem, 1fr)',
          gap: '0.8rem',
          alignItems: 'end',
        }}
      >
        <div style={{ display: 'grid', gap: '0.35rem' }}>
          <small style={{ color: 'var(--ui-text-muted)' }}>Card crop</small>
          <FocalImage
            src={src}
            focusX={x}
            focusY={y}
            className="entity-focus-card-preview"
          />
        </div>
        <div style={{ display: 'grid', gap: '0.35rem' }}>
          <small style={{ color: 'var(--ui-text-muted)' }}>Detail crop</small>
          <FocalImage
            src={src}
            focusX={x}
            focusY={y}
            className="entity-focus-detail-preview"
          />
        </div>
      </div>

      <style jsx global>{`
        .entity-focus-card-preview,
        .entity-focus-detail-preview {
          min-height: 9rem;
          border: 1px solid var(--ui-border);
          border-radius: var(--ui-radius-control);
          background: var(--ui-control-surface);
        }

        .entity-focus-card-preview {
          aspect-ratio: 4 / 5;
        }

        .entity-focus-detail-preview {
          aspect-ratio: 16 / 7;
        }
      `}</style>
    </div>
  )
}
