import axios from 'axios'
import { env } from '../util/env'

export interface ISystemContact {
  id: string
  name: string
  email: string
}

export interface ISystemEconomy {
  annualCost: string | number | null
  purchaseCost: string | number | null
  agreementUrl: string
  purchaseDate: string | null
  terminationTerms: string
}
export type TChecklistAnswer = 'YES' | 'NO' | 'NO_CONTENT' | 'NOT_CHECKED'
export interface ISystemAccessibility {
  relevance: 'UNSET' | 'RELEVANT' | 'NOT_RELEVANT'
  solutionType: 'UNSET' | 'web' | 'app'
  webAnswers: Record<string, TChecklistAnswer>
  appAnswers: Record<string, TChecklistAnswer>
}
export interface ISystemInformationData {
  itResponsible?: ISystemContact | null
  technical?: {
    technicalOperator: ISystemContact | null
    userCount: number | null
    criticality: string
  } | null
  economy?: ISystemEconomy | null
  accessibility?: ISystemAccessibility | null
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
        itResponsibleId: info.data.itResponsible?.id ?? '',
        technical: info.data.technical
          ? {
              technicalOperatorId: info.data.technical.technicalOperator?.id ?? '',
              userCount: info.data.technical.userCount,
              criticality: info.data.technical.criticality,
            }
          : null,
        economy: info.data.economy ?? null,
        accessibility: info.data.accessibility ?? null,
        markVerified,
      }
    )
  ).data
