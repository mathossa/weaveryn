'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { FocalImage } from './focal-image'
import { ImageFocusPicker } from './image-focus-picker'
import styles from './entity-image-focus-control.module.css'

export function EntityImageFocusControl({
  worldId,
  entityId,
  src,
  focusX,
  focusY,
  alt,
  className,
  editable,
}: {
  worldId: string
  entityId: string
  src: string
  focusX: number
  focusY: number
  alt: string
  className?: string
  editable: boolean
}) {
  const router = useRouter()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [draftX, setDraftX] = useState(focusX)
  const [draftY, setDraftY] = useState(focusY)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function open() {
    setDraftX(focusX)
    setDraftY(focusY)
    setError(null)
    dialogRef.current?.showModal()
  }

  async function save() {
    setPending(true)
    setError(null)

    const response = await fetch(`/api/v1/worlds/${worldId}/entities/${entityId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        imageFocusX: draftX,
        imageFocusY: draftY,
      }),
    })

    const result = await response.json().catch(() => null)
    if (!response.ok) {
      setError(result?.error?.message ?? 'Could not save image focus.')
      setPending(false)
      return
    }

    setPending(false)
    dialogRef.current?.close()
    router.refresh()
  }

  return (
    <>
      <div className={styles.imageShell}>
        <FocalImage
          className={className}
          src={src}
          focusX={focusX}
          focusY={focusY}
          alt={alt}
        />
        {editable ? (
          <button className={styles.focusButton} type="button" onClick={open}>
            Adjust focus
          </button>
        ) : null}
      </div>

      {editable ? (
        <dialog
          className={styles.dialog}
          ref={dialogRef}
          onClick={(event) => {
            if (event.target === event.currentTarget) event.currentTarget.close()
          }}
        >
          <div className={styles.dialogShell}>
            <header className={styles.header}>
              <div>
                <h2>Adjust image focus</h2>
                <p>Choose the point that should stay as close to the centre as the crop allows.</p>
              </div>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={() => dialogRef.current?.close()}
              >
                Close
              </button>
            </header>

            <div className={styles.body}>
              <ImageFocusPicker
                src={src}
                x={draftX}
                y={draftY}
                onChange={({ x, y }) => {
                  setDraftX(x)
                  setDraftY(y)
                }}
              />
              {error ? <p className={styles.error}>{error}</p> : null}
            </div>

            <footer className={styles.footer}>
              <button
                className={styles.secondaryButton}
                type="button"
                disabled={pending}
                onClick={() => dialogRef.current?.close()}
              >
                Cancel
              </button>
              <button
                className={styles.primaryButton}
                type="button"
                disabled={pending}
                onClick={save}
              >
                {pending ? 'Saving…' : 'Save focus'}
              </button>
            </footer>
          </div>
        </dialog>
      ) : null}
    </>
  )
}
