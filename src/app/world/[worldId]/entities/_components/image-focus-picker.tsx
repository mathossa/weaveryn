'use client'

/* eslint-disable @next/next/no-img-element */

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
    const rect = event.currentTarget.getBoundingClientRect()
    const nextX = Math.round(((event.clientX - rect.left) / rect.width) * 100)
    const nextY = Math.round(((event.clientY - rect.top) / rect.height) * 100)
    onChange({
      x: Math.max(0, Math.min(100, nextX)),
      y: Math.max(0, Math.min(100, nextY)),
    })
  }

  const cropStyle = {
    backgroundImage: `url(${JSON.stringify(src)})`,
    backgroundPosition: `${x}% ${y}%`,
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
  } as const

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
          Click the actual image; the image itself stays still while you choose the focus.
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
          <div
            aria-hidden="true"
            style={{
              ...cropStyle,
              aspectRatio: '4 / 5',
              border: '1px solid var(--ui-border)',
              borderRadius: 'var(--ui-radius-control)',
            }}
          />
        </div>
        <div style={{ display: 'grid', gap: '0.35rem' }}>
          <small style={{ color: 'var(--ui-text-muted)' }}>Detail crop</small>
          <div
            aria-hidden="true"
            style={{
              ...cropStyle,
              aspectRatio: '16 / 7',
              border: '1px solid var(--ui-border)',
              borderRadius: 'var(--ui-radius-control)',
            }}
          />
        </div>
      </div>
    </div>
  )
}
