'use client'

import { Chips } from '@navikt/ds-react'
import { getIn, useFormikContext } from 'formik'
import { useContext, useEffect } from 'react'
import { EListName } from '@/constants/codelistConstant'
import { CodelistContext } from '@/provider/kodeverkProvider'
import { filterOrganisationCodes } from '@/util/organisationHierarchy'
import { IDpProcessFormValues, IProcessFormValues } from '../../../constants'
import { ModalLabel } from '../../common/ModalSchema'
import OrganisationSelect from '../../common/OrganisationSelect'

const FieldDepartment = (props: { department?: string }) => {
  const { errors, touched, submitCount, values, setFieldValue, setFieldTouched } = useFormikContext<
    IProcessFormValues | IDpProcessFormValues
  >()
  const { utils } = useContext(CodelistContext)
  const codes = [EListName.DEPARTMENT, EListName.SEKSJON, EListName.SUB_DEPARTMENT].flatMap(
    (list) => utils.getCodes(list)
  )
  const department = values.affiliation.nomDepartmentId ?? props.department ?? ''
  const selected = values.affiliation.seksjoner ?? []
  const departments = filterOrganisationCodes(codes, EListName.DEPARTMENT)
  const sections = filterOrganisationCodes(codes, EListName.SEKSJON, department ? [department] : [])

  useEffect(() => {
    const current = values.affiliation.seksjoner ?? []
    const cleaned = current.filter(
      (section) => !!section?.nomSeksjonId && !!section?.nomSeksjonName
    )
    if (cleaned.length !== current.length) setFieldValue('affiliation.seksjoner', cleaned, false)
  }, [values.affiliation.seksjoner, setFieldValue])

  const hasError = (field: string) =>
    !!getIn(errors, field) && (!!getIn(touched, field) || submitCount > 0)

  const updateAffiliation = (
    nextDepartment: string,
    nextDepartmentName: string,
    nextSections: typeof selected
  ) => {
    const availableSections = new Set(
      filterOrganisationCodes(codes, EListName.SEKSJON, nextDepartment ? [nextDepartment] : []).map(
        (code) => code.code
      )
    )
    const retainedSections = nextSections.filter((section) =>
      availableSections.has(section.nomSeksjonId)
    )
    const availableSubDepartments = new Set(
      filterOrganisationCodes(
        codes,
        EListName.SUB_DEPARTMENT,
        nextDepartment ? [nextDepartment] : [],
        retainedSections.map((section) => section.nomSeksjonId)
      ).map((code) => code.code)
    )
    setFieldValue('affiliation', {
      ...values.affiliation,
      nomDepartmentId: nextDepartment,
      nomDepartmentName: nextDepartmentName,
      seksjoner: retainedSections,
      subDepartments: (values.affiliation.subDepartments ?? []).filter((id) =>
        availableSubDepartments.has(id)
      ),
    })
  }

  return (
    <div>
      <OrganisationSelect
        id='affiliation-nomDepartmentId'
        label='Velg enhet'
        options={departments.map((code) => ({ value: code.code, label: code.shortName }))}
        value={department}
        error={hasError('affiliation.nomDepartmentId')}
        onChange={(option) => {
          if (String(option?.value ?? '') !== department) {
            updateAffiliation(String(option?.value ?? ''), String(option?.label ?? ''), selected)
          }
          setFieldTouched('affiliation.nomDepartmentId', true, false)
        }}
      />
      {department && (
        <div className='mt-3'>
          <ModalLabel
            label='Avdeling'
            tooltip='Velg én eller flere avdelinger under valgt enhet.'
          />
          <OrganisationSelect
            id='affiliation-seksjoner-nomSeksjonId'
            label='Velg avdeling'
            options={sections
              .filter((code) => !selected.some((section) => section.nomSeksjonId === code.code))
              .map((code) => ({ value: code.code, label: code.shortName }))}
            error={hasError('affiliation.seksjoner')}
            onChange={(option) => {
              if (
                option &&
                typeof option.value === 'string' &&
                typeof option.label === 'string' &&
                !selected.some((section) => section.nomSeksjonId === option.value)
              ) {
                updateAffiliation(department, values.affiliation.nomDepartmentName ?? '', [
                  ...selected,
                  { nomSeksjonId: option.value, nomSeksjonName: option.label },
                ])
                setFieldTouched('affiliation.seksjoner', true, false)
              }
            }}
          />
          <div className='mt-2 flex flex-wrap gap-2'>
            {selected.map((section, index) => (
              <Chips.Removable
                key={section.nomSeksjonId}
                onClick={() =>
                  updateAffiliation(
                    department,
                    values.affiliation.nomDepartmentName ?? '',
                    selected.filter((_, selectedIndex) => selectedIndex !== index)
                  )
                }
              >
                {section.nomSeksjonName}
              </Chips.Removable>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
export default FieldDepartment
