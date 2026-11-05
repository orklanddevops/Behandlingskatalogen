export const qualitySystemLinkLabels = {
  dataProcessingAgreement: 'Databehandleravtale',
  dpia: 'DPIA',
  initialDpia: 'Initiell DPIA',
  ros: 'ROS',
  mainAgreement: 'Hovedavtale',
  otherAgreement: 'Annen avtale',
} as const

export type TQualitySystemDocument = {
  type: string
  name: string
  url: string
}

export type TQualitySystemLinks = Partial<Record<keyof typeof qualitySystemLinkLabels, string>> & {
  documents?: TQualitySystemDocument[]
}

export const qualitySystemLinkTypes: Record<keyof typeof qualitySystemLinkLabels, string> = {
  dataProcessingAgreement: 'DATABEHANDLERAVTALE',
  dpia: 'DPIA',
  initialDpia: 'INITIELL_DPIA',
  ros: 'ROS',
  mainAgreement: 'HOVEDAVTALE',
  otherAgreement: 'ANNEN_AVTALE',
}

export const getQualitySystemDocuments = (
  links?: TQualitySystemLinks
): TQualitySystemDocument[] => [
  ...(links?.documents || []),
  ...Object.entries(qualitySystemLinkLabels).flatMap(([key, name]) => {
    const legacyKey = key as keyof typeof qualitySystemLinkLabels
    const url = links?.[legacyKey]
    return url ? [{ type: qualitySystemLinkTypes[legacyKey], name, url }] : []
  }),
]

export const isQualitySystemUrl = (value: string): boolean => {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) && !!url.hostname
  } catch {
    return false
  }
}
