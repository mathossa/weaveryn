'use client'

import { useState } from 'react'
import styles from '../entity.module.css'
import { connectionTypeLabel } from './connection-language'

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
        <span>How are they connected?</span>
        <input
          required
          maxLength={80}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="e.g. is protected by"
        />
      </label>
    )
  }

  return (
    <div className={styles.relationshipTypeFields}>
      <label className={styles.field}>
        <span>How are they connected?</span>
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
              {connectionTypeLabel(item)}
            </option>
          ))}
          <option value="__custom__">Other…</option>
        </select>
      </label>
      {choice === '__custom__' ? (
        <label className={styles.field}>
          <span>Describe the connection</span>
          <input
            required
            maxLength={80}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="e.g. is protected by"
          />
        </label>
      ) : null}
    </div>
  )
}
