import { EListName, ICode } from '@/constants/codelistConstant'

export function filterOrganisationCodes(
  codes: ICode[],
  list: EListName,
  departmentIds: string[] = [],
  sectionIds: string[] = []
): ICode[] {
  const byId = new Map(codes.map((code) => [code.code, code]))
  const hasAncestor = (code: ICode, parents: string[]) => {
    const visited = new Set<string>([code.code])
    let parent = code.parentCode
    while (parent && !visited.has(parent)) {
      if (parents.includes(parent)) return true
      visited.add(parent)
      parent = byId.get(parent)?.parentCode
    }
    return false
  }
  return codes
    .filter((code) => {
      if (code.list !== list || code.invalidCode) return false
      if (list === EListName.DEPARTMENT) return true
      if (list === EListName.SEKSJON) return hasAncestor(code, departmentIds)
      if (list === EListName.SUB_DEPARTMENT) {
        return (
          (departmentIds.length > 0 || sectionIds.length > 0) &&
          (!departmentIds.length || hasAncestor(code, departmentIds)) &&
          (!sectionIds.length || hasAncestor(code, sectionIds))
        )
      }
      return false
    })
    .toSorted((a, b) => a.shortName.localeCompare(b.shortName, 'nb'))
}
