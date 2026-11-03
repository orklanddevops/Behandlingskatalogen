'use client'

import { Alert, Button, Heading, Loader } from '@navikt/ds-react'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getDashboard } from '@/api/DashboardApi'
import { EProcessStatusFilter, IDashboardData } from '@/constants'
import Charts from '../Charts/Charts'
import Departments from '../Dashboard/Departments'
import { FilterDashboardStatus } from '../Dashboard/FilterDashboardStatus'

export const DashboardPage = () => {
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [dashboardData, setDashboardData] = useState<IDashboardData>()
  const { filterName: processStatus } = useParams<{ filterName: EProcessStatusFilter }>()
  const [dashboardStatus, setDashboardStatus] = useState<EProcessStatusFilter>(
    processStatus ? (processStatus as EProcessStatusFilter) : EProcessStatusFilter.All
  )

  useEffect(() => {
    let active = true
    getDashboard(dashboardStatus)
      .then((data) => {
        if (active) setDashboardData(data)
      })
      .catch(() => {
        if (active) setError(true)
      })
    return () => {
      active = false
    }
  }, [dashboardStatus, attempt])

  return (
    <div className='mb-12 flex flex-wrap'>
      <div className='flex flex-col w-full gap-2'>
        <Heading size='large'>Dashboard</Heading>
        <FilterDashboardStatus
          setFilter={(status) => {
            setError(false)
            setDashboardData(undefined)
            setDashboardStatus(status)
          }}
        />
      </div>

      {error && (
        <Alert variant='error' className='mt-6 w-full'>
          Kunne ikke hente dashboardet. Prøv igjen.
          <Button
            className='mt-3'
            variant='secondary'
            onClick={() => {
              setError(false)
              setDashboardData(undefined)
              setAttempt((value) => value + 1)
            }}
          >
            Prøv igjen
          </Button>
        </Alert>
      )}
      {dashboardData && (
        <div className='w-full mt-6'>
          <Heading size='medium' className='mb-2'>
            Enheter
          </Heading>
          <Departments data={dashboardData} />
        </div>
      )}
      {dashboardData && (
        <div className='w-full mt-6'>
          <Heading size='medium' className='mb-4'>
            Behandlingsstatistikk (ikke inkludert Orkland kommune som databehandler)
          </Heading>
          <Charts chartData={dashboardData.all} processStatus={dashboardStatus} />
        </div>
      )}
      {!dashboardData && !error && (
        <div className='flex w-full justify-center'>
          <Loader size='3xlarge' />
        </div>
      )}
    </div>
  )
}
