import _ from 'lodash'
import { IRetention } from '../../constants'

interface IRetentionViewProps {
  retention?: IRetention
}

export const RetentionView = (props: IRetentionViewProps) => {
  const { retention } = props
  const retentionYears = Math.floor((retention?.retentionMonths || 0) / 12)
  const retentionMonths = (retention?.retentionMonths || 0) - retentionYears * 12
  const retentionDays = retention?.retentionDays || 0
  const duration = [
    retentionYears && `${retentionYears} år`,
    retentionMonths && `${retentionMonths} måneder`,
    retentionDays && `${retentionDays} dager`,
  ].filter(Boolean)
  const durationText =
    duration.length > 1
      ? `${duration.slice(0, -1).join(', ')} og ${duration[duration.length - 1]}`
      : duration[0]

  if (!duration.length) {
    return null
  }

  return (
    <span>
      <span>Lagres i {durationText}</span>
      <span> fra </span>
      <span>{_.lowerFirst(retention?.retentionStart)}</span>
    </span>
  )
}
