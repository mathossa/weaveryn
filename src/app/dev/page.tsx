import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { devScenarioCatalog } from '@/dev/scenario-catalog'
import { getDevEnvironmentStatus } from '@/server/dev-scenarios/environment'
import { ScenarioCleanupButton } from './_components/scenario-cleanup-button'
import styles from './dev-hub.module.css'

export const metadata: Metadata = {
  title: 'Development Test Hub | Weaveryn',
  description: 'Development-only visual acceptance scenarios for Weaveryn.',
}

export default function DevelopmentHubPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  const environment = getDevEnvironmentStatus()
  const domains = [...new Set(devScenarioCatalog.map((scenario) => scenario.domain))]

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.eyebrow}>
            <span /> Development only · Issue #34
          </div>
          <h1>Visual acceptance test hub</h1>
          <p>
            Reusable scenarios exercise real application services against
            deterministic, namespaced fixtures. Automated tests remain the
            authoritative regression suite.
          </p>
        </header>

        <section
          className={`${styles.databaseStatus} ${environment.safe ? styles.safe : styles.unsafe}`}
          aria-live="polite"
        >
          <div>
            <span>{environment.safe ? '✓' : '!'}</span>
            <div>
              <strong>
                {environment.safe
                  ? 'Dedicated DEV database verified'
                  : 'Scenario mutation is blocked'}
              </strong>
              <p>{environment.message}</p>
            </div>
          </div>
          <dl>
            <div>
              <dt>Expected</dt>
              <dd>{environment.expectedDatabaseName}</dd>
            </div>
            <div>
              <dt>Configured</dt>
              <dd>{environment.actualDatabaseName ?? 'not available'}</dd>
            </div>
          </dl>
        </section>

        {domains.map((domain) => (
          <section className={styles.domain} key={domain}>
            <div className={styles.domainHeading}>
              <span>Scenario domain</span>
              <h2>{domain}</h2>
            </div>
            <div className={styles.grid}>
              {devScenarioCatalog
                .filter((scenario) => scenario.domain === domain)
                .map((scenario) => (
                  <article className={styles.card} key={scenario.id}>
                    <div className={styles.cardTopline}>
                      <span className={styles[scenario.availability]}>
                        {scenario.availability}
                      </span>
                      <span>
                        {scenario.issueNumbers
                          .map((number) => `#${number}`)
                          .join(' · ')}
                      </span>
                    </div>
                    <h3>{scenario.title}</h3>
                    <p>{scenario.purpose}</p>
                    <dl>
                      <div>
                        <dt>Fixture namespace</dt>
                        <dd>{scenario.fixtureNamespace}</dd>
                      </div>
                      <div>
                        <dt>Prerequisites</dt>
                        <dd>{scenario.prerequisites.join(' · ')}</dd>
                      </div>
                    </dl>
                    <div className={styles.cardActions}>
                      <Link href={scenario.href}>Open scenario →</Link>
                      <ScenarioCleanupButton
                        scenarioId={scenario.id}
                        scenarioTitle={scenario.title}
                      />
                    </div>
                  </article>
                ))}
            </div>
          </section>
        ))}

        <footer className={styles.footer}>
          Add new scenarios through the catalog and shared server contract. A
          feature does not need another dashboard.
        </footer>
      </div>
    </main>
  )
}
