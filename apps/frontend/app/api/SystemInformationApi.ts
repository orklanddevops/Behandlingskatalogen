import axios from 'axios'
import { env } from '../util/env'

export interface ISystemContact {
  id: string
  name: string
  email: string
}

export interface ISystemInformationData {
  systemOwner: ISystemContact | null
  administrators: ISystemContact[]
  superUsers: ISystemContact[]
  organisationalUnit: string
  supportEmail: string
  supportPhone?: string
  emergencyEmail?: string
  emergencyUrl?: string
  emergencyPhone?: string
  supportUrl: string
  notes: string
  lastVerifiedDate: string | null
  lastVerifiedBy: string | null
}

export interface ISystemInformation {
  systemCode: string
  version: number | null
  data: ISystemInformationData
  updatedAt: string | null
  updatedBy: string | null
}

export const getSystemInformation = async (code: string): Promise<ISystemInformation> =>
  (
    await axios.get<ISystemInformation>(
      `${env.pollyBaseUrl}/system-information/${encodeURIComponent(code)}`
    )
  ).data

export const saveSystemInformation = async (
  info: ISystemInformation,
  markVerified: boolean
): Promise<ISystemInformation> =>
  (
    await axios.put<ISystemInformation>(
      `${env.pollyBaseUrl}/system-information/${encodeURIComponent(info.systemCode)}`,
      {
        version: info.version,
        systemOwnerId: info.data.systemOwner?.id ?? null,
        administratorIds: info.data.administrators.map((contact) => contact.id),
        superUserIds: info.data.superUsers.map((contact) => contact.id),
        organisationalUnit: info.data.organisationalUnit,
        supportEmail: info.data.supportEmail,
        supportUrl: info.data.supportUrl,
        supportPhone: info.data.supportPhone || '',
        emergencyEmail: info.data.emergencyEmail || '',
        emergencyUrl: info.data.emergencyUrl || '',
        emergencyPhone: info.data.emergencyPhone || '',
        notes: info.data.notes,
        markVerified,
      }
    )
  ).data
