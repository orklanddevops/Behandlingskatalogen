import { env } from './env'

export const teamLink = (teamId: string) =>
  env.teamKatBaseUrl ? env.teamKatBaseUrl + 'team/' + encodeURIComponent(teamId) : undefined

export const productAreaLink = (productAreaId: string) =>
  env.teamKatBaseUrl
    ? env.teamKatBaseUrl + 'productarea/' + encodeURIComponent(productAreaId)
    : undefined
