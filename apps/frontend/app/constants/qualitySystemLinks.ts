export const qualitySystemLinkLabels = {
  dataProcessingAgreement: 'Databehandleravtale',
  dpia: 'DPIA',
  initialDpia: 'Initiell DPIA',
  ros: 'ROS',
  mainAgreement: 'Hovedavtale',
  otherAgreement: 'Annen avtale',
} as const

export type TQualitySystemLinks = Partial<Record<keyof typeof qualitySystemLinkLabels, string>>
