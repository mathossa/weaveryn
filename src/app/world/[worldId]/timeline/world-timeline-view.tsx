'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useMemo, useState } from 'react'
import styles from './timeline.module.css'

type Direction = 'BEFORE' | 'AFTER'

interface ReckoningView {
  id: string
  name: string
  anchorWorldPosition: string
  anchorWorldDateLabel: string
  beforeLabel: string
  beforeAbbreviation: string | null
  afterLabel: string
  afterAbbreviation: string | null
}

interface EntityChoice {
  id: string
  name: string
  type: string
}

interface EventView {
  id: string
  title: string
  description: string | null
  startWorldPosition: string
  endWorldPosition: string | null
  startWorldDateLabel: string
  endWorldDateLabel: string | null
  startReckoningId: string | null
  startReckoningDirection: Direction | null
  endReckoningId: string | null
  endReckoningDirection: Direction | null
  linkedEntities: EntityChoice[]
}

interface DateState {
  year: string
  reckoningId: string
  direction: Direction
}

interface WorldTimelineViewProps {
  worldId: string
  worldName: string
  events: EventView[]
  reckonings: ReckoningView[]
  entityChoices: EntityChoice[]
  canEditEvents: boolean
  canManageChronology: boolean
  initialCreate: boolean
  timelineHref: string
}

function emptyDateState(): DateState {
  return { year: '', reckoningId: '', direction: 'AFTER' }
}

function dateStateFromPosition(
  worldPosition: string,
  reckoningId: string | null,
  direction: Direction | null,
  reckonings: ReckoningView[],
): DateState {
  if (!reckoningId) {
    return { year: worldPosition, reckoningId: '', direction: 'AFTER' }
  }

  const reckoning = reckonings.find((candidate) => candidate.id === reckoningId)
  if (!reckoning) {
    return { year: worldPosition, reckoningId: '', direction: 'AFTER' }
  }

  try {
    const position = BigInt(worldPosition)
    const anchor = BigInt(reckoning.anchorWorldPosition)
    const distance = position >= anchor ? position - anchor : anchor - position
    return {
      year: distance.toString(),
      reckoningId,
      direction: direction ?? (position < anchor ? 'BEFORE' : 'AFTER'),
    }
  } catch {
    return { year: worldPosition, reckoningId: '', direction: 'AFTER' }
  }
}

function datePayload(date: DateState) {
  return {
    year: date.year,
    ...(date.reckoningId
      ? { reckoningId: date.reckoningId, direction: date.direction }
      : {}),
  }
}

function previewDate(date: DateState, reckonings: ReckoningView[]) {
  const year = date.year.trim() || '…'
  if (!date.reckoningId) return `Year ${year}`
  const reckoning = reckonings.find(
    (candidate) => candidate.id === date.reckoningId,
  )
  if (!reckoning) return year
  const suffix =
    date.direction === 'BEFORE'
      ? reckoning.beforeAbbreviation || reckoning.beforeLabel
      : reckoning.afterAbbreviation || reckoning.afterLabel
  return `${year} ${suffix}`
}

function DateField({
  label,
  value,
  reckonings,
  onChange,
}: {
  label: string
  value: DateState
  reckonings: ReckoningView[]
  onChange: (value: DateState) => void
}) {
  return (
    <fieldset className={styles.dateField}>
      <legend>{label}</legend>
      <label className={styles.field}>
        <span>Year system</span>
        <select
          value={value.reckoningId}
          onChange={(event) =>
            onChange({ ...value, reckoningId: event.target.value })
          }
        >
          <option value="">Simple World year</option>
          {reckonings.map((reckoning) => (
            <option value={reckoning.id} key={reckoning.id}>
              {reckoning.name}
            </option>
          ))}
        </select>
      </label>

      <div className={styles.dateRow}>
        {value.reckoningId ? (
          <label className={styles.field}>
            <span>Relative to anchor</span>
            <select
              value={value.direction}
              onChange={(event) =>
                onChange({
                  ...value,
                  direction: event.target.value as Direction,
                })
              }
            >
              <option value="BEFORE">Before</option>
              <option value="AFTER">After</option>
            </select>
          </label>
        ) : null}
        <label className={styles.field}>
          <span>{value.reckoningId ? 'Years from anchor' : 'World year'}</span>
          <input
            value={value.year}
            inputMode="numeric"
            placeholder={value.reckoningId ? '100' : '1247'}
            required
            onChange={(event) =>
              onChange({ ...value, year: event.target.value })
            }
          />
        </label>
      </div>
      <p className={styles.datePreview}>
        Displayed as <strong>{previewDate(value, reckonings)}</strong>
      </p>
    </fieldset>
  )
}

