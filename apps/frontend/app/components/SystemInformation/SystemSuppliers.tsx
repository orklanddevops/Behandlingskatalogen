'use client'

import { Alert, BodyShort, Button, Heading, Label, Link, Loader } from '@navikt/ds-react'
import { useEffect, useState } from 'react'
import Select from 'react-select'
import { getAllProcessors } from '@/api/ProcessorApi'
import { IProcessor } from '@/constants'
import { selectOverrides } from '../common/AsyncSelectComponents'

export default function SystemSuppliers({
  value,
  onChange,
}: {
  value: string[]
  onChange?: (ids: string[]) => void
}) {
  const [suppliers, setSuppliers] = useState<IProcessor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  useEffect(() => {
    let active = true
    getAllProcessors()
      .then((result: IProcessor[]) => {
        if (active) setSuppliers(result.sort((a, b) => a.name.localeCompare(b.name, 'nb')))
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
  }, [])

  return (
    <div className='space-y-3'>
      <Heading size='small' level='3'>
        Leverandører
      </Heading>
      {loading && <Loader title='Henter leverandører' />}
      {error && (
        <Alert variant='error'>
          Kunne ikke hente leverandører. Last siden på nytt for å prøve igjen.
        </Alert>
      )}
      {onChange && !loading && !error && (
        <div>
          <Label htmlFor='system-suppliers'>Legg til leverandør</Label>
          <BodyShort id='system-suppliers-description' className='mb-2'>
            Søk i databehandlere og leverandører. Du kan legge til flere.
          </BodyShort>
          <Select
            inputId='system-suppliers'
            instanceId='system-suppliers'
            aria-describedby='system-suppliers-description'
            placeholder='Søk etter leverandør'
            isSearchable
            value={null}
            options={suppliers
              .filter((supplier) => !value.includes(supplier.id))
              .map((supplier) => ({ value: supplier.id, label: supplier.name }))}
            onChange={(option) => {
              if (option) onChange([...value, option.value])
            }}
            noOptionsMessage={() => 'Ingen leverandører funnet'}
            styles={selectOverrides}
          />
        </div>
      )}
      {value.length === 0 && <BodyShort>Ingen leverandører registrert</BodyShort>}
      {value.length > 0 && (
        <ul className='m-0 list-none space-y-2 p-0'>
          {value.map((id) => {
            const name = suppliers.find((supplier) => supplier.id === id)?.name || id
            return (
              <li key={id} className='flex items-center justify-between gap-3'>
                <Link href={`/processor/${id}`}>{name}</Link>
                {onChange && (
                  <Button
                    type='button'
                    size='small'
                    variant='tertiary'
                    aria-label={`Fjern ${name}`}
                    onClick={() => onChange(value.filter((supplierId) => supplierId !== id))}
                  >
                    Fjern
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
