'use client'

import { Alert, BodyLong, Heading, Loader, Select } from '@navikt/ds-react'
import queryString from 'query-string'
import { ChangeEvent, useContext, useEffect, useState } from 'react'
import { getProcessesFor } from '@/api/ProcessApi'
import { IPageResponse, IProcess } from '@/constants'
import { EListName, ICode } from '@/constants/codelistConstant'
import { CodelistContext } from '@/provider/kodeverkProvider'
import { useQueryParam } from '@/util/hooks'
import { useLocation, useNavigate } from '@/util/router'
import { SimpleProcessTable } from '../Process/SimpleProcessTable'

export const LegalPage = () => {
  const [result, setResult] = useState<{
    key: string
    processes: IProcess[]
    error: string
  } | null>(null)
  const gdprArticle = useQueryParam('gdprArticle')
  const nationalLaw = useQueryParam('nationalLaw')
  const navigate = useNavigate()
  const location = useLocation()

  const { utils: codelistUtils } = useContext(CodelistContext)

  const queryKey = JSON.stringify([gdprArticle, nationalLaw])
  const hasFilter = !!(gdprArticle || nationalLaw)
  const loading = hasFilter && result?.key !== queryKey
  const processes = hasFilter && result?.key === queryKey ? result.processes : []
  const error = hasFilter && result?.key === queryKey ? result.error : ''

  useEffect(() => {
    let active = true
    if (!gdprArticle && !nationalLaw) return
    getProcessesFor({ gdprArticle, nationalLaw })
      .then((response: IPageResponse<IProcess>) => {
        if (active) setResult({ key: queryKey, processes: response.content, error: '' })
      })
      .catch(() => {
        if (active)
          setResult({
            key: queryKey,
            processes: [],
            error: 'Kunne ikke hente databehandlinger. Kontroller innloggingen og prøv igjen.',
          })
      })
    return () => {
      active = false
    }
  }, [gdprArticle, nationalLaw, queryKey])

  const gdprOptions = codelistUtils.getCodes(EListName.GDPR_ARTICLE)
  const lawOptions = codelistUtils.getCodes(EListName.NATIONAL_LAW)

  return (
    <div>
      <Heading size='large'>Søk behandlingsgrunnlag</Heading>
      <BodyLong size='large'>Velg GDPR artikkel og/eller nasjonal lov</BodyLong>
      <div className='flex mt-3'>
        <div className='w-[40%] mt-3'>
          <Select
            label='GDPR artikkel'
            value={gdprArticle ?? ''}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              navigate(
                location.pathname +
                  '?' +
                  queryString.stringify(
                    { gdprArticle: event.target.value, nationalLaw },
                    { skipNull: true }
                  )
              )
            }
          >
            <option value=''>Velg</option>
            {gdprOptions.map((option: ICode) => (
              <option key={option.code} value={option.code}>
                {option.shortName || option.code}
              </option>
            ))}
          </Select>
        </div>
        <div className='w-[40%] mt-3 ml-2.5'>
          <Select
            label='Nasjonal lov'
            value={nationalLaw ?? ''}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              navigate(
                location.pathname +
                  '?' +
                  queryString.stringify(
                    { gdprArticle, nationalLaw: event.target.value },
                    { skipNull: true }
                  )
              )
            }
          >
            <option value=''>Velg</option>
            {lawOptions.map((option: ICode) => (
              <option key={option.code} value={option.code}>
                {option.shortName || option.code}
              </option>
            ))}
          </Select>
        </div>
      </div>
      {error && (
        <Alert variant='error' role='alert' className='mt-4'>
          {error}
        </Alert>
      )}
      {loading ? (
        <Loader title='Søker etter databehandlinger' className='mt-4' />
      ) : (
        !error && <ProcessTable processes={processes} />
      )}
    </div>
  )
}

const ProcessTable = (props: { processes: IProcess[] }) => (
  <div className='flex flex-col mt-3'>
    <Heading size='medium'> Databehandlinger ({props.processes.length})</Heading>
    <SimpleProcessTable
      title={'Databehandlinger' + ' (' + props.processes.length + ')'}
      processes={props.processes}
    />
  </div>
)
