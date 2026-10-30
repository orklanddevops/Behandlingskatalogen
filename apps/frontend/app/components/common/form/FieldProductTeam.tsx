'use client'

import { FieldArray, FieldArrayRenderProps } from 'formik'
import { useContext, useEffect, useState } from 'react'
import { EListName } from '@/constants/codelistConstant'
import { CodelistContext } from '@/provider/kodeverkProvider'
import { getTeam, mapTeamToOption } from '../../../api/GetAllApi'
import { TOption } from '../../../constants'
import { Error } from '../ModalSchema'
import OrganisationSelect from '../OrganisationSelect'
import { renderTagList } from '../TagList'

const FieldProductTeam = (props: { productTeams: string[]; fieldName: string }) => {
  const { productTeams, fieldName } = props
  const { utils } = useContext(CodelistContext)
  const options = utils
    .getParsedOptions(EListName.TEAM)
    .map((code) => ({ value: code.id, label: code.label }))
  const [values, setValues] = useState<TOption[]>(
    productTeams.map((team) => ({ value: team, label: team }))
  )

  useEffect(() => {
    ;(async () => {
      const vals: TOption[] = []
      const response: Promise<void>[] = productTeams.map((team: string, index: number) =>
        (async () => {
          try {
            vals.push(mapTeamToOption(await getTeam(team), index))
          } catch (error: any) {
            console.debug(error)
            vals.push({ value: team, label: 'na: ' + team, index })
          }
        })()
      )
      await Promise.all(response)
      setValues(vals.sort((a, b) => (a.index || 0) - (b.index || 0)))
    })()
  }, [productTeams])

  return (
    <>
      <FieldArray
        name={fieldName}
        render={(arrayHelpers: FieldArrayRenderProps) => (
          <div className='w-full'>
            <OrganisationSelect
              id={fieldName + '-team'}
              label='Velg team'
              options={options.filter((option) => !productTeams.includes(option.value))}
              onChange={(option) => {
                if (option)
                  arrayHelpers.form.setFieldValue(fieldName, [...productTeams, option.value])
              }}
            />
            <div className='mt-2 flex flex-wrap gap-2'>
              {renderTagList(
                values.map(
                  (value) =>
                    options.find((option) => option.value === value.value)?.label || value.label
                ) as string[],
                arrayHelpers
              )}
            </div>
          </div>
        )}
      />
      <Error fieldName={fieldName} fullWidth />
    </>
  )
}

export default FieldProductTeam
