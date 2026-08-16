import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getAuthenticatedUser } from '@/server/auth'
import styles from './select-placeholder.module.css'

export default async function SelectPage() {
  const user = await getAuthenticatedUser(new Headers(await headers()))
  if (!user) redirect('/login')

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.eyebrow}>Signed in</p>
        <h1>Choose Entity</h1>
        <p>
          Welcome {user.displayName ?? user.email}. The full selection screen is
          the next UI task under Issue #21.
        </p>
      </section>
    </main>
  )
}
