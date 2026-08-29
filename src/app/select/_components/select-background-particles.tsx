import type { CSSProperties } from 'react'
import styles from './select-background-particles.module.css'

const GOLD_DUST_PARTICLES = [
  { left: '4%', size: '3px', duration: '17s', delay: '-2s', drift: '18px', sway: '14px', opacity: '0.32', blur: '0px' },
  { left: '8%', size: '4px', duration: '21s', delay: '-8s', drift: '28px', sway: '20px', opacity: '0.28', blur: '1px' },
  { left: '12%', size: '3px', duration: '15s', delay: '-5s', drift: '16px', sway: '12px', opacity: '0.30', blur: '0px' },
  { left: '16%', size: '5px', duration: '24s', delay: '-12s', drift: '34px', sway: '24px', opacity: '0.24', blur: '1px' },
  { left: '20%', size: '3px', duration: '18s', delay: '-9s', drift: '19px', sway: '14px', opacity: '0.31', blur: '0px' },
  { left: '24%', size: '4px', duration: '20s', delay: '-4s', drift: '26px', sway: '19px', opacity: '0.27', blur: '1px' },
  { left: '28%', size: '3px', duration: '16s', delay: '-1s', drift: '15px', sway: '11px', opacity: '0.29', blur: '0px' },
  { left: '32%', size: '5px', duration: '23s', delay: '-15s', drift: '31px', sway: '23px', opacity: '0.23', blur: '1px' },
  { left: '36%', size: '3px', duration: '19s', delay: '-11s', drift: '21px', sway: '15px', opacity: '0.30', blur: '0px' },
  { left: '40%', size: '4px', duration: '22s', delay: '-6s', drift: '29px', sway: '22px', opacity: '0.27', blur: '1px' },
  { left: '44%', size: '3px', duration: '17s', delay: '-13s', drift: '17px', sway: '13px', opacity: '0.31', blur: '0px' },
  { left: '48%', size: '5px', duration: '25s', delay: '-18s', drift: '36px', sway: '26px', opacity: '0.24', blur: '1px' },
  { left: '52%', size: '3px', duration: '16s', delay: '-7s', drift: '16px', sway: '12px', opacity: '0.30', blur: '0px' },
  { left: '56%', size: '4px', duration: '21s', delay: '-3s', drift: '27px', sway: '20px', opacity: '0.28', blur: '1px' },
  { left: '60%', size: '3px', duration: '18s', delay: '-10s', drift: '18px', sway: '13px', opacity: '0.30', blur: '0px' },
  { left: '64%', size: '5px', duration: '24s', delay: '-14s', drift: '33px', sway: '25px', opacity: '0.24', blur: '1px' },
  { left: '68%', size: '3px', duration: '17s', delay: '-6s', drift: '17px', sway: '12px', opacity: '0.31', blur: '0px' },
  { left: '72%', size: '4px', duration: '22s', delay: '-16s', drift: '28px', sway: '21px', opacity: '0.27', blur: '1px' },
  { left: '76%', size: '3px', duration: '15s', delay: '-4s', drift: '14px', sway: '10px', opacity: '0.29', blur: '0px' },
  { left: '80%', size: '5px', duration: '25s', delay: '-19s', drift: '35px', sway: '27px', opacity: '0.24', blur: '1px' },
  { left: '84%', size: '3px', duration: '18s', delay: '-12s', drift: '19px', sway: '14px', opacity: '0.31', blur: '0px' },
  { left: '88%', size: '4px', duration: '20s', delay: '-8s', drift: '25px', sway: '18px', opacity: '0.27', blur: '1px' },
  { left: '92%', size: '3px', duration: '16s', delay: '-5s', drift: '16px', sway: '11px', opacity: '0.30', blur: '0px' },
  { left: '96%', size: '4px', duration: '23s', delay: '-17s', drift: '30px', sway: '22px', opacity: '0.26', blur: '1px' },
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
              '--particle-sway': particle.sway,
              '--particle-opacity': particle.opacity,
              '--particle-blur': particle.blur,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}
