'use client'

import { useState } from 'react'
import styles from '../entity.module.css'

export function RelationshipTypeInput({
  value,
  onChange,
  choices,
}: {
  value: string
  onChange: (value: string) => void
  choices: string[]
}) {
  const initialChoice = choices.includes(value) ? value : '__custom__'
  const [choice, setChoice] = useState(initialChoice)

  if (choices.length === 0) {
    return (
      <label className={styles.field}>
        <span>Relationship type</span>
        <input
          required
          maxLength={80}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="e.g. LOCATED_IN"
        />
      </label>
    )
  }

  return (
    <div className={styles.relationshipTypeFields}>
      <label className={styles.field}>
        <span>Relationship type</span>
        <select
          value={choice}
          onChange={(event) => {
            const next = event.target.value
            setChoice(next)
            if (next !== '__custom__') onChange(next)
            else if (choices.includes(value)) onChange('')
          }}
        >
          {choices.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
          <option value="__custom__">Custom…</option>
        </select>
      </label>
      {choice === '__custom__' ? (
        <label className={styles.field}>
          <span>Custom relationship type</span>
          <input
            required
            maxLength={80}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="e.g. PROTECTS"
          />
        </label>
      ) : null}
    </div>
  )
}
