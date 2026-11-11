import { IAffiliationFormValues } from '@/constants'
import { EListName, ICode } from '@/constants/codelistConstant'

export function getOrganisationAncestors(codes: ICode[], id: string): ICode[] {
  const byId = new Map(codes.map((code) => [code.code, code]))
  const ancestors: ICode[] = []
  const visited = new Set([id])
  let parentId = byId.get(id)?.parentCode
  while (parentId) {
    if (visited.has(parentId)) return []
    visited.add(parentId)
    const parent = byId.get(parentId)
    if (!parent || parent.invalidCode) return []
    ancestors.push(parent)
    parentId = parent.parentCode
  }
  return ancestors
}

export function filterOrganisationCodes(
  codes: ICode[],
  list: EListName,
  departmentIds: string[] = [],
  sectionIds: string[] = []
): ICode[] {
  const hasAncestor = (code: ICode, parents: string[]) =>
    !parents.length ||
    getOrganisationAncestors(codes, code.code).some((ancestor) => parents.includes(ancestor.code))
  return codes
    .filter((code) => {
      if (code.list !== list || code.invalidCode || code.source !== 'EADM') return false
      if (list === EListName.DEPARTMENT) return true
      if (list === EListName.SEKSJON) return hasAncestor(code, departmentIds)
      if (list === EListName.SUB_DEPARTMENT) {
        return hasAncestor(code, departmentIds) && hasAncestor(code, sectionIds)
      }
      return false
    })
    .sort((a, b) => a.shortName.localeCompare(b.shortName, 'nb'))
}

export function selectOrganisationCode(
  codes: ICode[],
  affiliation: IAffiliationFormValues,
  id: string
): IAffiliationFormValues {
  const selected = codes.find(
    (code) => code.code === id && !code.invalidCode && code.source === 'EADM'
  )
  if (!selected) return affiliation
  const ancestors = getOrganisationAncestors(codes, id)
  const department = ancestors.find((code) => code.list === EListName.DEPARTMENT)
  const nomDepartmentId = department?.code ?? affiliation.nomDepartmentId ?? ''
  const sections = filterOrganisationCodes(
    codes,
    EListName.SEKSJON,
    nomDepartmentId ? [nomDepartmentId] : []
  )
  const seksjoner = (affiliation.seksjoner ?? []).filter((section) =>
    sections.some((code) => code.code === section.nomSeksjonId)
  )
  for (const section of [selected, ...ancestors].filter(
    (code) => code.list === EListName.SEKSJON
  )) {
    if (!seksjoner.some((entry) => entry.nomSeksjonId === section.code)) {
      seksjoner.push({ nomSeksjonId: section.code, nomSeksjonName: section.shortName })
    }
  }
  const available = new Set(
    filterOrganisationCodes(
      codes,
      EListName.SUB_DEPARTMENT,
      nomDepartmentId ? [nomDepartmentId] : [],
      seksjoner.map((section) => section.nomSeksjonId)
    ).map((code) => code.code)
  )
  const subDepartments = (affiliation.subDepartments ?? []).filter((code) => available.has(code))
  if (selected.list === EListName.SUB_DEPARTMENT && !subDepartments.includes(id))
    subDepartments.push(id)
  return {
    ...affiliation,
    nomDepartmentId,
    nomDepartmentName: department?.shortName ?? affiliation.nomDepartmentName ?? '',
    seksjoner,
    subDepartments,
  }
}
