'use client'

import { FieldArray, getIn, useFormikContext } from 'formik'
import { useEffect, useState } from 'react'
import { getAvdelingOptions, getSeksjonOptions } from '../../../api/NomApi'
import { IDpProcessFormValues, IProcessFormValues, TOption } from '../../../constants'
import { ModalLabel } from '../../common/ModalSchema'
import OrganisationSelect from '../../common/OrganisationSelect'
import { renderTagList } from '../../common/TagList'

const FieldDepartment = (props: { department?: string }) => {
  const { errors, touched, submitCount, values, setFieldValue, setFieldTouched } = useFormikContext<
    IProcessFormValues | IDpProcessFormValues
  >()
  const [departments, setDepartments] = useState<TOption[]>([])
  const [sectionOptions, setSectionOptions] = useState<{ department: string; options: TOption[] }>({
    department: '',
    options: [],
  })
  const department = values.affiliation.nomDepartmentId ?? props.department
  const sections = sectionOptions.department === department ? sectionOptions.options : []
  const selected = values.affiliation.seksjoner ?? []
  useEffect(() => {
    const current = values.affiliation.seksjoner ?? []
    const cleaned = current.filter(
      (section) => !!section?.nomSeksjonId && !!section?.nomSeksjonName
    )
    if (cleaned.length !== current.length) setFieldValue('affiliation.seksjoner', cleaned, false)
  }, [values.affiliation.seksjoner, setFieldValue])
  const hasError = (field: string) =>
    !!getIn(errors, field) && (!!getIn(touched, field) || submitCount > 0)

  useEffect(() => {
    getAvdelingOptions().then(setDepartments)
  }, [])
  useEffect(() => {
    let active = true
    if (department)
      getSeksjonOptions(department).then((options) => {
        if (active) setSectionOptions({ department, options })
      })
    return () => {
      active = false
    }
  }, [department])

  return (
    <div>
      <OrganisationSelect
        id='affiliation-nomDepartmentId'
        label='Velg enhet'
        options={departments}
        value={department || ''}
        error={hasError('affiliation.nomDepartmentId')}
        onChange={(option) => {
          setFieldValue('affiliation.nomDepartmentId', option?.value || '')
          setFieldValue('affiliation.nomDepartmentName', option?.label || '')
          setFieldTouched('affiliation.nomDepartmentId', true, false)
        }}
      />
      {department && (
        <div className='mt-3'>
          <ModalLabel
            label='Avdeling'
            tooltip='Velg én eller flere avdelinger som har ansvar for behandlingen.'
          />
          <OrganisationSelect
            id='affiliation-seksjoner-nomSeksjonId'
            label='Velg avdeling'
            options={sections.filter(
              (option) => !selected.some((s) => s.nomSeksjonId === option.value)
            )}
            error={hasError('affiliation.seksjoner')}
            onChange={(option) => {
              if (option && !selected.some((s) => s.nomSeksjonId === option.value)) {
                setFieldValue('affiliation.seksjoner', [
                  ...selected,
                  { nomSeksjonId: option.value, nomSeksjonName: option.label },
                ])
                setFieldTouched('affiliation.seksjoner', true, false)
              }
            }}
          />
          <FieldArray name='affiliation.seksjoner'>
            {(helpers) => (
              <div className='mt-2 flex flex-wrap gap-2'>
                {renderTagList(
                  selected.map((s) => s.nomSeksjonName),
                  helpers
                )}
              </div>
            )}
          </FieldArray>
        </div>
      )}
    </div>
  )
}
export default FieldDepartment
