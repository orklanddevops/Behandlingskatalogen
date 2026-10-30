'use client'

import { useEffect, useRef, useState } from 'react'
import Select from 'react-select'
import { TOption } from '../../constants'
import { selectOverrides, selectOverridesError } from './AsyncSelectComponents'

type TProps = {
  id: string
  label: string
  options: TOption[]
  value?: string
  error?: boolean
  onChange: (option: TOption | null) => void
}

export default function OrganisationSelect({ id, label, options, value, error, onChange }: TProps) {
  const wrapper = useRef<HTMLDivElement>(null)
  const [portal, setPortal] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setPortal(
      (wrapper.current?.closest('dialog, [role="dialog"]') as HTMLElement | null) ?? document.body
    )
  }, [])
  return (
    <div ref={wrapper} className='w-full'>
      <Select<TOption>
        inputId={id}
        instanceId={id}
        aria-label={label}
        aria-invalid={error || undefined}
        placeholder={label}
        options={options}
        value={options.find((option) => option.value === value) ?? null}
        onChange={onChange}
        isSearchable
        isClearable={value !== undefined}
        controlShouldRenderValue={value !== undefined}
        maxMenuHeight={240}
        menuPortalTarget={portal}
        menuPosition={portal ? 'fixed' : 'absolute'}
        styles={error ? selectOverridesError : selectOverrides}
        noOptionsMessage={() => 'Ingen alternativer'}
      />
    </div>
  )
}
