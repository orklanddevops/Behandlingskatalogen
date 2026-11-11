'use client'

import { Alert, BodyLong, BodyShort, Button, Heading, Loader, Search } from '@navikt/ds-react'
import { isAxiosError } from 'axios'
import { ReactNode, useContext, useEffect, useState } from 'react'
import {
  IOrganisationChartStatus,
  IOrganisationUnit,
  getOrganisationChart,
  refreshOrganisationChart,
} from '@/api/OrganisationApi'
import { UserContext } from '@/provider/userProvider'

function formatTime(value: string) {
  return new Intl.DateTimeFormat('nb-NO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Oslo',
  }).format(new Date(value))
}

export default function OrganisationPage() {
  const user = useContext(UserContext)
  const [data, setData] = useState<IOrganisationChartStatus>()
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')
  const [request, setRequest] = useState(0)
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    let active = true
    getOrganisationChart()
      .then((response) => {
        if (active) setData(response)
      })
      .catch((failure: unknown) => {
        if (active)
          setError(
            isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)
              ? 'Logg inn for å se organisasjonskartet.'
              : 'Kunne ikke hente organisasjonskartet. Prøv igjen.'
          )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [request])

  const reload = () => {
    setLoading(true)
    setError('')
    setRequest((value) => value + 1)
  }

  const synchronize = async () => {
    setSyncing(true)
    setError('')
    try {
      setData(await refreshOrganisationChart())
    } catch {
      setError('Kunne ikke oppdatere fra eADM. Det sist lagrede organisasjonskartet beholdes.')
    } finally {
      setSyncing(false)
    }
  }

  const units = data?.chart.units ?? []
  const byId = new Map(units.map((unit) => [unit.id, unit]))
  const children = new Map<string | null, IOrganisationUnit[]>()
  for (const unit of units) {
    const siblings = children.get(unit.parentId) ?? []
    siblings.push(unit)
    children.set(unit.parentId, siblings)
  }
  for (const siblings of children.values())
    siblings.sort((a, b) => a.name.localeCompare(b.name, 'nb'))

  const branches = units.filter((unit) => children.has(unit.id))
  const allExpanded = branches.length > 0 && branches.every((unit) => expanded.has(unit.id))

  const search = query.trim().toLocaleLowerCase('nb')
  const matches = units.filter((unit) =>
    [unit.id, unit.name, unit.managerName].some((value) =>
      value.toLocaleLowerCase('nb').includes(search)
    )
  )
  const visible = new Set<string>()
  for (const match of matches) {
    let current: IOrganisationUnit | undefined = match
    while (current && !visible.has(current.id)) {
      visible.add(current.id)
      current = current.parentId ? byId.get(current.parentId) : undefined
    }
  }

  const toggle = (id: string) => {
    setExpanded((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const renderBranch = (parent: string | null, depth = 0): ReactNode => (
    <ul className={depth ? 'ml-4 border-l border-[var(--ax-border-neutral-subtle)] pl-4' : ''}>
      {(children.get(parent) ?? [])
        .filter((unit) => visible.has(unit.id))
        .map((unit) => {
          const nested = (children.get(unit.id) ?? []).some((child) => visible.has(child.id))
          const open = !!search || expanded.has(unit.id)
          return (
            <li key={unit.id} className='my-2'>
              <div className='rounded-lg border border-[var(--ax-border-neutral-subtle)] p-3'>
                {nested ? (
                  <button
                    type='button'
                    className='flex w-full items-center gap-2 rounded text-left font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-offset-4'
                    aria-expanded={open}
                    aria-controls={'org-children-' + unit.id}
                    onClick={() => toggle(unit.id)}
                    disabled={!!search}
                  >
                    <span aria-hidden='true'>{open ? '▾' : '▸'}</span>
                    {unit.name}
                  </button>
                ) : (
                  <BodyShort weight='semibold'>{unit.name}</BodyShort>
                )}
                <BodyShort size='small'>Avdelingsnummer: {unit.id}</BodyShort>
                {unit.managerName && <BodyShort size='small'>Leder: {unit.managerName}</BodyShort>}
              </div>
              {nested && (
                <div id={'org-children-' + unit.id} hidden={!open}>
                  {open && renderBranch(unit.id, depth + 1)}
                </div>
              )}
            </li>
          )
        })}
    </ul>
  )

  return (
    <div className='w-full' role='main'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-4'>
        <Heading size='xlarge' level='1'>
          Organisasjonsstruktur
        </Heading>
        <div className='flex flex-wrap gap-2'>
          <Button variant='secondary' size='small' onClick={reload} disabled={loading || syncing}>
            Last inn oversikten
          </Button>
          {user.isAdmin() && data?.syncEnabled && (
            <Button
              variant='secondary'
              size='small'
              onClick={synchronize}
              loading={syncing}
              disabled={loading}
            >
              Hent på nytt fra eADM
            </Button>
          )}
        </div>
      </div>
      <BodyLong className='mb-4'>
        Organisasjonskart fra eADM. Oversikten hentes fra Databehandlingskatalogens lagrede kopi.
      </BodyLong>
      {data && (
        <BodyShort className='mb-4'>
          {data.chart.retrievedAt
            ? 'Sist oppdatert fra eADM: ' + formatTime(data.chart.retrievedAt) + '. '
            : 'Organisasjonskartet er ikke hentet ennå. '}
          {data.syncEnabled
            ? 'Oppdateres automatisk hver dag.'
            : 'Automatisk oppdatering er slått av.'}
        </BodyShort>
      )}
      {data?.chart.lastError && (
        <Alert variant='warning' className='mb-4'>
          {data.chart.lastError}
        </Alert>
      )}
      {error && (
        <Alert variant='error' className='mb-4'>
          {error}
          <Button variant='tertiary' size='small' onClick={reload} disabled={loading || syncing}>
            Prøv igjen
          </Button>
        </Alert>
      )}
      {loading && (
        <div role='status' className='mb-4'>
          <Loader title='Henter organisasjonskartet' />
        </div>
      )}
      {data && !units.length && (
        <Alert variant='info'>Ingen lagret organisasjonsstruktur er tilgjengelig ennå.</Alert>
      )}
      {!!units.length && (
        <>
          <div className='mb-4 max-w-xl'>
            <Search
              label='Søk etter avdeling, avdelingsnummer eller leder'
              hideLabel={false}
              variant='simple'
              value={query}
              onChange={setQuery}
              onClear={() => setQuery('')}
            />
          </div>
          <div className='mb-4 flex flex-wrap items-center justify-between gap-4'>
            <BodyShort aria-live='polite'>
              {search ? matches.length + ' treff i ' : ''}
              {units.length} avdelinger
            </BodyShort>
            <Button
              variant='tertiary'
              size='small'
              disabled={!!search}
              onClick={() => {
                setExpanded(allExpanded ? new Set() : new Set(branches.map((unit) => unit.id)))
              }}
            >
              {allExpanded ? 'Lukk alle' : 'Utvid alle'}
            </Button>
          </div>
          {matches.length ? (
            renderBranch(null)
          ) : (
            <BodyLong>Ingen treff. Prøv et annet søk.</BodyLong>
          )}
        </>
      )}
    </div>
  )
}