function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
  wide?: boolean
}) {
  return (
    <div
      className={styles.modalBackdrop}
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className={`${styles.modal} ${wide ? styles.modalWide : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.modalHeader}>
          <h2>{title}</h2>
          <button className={styles.iconButton} type="button" onClick={onClose}>
            ×<span className={styles.srOnly}>Close</span>
          </button>
        </header>
        <div className={styles.modalBody}>{children}</div>
      </section>
    </div>
  )
}

function EventEditorDialog({
  worldId,
  timelineHref,
  event,
  reckonings,
  entityChoices,
  onClose,
}: {
  worldId: string
  timelineHref: string
  event: EventView | null
  reckonings: ReckoningView[]
  entityChoices: EntityChoice[]
  onClose: () => void
}) {
  const router = useRouter()
  const [title, setTitle] = useState(event?.title ?? '')
  const [description, setDescription] = useState(event?.description ?? '')
  const [startDate, setStartDate] = useState<DateState>(() =>
    event
      ? dateStateFromPosition(
          event.startWorldPosition,
          event.startReckoningId,
          event.startReckoningDirection,
          reckonings,
        )
      : emptyDateState(),
  )
  const [hasDuration, setHasDuration] = useState(
    Boolean(event?.endWorldPosition),
  )
  const [endDate, setEndDate] = useState<DateState>(() =>
    event?.endWorldPosition
      ? dateStateFromPosition(
          event.endWorldPosition,
          event.endReckoningId,
          event.endReckoningDirection,
          reckonings,
        )
      : emptyDateState(),
  )
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>(
    event?.linkedEntities.map((entity) => entity.id) ?? [],
  )
  const [entitySearch, setEntitySearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const visibleEntities = useMemo(() => {
    const needle = entitySearch.trim().toLocaleLowerCase()
    if (!needle) return entityChoices
    return entityChoices.filter((entity) =>
      `${entity.name} ${entity.type}`.toLocaleLowerCase().includes(needle),
    )
  }, [entityChoices, entitySearch])

  async function submit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault()
    setBusy(true)
    setError(null)

    const endpoint = event
      ? `/api/v1/worlds/${worldId}/events/${event.id}`
      : `/api/v1/worlds/${worldId}/events`
    const response = await fetch(endpoint, {
      method: event ? 'PATCH' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        startDate: datePayload(startDate),
        endDate: hasDuration ? datePayload(endDate) : undefined,
        entityIds: selectedEntityIds,
      }),
    })

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: { message?: string }
      } | null
      setError(body?.error?.message ?? 'The event could not be saved.')
      setBusy(false)
      return
    }

    onClose()
    if (!event) router.replace(timelineHref)
    router.refresh()
  }

  return (
    <Modal title={event ? 'Edit event' : 'Add event'} onClose={onClose} wide>
      <form className={styles.editorForm} onSubmit={submit}>
        <section className={styles.formSection}>
          <label className={styles.field}>
            <span>Event title</span>
            <input
              value={title}
              maxLength={160}
              required
              autoFocus
              placeholder="Fall of Moonwatch"
              onChange={(input) => setTitle(input.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span>Description</span>
            <textarea
              value={description}
              maxLength={10000}
              rows={4}
              placeholder="What happened, and why does it matter?"
              onChange={(input) => setDescription(input.target.value)}
            />
          </label>
        </section>

        <section className={styles.formSection}>
          <div className={styles.sectionHeading}>
            <div>
              <h3>When did this happen?</h3>
              <p>
                Enter the date as people in this World would say it. Weaveryn
                calculates the sortable chronology position for you.
              </p>
            </div>
          </div>
          <DateField
            label="Start date"
            value={startDate}
            reckonings={reckonings}
            onChange={setStartDate}
          />
          <label className={styles.toggleRow}>
            <input
              type="checkbox"
              checked={hasDuration}
              onChange={(input) => setHasDuration(input.target.checked)}
            />
            <span>
              <strong>This event spans a period</strong>
              <small>
                Use this for wars, reigns, journeys, eras, and other durations.
              </small>
            </span>
          </label>
          {hasDuration ? (
            <DateField
              label="End date"
              value={endDate}
              reckonings={reckonings}
              onChange={setEndDate}
            />
          ) : null}
        </section>

        <section className={styles.formSection}>
          <div className={styles.sectionHeading}>
            <div>
              <h3>Linked World entities</h3>
              <p>
                Connect the people, places, factions, items, and other World
                content involved.
              </p>
            </div>
          </div>
          <label className={styles.field}>
            <span>Find entities</span>
            <input
              value={entitySearch}
              placeholder="Search by name or type"
              onChange={(input) => setEntitySearch(input.target.value)}
            />
          </label>
          <div className={styles.entityPicker}>
            {visibleEntities.length ? (
              visibleEntities.map((entity) => {
                const checked = selectedEntityIds.includes(entity.id)
                return (
                  <label className={styles.entityOption} key={entity.id}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setSelectedEntityIds((current) =>
                          checked
                            ? current.filter((id) => id !== entity.id)
                            : [...current, entity.id],
                        )
                      }
                    />
                    <span>
                      <strong>{entity.name}</strong>
                      <small>{entity.type}</small>
                    </span>
                  </label>
                )
              })
            ) : (
              <p className={styles.emptyCopy}>No matching visible entities.</p>
            )}
          </div>
        </section>

        {error ? <p className={styles.error}>{error}</p> : null}
        <div className={styles.formActions}>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className={styles.primaryButton}
            type="submit"
            disabled={busy}
          >
            {busy ? 'Saving…' : event ? 'Save event' : 'Add event'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function ChronologyDialog({
  worldId,
  reckonings,
  onClose,
}: {
  worldId: string
  reckonings: ReckoningView[]
  onClose: () => void
}) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [anchorDate, setAnchorDate] = useState<DateState>(emptyDateState)
  const [beforeLabel, setBeforeLabel] = useState('Before')
  const [beforeAbbreviation, setBeforeAbbreviation] = useState('')
  const [afterLabel, setAfterLabel] = useState('After')
  const [afterAbbreviation, setAfterAbbreviation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function createReckoning(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const response = await fetch(`/api/v1/worlds/${worldId}/reckonings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name,
        anchorDate: datePayload(anchorDate),
        beforeLabel,
        beforeAbbreviation,
        afterLabel,
        afterAbbreviation,
      }),
    })
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: { message?: string }
      } | null
      setError(body?.error?.message ?? 'The year system could not be created.')
      setBusy(false)
      return
    }
    setName('')
    setBusy(false)
    router.refresh()
  }

  async function removeReckoning(reckoning: ReckoningView) {
    if (
      !window.confirm(
        `Remove ${reckoning.name}? Events already using it will prevent removal.`,
      )
    ) {
      return
    }
    setError(null)
    const response = await fetch(
      `/api/v1/worlds/${worldId}/reckonings/${reckoning.id}`,
      { method: 'DELETE' },
    )
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: { message?: string }
      } | null
      setError(body?.error?.message ?? 'The year system could not be removed.')
      return
    }
    router.refresh()
  }

  return (
    <Modal title="Date system" onClose={onClose} wide>
      <div className={styles.chronologyDialog}>
        <section className={styles.formSection}>
          <h3>Configured year systems</h3>
          <p className={styles.helpText}>
            The simple World year is always available. Add named reckonings when
            people count years before or after a major event.
          </p>
          <div className={styles.reckoningList}>
            {reckonings.length ? (
              reckonings.map((reckoning) => (
                <article className={styles.reckoningRow} key={reckoning.id}>
                  <div>
                    <strong>{reckoning.name}</strong>
                    <span>
                      Anchor: {reckoning.anchorWorldDateLabel} ·{' '}
                      {reckoning.beforeAbbreviation || reckoning.beforeLabel} /{' '}
                      {reckoning.afterAbbreviation || reckoning.afterLabel}
                    </span>
                  </div>
                  <button
                    className={styles.smallDangerButton}
                    type="button"
                    onClick={() => void removeReckoning(reckoning)}
                  >
                    Remove
                  </button>
                </article>
              ))
            ) : (
              <p className={styles.emptyCopy}>No named year systems yet.</p>
            )}
          </div>
        </section>

        <form className={styles.formSection} onSubmit={createReckoning}>
          <div>
            <h3>Add a year system</h3>
            <p className={styles.helpText}>
              Example: anchor a Cataclysm at Year 0, then use BC / AC. Another
              Rebuild reckoning can later anchor itself at 200 AC, so the same
              moment can have more than one valid historical label.
            </p>
          </div>
          <label className={styles.field}>
            <span>Name</span>
            <input
              value={name}
              required
              maxLength={120}
              placeholder="Cataclysm Reckoning"
              onChange={(input) => setName(input.target.value)}
            />
          </label>
          <DateField
            label="Anchor date"
            value={anchorDate}
            reckonings={reckonings}
            onChange={setAnchorDate}
          />
          <div className={styles.twoColumnFields}>
            <label className={styles.field}>
              <span>Before label</span>
              <input
                value={beforeLabel}
                required
                placeholder="Before Cataclysm"
                onChange={(input) => setBeforeLabel(input.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span>Short form</span>
              <input
                value={beforeAbbreviation}
                maxLength={24}
                placeholder="BC"
                onChange={(input) => setBeforeAbbreviation(input.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span>After label</span>
              <input
                value={afterLabel}
                required
                placeholder="After Cataclysm"
                onChange={(input) => setAfterLabel(input.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span>Short form</span>
              <input
                value={afterAbbreviation}
                maxLength={24}
                placeholder="AC"
                onChange={(input) => setAfterAbbreviation(input.target.value)}
              />
            </label>
          </div>
          {error ? <p className={styles.error}>{error}</p> : null}
          <div className={styles.formActions}>
            <button
              className={styles.primaryButton}
              type="submit"
              disabled={busy}
            >
              {busy ? 'Adding…' : 'Add year system'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

export function WorldTimelineView({
  worldId,
  worldName,
  events,
  reckonings,
  entityChoices,
  canEditEvents,
  canManageChronology,
  initialCreate,
  timelineHref,
}: WorldTimelineViewProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [editor, setEditor] = useState<'create' | EventView | null>(() =>
    initialCreate && canEditEvents ? 'create' : null,
  )
  const [chronologyOpen, setChronologyOpen] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const selectedEvent =
    events.find((event) => event.id === selectedEventId) ?? null
  const filteredEvents = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase()
    if (!needle) return events
    return events.filter((event) =>
      [
        event.title,
        event.description ?? '',
        event.startWorldDateLabel,
        event.endWorldDateLabel ?? '',
        ...event.linkedEntities.map((entity) => entity.name),
      ]
        .join(' ')
        .toLocaleLowerCase()
        .includes(needle),
    )
  }, [events, search])

  async function deleteEvent(event: EventView) {
    if (!window.confirm(`Delete “${event.title}” from World history?`)) return
    setDeleteBusy(true)
    setDetailError(null)
    const response = await fetch(
      `/api/v1/worlds/${worldId}/events/${event.id}`,
      {
        method: 'DELETE',
      },
    )
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: { message?: string }
      } | null
      setDetailError(body?.error?.message ?? 'The event could not be deleted.')
      setDeleteBusy(false)
      return
    }
    setSelectedEventId(null)
    setDeleteBusy(false)
    router.refresh()
  }

  return (
    <div className={styles.workspace}>
      <section
        className={styles.timelinePanel}
        aria-labelledby="history-list-title"
      >
        <div className={styles.toolbar}>
          <label className={styles.searchField}>
            <span className={styles.srOnly}>Search World history</span>
            <input
              value={search}
              placeholder="Search history, dates, or linked entities…"
              onChange={(input) => setSearch(input.target.value)}
            />
          </label>
          <div className={styles.viewTabs} aria-label="Timeline view">
            <button type="button" data-active="true">
              List
            </button>
            <button type="button" disabled>
              Timeline <small>Soon</small>
            </button>
            <button type="button" disabled>
              Calendar <small>Soon</small>
            </button>
          </div>
          {canEditEvents ? (
            <button
              className={styles.primaryButton}
              type="button"
              onClick={() => setEditor('create')}
            >
              + Add event
            </button>
          ) : null}
        </div>

        <div className={styles.listHeader}>
          <div>
            <span>Canonical history</span>
            <h2 id="history-list-title">{worldName}</h2>
          </div>
          <strong>{filteredEvents.length} events</strong>
        </div>

        <div className={styles.eventList}>
          {filteredEvents.length ? (
            filteredEvents.map((event) => {
              const duration = Boolean(event.endWorldPosition)
              return (
                <article className={styles.eventCard} key={event.id}>
                  <button
                    className={styles.eventOpen}
                    type="button"
                    onClick={() => setSelectedEventId(event.id)}
                  >
                    <span className={styles.eventDate}>
                      {event.startWorldDateLabel}
                      {duration && event.endWorldDateLabel
                        ? ` — ${event.endWorldDateLabel}`
                        : ''}
                    </span>
                    <span className={styles.eventHeading}>
                      <strong>{event.title}</strong>
                      <small>{duration ? 'Duration' : 'Point event'}</small>
                    </span>
                    {event.description ? <p>{event.description}</p> : null}
                  </button>
                  {event.linkedEntities.length ? (
                    <div className={styles.entityLinks}>
                      {event.linkedEntities.map((entity) => (
                        <Link
                          href={`/world/${worldId}/entities/${entity.id}`}
                          key={entity.id}
                        >
                          {entity.name}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </article>
              )
            })
          ) : (
            <div className={styles.emptyState}>
              <strong>
                {events.length ? 'No matching history' : 'No history woven yet'}
              </strong>
              <p>
                {events.length
                  ? 'Try another search.'
                  : canEditEvents
                    ? 'Add the first event to begin this World’s canonical history.'
                    : 'A Weaver or Threadwalker can add the first World event.'}
              </p>
              {!events.length && canEditEvents ? (
                <button
                  className={styles.primaryButton}
                  type="button"
                  onClick={() => setEditor('create')}
                >
                  Add first event
                </button>
              ) : null}
            </div>
          )}
        </div>
      </section>

      <aside
        className={styles.datePanel}
        aria-labelledby="date-explainer-title"
      >
        <div className={styles.datePanelHeader}>
          <span>Chronology guide</span>
          <h2 id="date-explainer-title">Dates in this World</h2>
          <p>
            You enter dates the way people in the setting describe them.
            Weaveryn converts them into an internal sortable position
            automatically, so you do not have to manage timeline numbers
            yourself.
          </p>
        </div>

        <section className={styles.explainerCard}>
          <strong>Simple World year</strong>
          <p>
            Always available. Enter a year such as <em>1247</em>. Negative years
            are allowed when a World has not configured a named reckoning yet.
          </p>
        </section>

        <section className={styles.explainerCard}>
          <div className={styles.explainerHeading}>
            <strong>Named year systems</strong>
            <span>{reckonings.length}</span>
          </div>
          {reckonings.length ? (
            <div className={styles.explainerReckonings}>
              {reckonings.map((reckoning) => (
                <div key={reckoning.id}>
                  <strong>{reckoning.name}</strong>
                  <span>Anchor: {reckoning.anchorWorldDateLabel}</span>
                  <small>
                    {reckoning.beforeAbbreviation || reckoning.beforeLabel} /{' '}
                    {reckoning.afterAbbreviation || reckoning.afterLabel}
                  </small>
                </div>
              ))}
            </div>
          ) : (
            <p>No named reckonings have been configured yet.</p>
          )}
        </section>

        <section className={styles.explainerCard}>
          <strong>Why can dates overlap?</strong>
          <p>
            Different cultures can count from different anchors. One moment
            could be <em>100 After Cataclysm</em> and also{' '}
            <em>100 Before Rebuild</em>; both point to the same place in World
            history.
          </p>
        </section>

        <section className={styles.futureCalendar}>
          <strong>Calendar depth comes later</strong>
          <p>
            Custom months, weekdays, day lengths, hours, seasons, moons, lunar
            cycles, solar cycles, and leap rules will extend this same
            chronology system without replacing your events.
          </p>
        </section>

        {canManageChronology ? (
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={() => setChronologyOpen(true)}
          >
            Configure date system
          </button>
        ) : null}
      </aside>

      {selectedEvent ? (
        <Modal
          title={selectedEvent.title}
          onClose={() => setSelectedEventId(null)}
        >
          <div className={styles.eventDetail}>
            <span className={styles.eventDate}>
              {selectedEvent.startWorldDateLabel}
              {selectedEvent.endWorldDateLabel
                ? ` — ${selectedEvent.endWorldDateLabel}`
                : ''}
            </span>
            <span className={styles.detailBadge}>
              {selectedEvent.endWorldPosition
                ? 'Duration event'
                : 'Point event'}
            </span>
            {selectedEvent.description ? (
              <p>{selectedEvent.description}</p>
            ) : (
              <p className={styles.emptyCopy}>No description.</p>
            )}
            {selectedEvent.linkedEntities.length ? (
              <div className={styles.detailEntities}>
                <strong>Involved entities</strong>
                <div className={styles.entityLinks}>
                  {selectedEvent.linkedEntities.map((entity) => (
                    <Link
                      href={`/world/${worldId}/entities/${entity.id}`}
                      key={entity.id}
                    >
                      {entity.name}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
            {detailError ? <p className={styles.error}>{detailError}</p> : null}
            <div className={styles.formActions}>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={() => setSelectedEventId(null)}
              >
                Close
              </button>
              {canEditEvents ? (
                <>
                  <button
                    className={styles.secondaryButton}
                    type="button"
                    onClick={() => {
                      setEditor(selectedEvent)
                      setSelectedEventId(null)
                    }}
                  >
                    Edit event
                  </button>
                  <button
                    className={styles.dangerButton}
                    type="button"
                    disabled={deleteBusy}
                    onClick={() => void deleteEvent(selectedEvent)}
                  >
                    {deleteBusy ? 'Deleting…' : 'Delete event'}
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </Modal>
      ) : null}

      {editor ? (
        <EventEditorDialog
          worldId={worldId}
          timelineHref={timelineHref}
          event={editor === 'create' ? null : editor}
          reckonings={reckonings}
          entityChoices={entityChoices}
          onClose={() => {
            setEditor(null)
            if (initialCreate) router.replace(timelineHref)
          }}
        />
      ) : null}

      {chronologyOpen ? (
        <ChronologyDialog
          worldId={worldId}
          reckonings={reckonings}
          onClose={() => setChronologyOpen(false)}
        />
      ) : null}
    </div>
  )
}
