import { CAMPAIGN_ROLE_HELP, WORLD_ROLE_HELP } from '@/lib/role-labels'
import styles from './role-help.module.css'

export function RoleHelp({ targetKind }: { targetKind: 'World' | 'Campaign' }) {
  const roles = targetKind === 'Campaign' ? CAMPAIGN_ROLE_HELP : WORLD_ROLE_HELP

  return (
    <details className={styles.help}>
      <summary aria-label={`Explain ${targetKind} roles`}>?</summary>
      <div className={styles.popover}>
        <strong>{targetKind} roles</strong>
        {roles.map((role) => (
          <p key={role.label}>
            <b>{role.label}</b> — {role.description}
          </p>
        ))}
        <small>Technical permission names stay internal to Weaveryn.</small>
      </div>
    </details>
  )
}
