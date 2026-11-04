'use client'

import { TextField } from '@navikt/ds-react'
import { Field, FormikProps } from 'formik'
import { useEffect, useState } from 'react'
import { IDpProcessFormValues } from '../../../constants'
import FieldInput from '../../Process/common/FieldInput'
import { Error, ModalLabel } from '../../common/ModalSchema'

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

interface IRetentionItemsProps {
  formikBag: FormikProps<IDpProcessFormValues>
}

const RetentionItems = (props: IRetentionItemsProps) => {
  const { formikBag } = props

  const [retention, setRetention] = useState(formikBag.values.retention.retentionMonths || 0)
  const retentionDays = formikBag.values.retention.retentionDays || 0
  const retentionYears: number = Math.floor(retention / 12)
  const retentionMonths: number = retention - retentionYears * 12
  const isEmptyRetention = retention === 0 && retentionDays === 0

  useEffect(() => {
    ;(() =>
      formikBag.setFieldValue(
        'retention.retentionMonths',
        retention === 0 ? undefined : retention
      ))()
  }, [retention])

  return (
    <>
      <div className='w-full mt-4'>
        <ModalLabel
          label='Lagringsbehov for Orkland kommune'
          tooltip='Oppgi lagringstiden Orkland kommune er forpliktet til å overholde. Denne skal fremgå av databehandleravtalen med den behandlingsansvarlige.'
          fullwidth
        />
        <Field name='retention.retentionMonths'>
          {() => (
            <div className='mt-2 flex w-full gap-6'>
              <div className='w-1/3'>
                <TextField
                  label='År'
                  size='small'
                  type='number'
                  value={isEmptyRetention ? '' : retentionYears}
                  min={0}
                  max={100}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const raw = Number(e.target.value)
                    const years = Number.isNaN(raw) ? 0 : clamp(raw, 0, 100)
                    setRetention(years * 12 + retentionMonths)
                  }}
                />
              </div>
              <div className='w-1/3'>
                <TextField
                  label='Måneder'
                  size='small'
                  type='number'
                  value={isEmptyRetention ? '' : retentionMonths}
                  min={0}
                  max={11}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const raw = Number(e.target.value)
                    const months = Number.isNaN(raw) ? 0 : clamp(raw, 0, 11)
                    setRetention(months + retentionYears * 12)
                  }}
                />
              </div>
              <div className='w-1/3'>
                <TextField
                  label='Dager'
                  size='small'
                  type='number'
                  value={retentionDays}
                  min={0}
                  step={1}
                  onChange={(e) => {
                    const raw = Number(e.target.value)
                    const days = Number.isFinite(raw) ? Math.max(0, Math.trunc(raw)) : 0
                    formikBag.setFieldValue('retention.retentionDays', days || undefined)
                  }}
                />
              </div>
            </div>
          )}
        </Field>
      </div>
      <Error fieldName='retention.retentionMonths' />
      <Error fieldName='retention.retentionDays' />

      <div className='w-full mt-4'>
        <ModalLabel
          label='Lagringsbehovet beregnes fra følgende tidspunkt eller hendelse'
          fullwidth
        />
        <div className='mt-2 w-full'>
          <FieldInput
            fieldName='retention.retentionStart'
            fieldValue={formikBag.values.retention.retentionStart}
          />
        </div>
      </div>
      <Error fieldName='retention.retentionStart' />
    </>
  )
}

export default RetentionItems
