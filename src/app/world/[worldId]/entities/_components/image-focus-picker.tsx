'use client'

/* eslint-disable @next/next/no-img-element */

import { FocalImage } from './focal-image'
import styles from './image-focus-picker.module.css'

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
    <div className={styles.root}>
      <div className={styles.pickerArea}>
        <button
          className={styles.imageButton}
          type="button"
          onPointerDown={setFromPointer}
          aria-label="Choose the image focus point"
        >
          <img className={styles.fullImage} src={src} alt="" />
          <span
            className={styles.marker}
            aria-hidden="true"
            style={{ left: `${x}%`, top: `${y}%` }}
          />
        </button>
        <small className={styles.helpText}>
          Click the important point. Weaveryn centres that point in each crop whenever
          the image edges allow it.
        </small>
      </div>

      <div className={styles.previews}>
        <div className={styles.previewGroup}>
          <small className={styles.previewLabel}>Card crop</small>
          <FocalImage
            src={src}
            focusX={x}
            focusY={y}
            className={styles.cardPreview}
          />
        </div>
        <div className={styles.previewGroup}>
          <small className={styles.previewLabel}>Detail crop</small>
          <FocalImage
            src={src}
            focusX={x}
            focusY={y}
            className={styles.detailPreview}
          />
        </div>
      </div>
    </div>
  )
}
