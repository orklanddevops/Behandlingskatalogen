import axios from 'axios'
import { env } from '@/util/env'

export interface IOrganisationUnit {
  id: string
  parentId: string | null
  name: string
  managerName: string
}

export interface IOrganisationChartStatus {
  syncEnabled: boolean
  chart: {
    organizationNumber: string | null
    retrievedAt: string | null
    lastAttemptAt: string | null
    lastError: string | null
    units: IOrganisationUnit[]
  }
}

export const getOrganisationChart = async () =>
  (await axios.get<IOrganisationChartStatus>(`${env.pollyBaseUrl}/organisation`)).data

export const refreshOrganisationChart = async () =>
  (await axios.post<IOrganisationChartStatus>(`${env.pollyBaseUrl}/organisation/refresh`)).data
