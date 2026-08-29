import type { CSSProperties } from 'react'
import styles from './select-background-particles.module.css'

const GOLD_DUST_PARTICLES = [
  {
    left: '5%',
    size: '2px',
    duration: '18s',
    delay: '-3s',
    drift: '14px',
    opacity: '0.14',
    blur: '0px',
  },
  {
    left: '12%',
    size: '3px',
    duration: '23s',
    delay: '-16s',
    drift: '22px',
    opacity: '0.11',
    blur: '1px',
  },
  {
    left: '20%',
    size: '2px',
    duration: '16s',
    delay: '-9s',
    drift: '10px',
    opacity: '0.12',
    blur: '0px',
  },
  {
    left: '29%',
    size: '4px',
    duration: '25s',
    delay: '-6s',
    drift: '28px',
    opacity: '0.08',
    blur: '1px',
  },
  {
    left: '37%',
    size: '2px',
    duration: '20s',
    delay: '-14s',
    drift: '17px',
    opacity: '0.1',
    blur: '0px',
  },
  {
    left: '45%',
    size: '3px',
    duration: '22s',
    delay: '-2s',
    drift: '24px',
    opacity: '0.1',
    blur: '1px',
  },
  {
    left: '54%',
    size: '2px',
    duration: '17s',
    delay: '-11s',
    drift: '12px',
    opacity: '0.11',
    blur: '0px',
  },
  {
    left: '63%',
    size: '3px',
    duration: '24s',
    delay: '-19s',
    drift: '26px',
    opacity: '0.09',
    blur: '1px',
  },
  {
    left: '71%',
    size: '2px',
    duration: '19s',
    delay: '-7s',
    drift: '15px',
    opacity: '0.1',
    blur: '0px',
  },
  {
    left: '79%',
    size: '4px',
    duration: '26s',
    delay: '-13s',
    drift: '30px',
    opacity: '0.08',
    blur: '1px',
  },
  {
    left: '87%',
    size: '2px',
    duration: '18s',
    delay: '-15s',
    drift: '13px',
    opacity: '0.12',
    blur: '0px',
  },
  {
    left: '94%',
    size: '3px',
    duration: '21s',
    delay: '-5s',
    drift: '21px',
    opacity: '0.1',
    blur: '1px',
  },
] as const

export function SelectBackgroundParticles() {
  return (
    <div className={styles.layer} aria-hidden="true">
      {GOLD_DUST_PARTICLES.map((particle, index) => (
        <span
          className={styles.particle}
          key={index}
          style={
            {
              '--particle-left': particle.left,
              '--particle-size': particle.size,
              '--particle-duration': particle.duration,
              '--particle-delay': particle.delay,
              '--particle-drift': particle.drift,
              '--particle-opacity': particle.opacity,
              '--particle-blur': particle.blur,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}
