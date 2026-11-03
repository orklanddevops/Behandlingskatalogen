'use client'

import { Label } from '@navikt/ds-react'
import { useState } from 'react'
import AsyncSelect from 'react-select/async'
import { ISystemContact } from '@/api/SystemInformationApi'
import { searchResourceByName } from '@/api/TeamApi'
import { selectOverrides } from '../common/AsyncSelectComponents'

interface IEmployeeOption {
  value: string
  label: string
  contact: ISystemContact
}

export default function EmployeePicker({
  id,
  label,
  value,
  multiple = false,
  onChange,
}: {
  id: string
  label: string
  value: ISystemContact[]
  multiple?: boolean
  onChange: (contacts: ISystemContact[]) => void
}) {
  const [error, setError] = useState(false)
  const option = (contact: ISystemContact): IEmployeeOption => ({
    value: contact.id,
    label: contact.email ? `${contact.name} · ${contact.email}` : contact.name,
    contact,
  })
  const loadOptions = async (input: string): Promise<IEmployeeOption[]> => {
    setError(false)
    if (input.trim().length < 3) return []
    try {
      return (await searchResourceByName(input.trim())).content.map((person) =>
        option({
          id: person.navIdent,
          name: person.fullName,
          email: person.email,
        })
      )
    } catch {
      setError(true)
      return []
    }
  }
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <AsyncSelect<IEmployeeOption, boolean>
        inputId={id}
        instanceId={id}
        aria-label={label}
        aria-describedby={`${id}-help`}
        placeholder='Søk etter navn eller e-post'
        isMulti={multiple}
        isClearable
        cacheOptions
        loadOptions={loadOptions}
        value={multiple ? value.map(option) : value[0] ? option(value[0]) : null}
        onChange={(selection) => {
          const options: readonly IEmployeeOption[] = !selection
            ? []
            : Array.isArray(selection)
              ? selection
              : [selection as IEmployeeOption]
          onChange(options.map((item) => item.contact))
        }}
        loadingMessage={() => 'Søker etter ansatte…'}
        noOptionsMessage={({ inputValue }) =>
          inputValue.trim().length < 3
            ? 'Skriv minst 3 tegn for å søke'
            : error
              ? 'Kunne ikke søke. Prøv igjen.'
              : 'Ingen ansatte funnet'
        }
        styles={selectOverrides}
      />
      <p id={`${id}-help`} className='mt-1 text-sm'>
        {error
          ? 'Ansattoppslaget er utilgjengelig. Prøv igjen senere.'
          : 'Skriv minst 3 tegn. Du kan søke på navn eller e-post.'}
      </p>
    </div>
  )
}
