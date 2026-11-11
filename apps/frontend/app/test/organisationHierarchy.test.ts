import { EListName, ICode } from '../constants/codelistConstant'
import { filterOrganisationCodes, selectOrganisationCode } from '../util/organisationHierarchy'

const code = (list: EListName, id: string, parentCode?: string): ICode => ({
  list,
  code: id,
  shortName: id,
  parentCode,
  source: 'EADM',
  description: '',
})
const codes = [
  code(EListName.DEPARTMENT, 'A'),
  code(EListName.DEPARTMENT, 'B'),
  code(EListName.SEKSJON, 'A1', 'A'),
  code(EListName.SEKSJON, 'A2', 'A'),
  code(EListName.SEKSJON, 'B1', 'B'),
  code(EListName.SUB_DEPARTMENT, 'A1-child', 'A1'),
  code(EListName.SUB_DEPARTMENT, 'A1-grandchild', 'A1-child'),
  code(EListName.SUB_DEPARTMENT, 'A2-child', 'A2'),
  code(EListName.SUB_DEPARTMENT, 'B1-child', 'B1'),
]
const ids = (list: EListName, departments: string[] = [], sections: string[] = []) =>
  filterOrganisationCodes(codes, list, departments, sections).map((entry) => entry.code)

test('multiple parents include the union of their descendants and preserve deeper underavdelinger', () => {
  expect(ids(EListName.SEKSJON, ['A', 'B'])).toEqual(['A1', 'A2', 'B1'])
  expect(ids(EListName.SUB_DEPARTMENT, ['A'], ['A1', 'A2'])).toEqual([
    'A1-child',
    'A1-grandchild',
    'A2-child',
  ])
  expect(ids(EListName.SUB_DEPARTMENT, ['A', 'B'], ['A1', 'B1'])).toEqual([
    'A1-child',
    'A1-grandchild',
    'B1-child',
  ])
})
test('child options are initially available and never leak between selected branches', () => {
  expect(ids(EListName.SEKSJON)).toEqual(['A1', 'A2', 'B1'])
  expect(ids(EListName.SUB_DEPARTMENT)).toHaveLength(4)
  expect(ids(EListName.SUB_DEPARTMENT, ['A'], ['B1'])).toEqual([])
  expect(ids(EListName.SUB_DEPARTMENT, [], ['A1'])).toEqual(['A1-child', 'A1-grandchild'])
})
test('missing and cyclic ancestry never becomes an eligible branch', () => {
  const broken = [
    code(EListName.SUB_DEPARTMENT, 'missing', 'unknown'),
    code(EListName.SUB_DEPARTMENT, 'cycle1', 'cycle2'),
    code(EListName.SUB_DEPARTMENT, 'cycle2', 'cycle1'),
  ]
  expect(filterOrganisationCodes(broken, EListName.SUB_DEPARTMENT, ['A'])).toEqual([])
})

test('only imported codes are offered, even if legacy codes remain in a cached response', () => {
  const legacy = { ...code(EListName.SEKSJON, 'OLD'), source: undefined }
  expect(
    filterOrganisationCodes([...codes, legacy], EListName.SEKSJON).map((entry) => entry.code)
  ).toEqual(['A1', 'A2', 'B1'])
})

test('selecting a deep descendant resolves enhet and avdeling without mutating the form', () => {
  const initial = {
    nomDepartmentId: 'B',
    nomDepartmentName: 'B',
    seksjoner: [{ nomSeksjonId: 'B1', nomSeksjonName: 'B1' }],
    subDepartments: ['B1-child'],
    fylker: [],
    navKontorer: [],
    productTeams: ['TEAM'],
    products: [],
    disclosureDispatchers: [],
  }
  const selected = selectOrganisationCode(codes, initial, 'A1-grandchild')
  expect(selected).toEqual(
    expect.objectContaining({
      nomDepartmentId: 'A',
      nomDepartmentName: 'A',
      seksjoner: [{ nomSeksjonId: 'A1', nomSeksjonName: 'A1' }],
      subDepartments: ['A1-grandchild'],
      productTeams: ['TEAM'],
    })
  )
  expect(initial.nomDepartmentId).toBe('B')
  expect(initial.subDepartments).toEqual(['B1-child'])
})
