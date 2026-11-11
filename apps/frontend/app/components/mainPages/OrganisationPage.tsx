'use client'

import {
  Alert,
  BodyLong,
  BodyShort,
  Button,
  Heading,
  Loader,
  Search,
  Table,
  Tabs,
} from '@navikt/ds-react'
import { useEffect, useState } from 'react'
import { getAllCodelists } from '@/api/CodelistApi'
import { EListName, IAllCodelists } from '@/constants/codelistConstant'

const levels = [
  { list: EListName.DEPARTMENT, label: 'Enheter' },
  { list: EListName.SEKSJON, label: 'Avdelinger' },
  { list: EListName.SUB_DEPARTMENT, label: 'Underavdelinger' },
  { list: EListName.TEAM, label: 'Team' },
]

export default function OrganisationPage() {
  const [data, setData] = useState<IAllCodelists>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [request, setRequest] = useState(0)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let active = true
    getAllCodelists(true)
      .then((response) => {
        if (active) setData(response)
      })
      .catch(() => {
        if (active) setError(true)
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
    setError(false)
    setRequest((value) => value + 1)
  }
  const codesFor = (list: EListName) =>
    (data?.codelist[list] ?? [])
      .filter((code) => !code.invalidCode)
      .toSorted((a, b) => a.shortName.localeCompare(b.shortName, 'nb'))
  const search = query.trim().toLocaleLowerCase('nb')

  return (
    <div className='w-full' role='main'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-4'>
        <Heading size='xlarge' level='1'>
          Organisasjonsstruktur
        </Heading>
        <Button variant='secondary' size='small' onClick={reload} disabled={loading}>
          Oppdater oversikten
        </Button>
      </div>
      <BodyLong className='mb-4'>
        Oversikt over enheter, avdelinger, underavdelinger og team som er registrert i
        Databehandlingskatalogen.
      </BodyLong>
      <Alert variant='info' className='mb-6'>
        Oversikten viser dagens kodeverk. Tilhørighet mellom nivåene er ikke registrert, så enhetene
        vises som separate lister.
      </Alert>
      {error && (
        <Alert variant='error' className='mb-4'>
          Kunne ikke hente organisasjonsoversikten.
          {data && ' Den sist hentede oversikten vises fortsatt.'}
          <Button variant='tertiary' size='small' onClick={reload} disabled={loading}>
            Prøv igjen
          </Button>
        </Alert>
      )}
      {loading && (
        <div role='status' className='mb-4'>
          <Loader title='Henter organisasjonsoversikten' />
        </div>
      )}
      {data && (
        <>
          <div className='mb-6 max-w-xl'>
            <Search
              label='Søk i organisasjonsoversikten'
              hideLabel={false}
              variant='simple'
              value={query}
              onChange={setQuery}
              onClear={() => setQuery('')}
            />
          </div>
          <Tabs defaultValue={EListName.DEPARTMENT}>
            <Tabs.List className='flex-wrap'>
              {levels.map(({ list, label }) => (
                <Tabs.Tab
                  key={list}
                  value={list}
                  label={label + ' (' + codesFor(list).length + ')'}
                />
              ))}
            </Tabs.List>
            {levels.map(({ list, label }) => {
              const codes = codesFor(list)
              const matches = codes.filter((code) =>
                [code.shortName, code.code, code.description].some((value) =>
                  value?.toLocaleLowerCase('nb').includes(search)
                )
              )
              return (
                <Tabs.Panel key={list} value={list} className='pt-6'>
                  <Heading size='medium' level='2' className='mb-4'>
                    {label}
                  </Heading>
                  <BodyShort className='mb-3' aria-live='polite'>
                    Viser {matches.length} av {codes.length}
                  </BodyShort>
                  {matches.length ? (
                    <div className='overflow-x-auto'>
                      <Table>
                        <Table.Header>
                          <Table.Row>
                            <Table.HeaderCell scope='col'>Navn</Table.HeaderCell>
                            <Table.HeaderCell scope='col'>Kode</Table.HeaderCell>
                            <Table.HeaderCell scope='col'>Beskrivelse</Table.HeaderCell>
                          </Table.Row>
                        </Table.Header>
                        <Table.Body>
                          {matches.map((code) => (
                            <Table.Row key={code.code}>
                              <Table.HeaderCell scope='row'>{code.shortName}</Table.HeaderCell>
                              <Table.DataCell>{code.code}</Table.DataCell>
                              <Table.DataCell>{code.description || '–'}</Table.DataCell>
                            </Table.Row>
                          ))}
                        </Table.Body>
                      </Table>
                    </div>
                  ) : (
                    <BodyLong>
                      {codes.length
                        ? 'Ingen treff. Prøv et annet søk.'
                        : 'Ingen registrerte ' + label.toLocaleLowerCase('nb') + '.'}
                    </BodyLong>
                  )}
                </Tabs.Panel>
              )
            })}
          </Tabs>
        </>
      )}
    </div>
  )
}
