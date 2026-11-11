import { EListName, ICode } from '../constants/codelistConstant'
import { filterOrganisationCodes } from '../util/organisationHierarchy'

const code = (list: EListName, id: string, parentCode?: string): ICode => ({
  list,
  code: id,
  shortName: id,
  parentCode,
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
test('child options require a matching parent, and departments never leak between branches', () => {
  expect(ids(EListName.SEKSJON)).toEqual([])
  expect(ids(EListName.SUB_DEPARTMENT)).toEqual([])
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
