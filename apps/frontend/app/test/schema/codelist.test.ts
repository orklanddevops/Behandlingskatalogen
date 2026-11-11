import { EListName, ICode } from '@/constants/codelistConstant'
import { codeListSchema } from '../../components/common/schemaValidation'
import '../config/schemaValidator'

const schema = codeListSchema()
const createCodelist: () => ICode = () => ({
  list: EListName.PURPOSE,
  code: 'CODE',
  description: 'desc',
  shortName: 'name',
})

test('Codelist ok', () => {
  expect(createCodelist()).toBeSchema(schema)
})

test('Codelist errors', () => {
  expect({ ...createCodelist(), list: undefined }).toBeSchemaErrorAt(schema, 'list')
  expect({ ...createCodelist(), code: '' }).toBeSchemaErrorAt(schema, 'code')
  expect({ ...createCodelist(), description: '' }).toBeSchemaErrorAt(schema, 'description')
  expect({ ...createCodelist(), shortName: '' }).toBeSchemaErrorAt(schema, 'shortName')
})

test('imported Lovdata identifiers remain valid in the administration forms', () => {
  expect({
    ...createCodelist(),
    list: EListName.NATIONAL_LAW,
    code: 'LOV_2018_06_22_83',
    description: '2018-06-22-83',
  }).toBeSchema(schema)
  expect({ ...createCodelist(), code: 'lov-2018-06-22-83' }).toBeSchemaErrorAt(schema, 'code')
})

test.each(['123', '00123', 'TEAM_2', '2_TEAM'])(
  'numbers are allowed generally in code %s',
  (code) => {
    for (const list of [
      EListName.PURPOSE,
      EListName.TEAM,
      EListName.NATIONAL_LAW,
      EListName.SYSTEM,
    ]) {
      const value = { ...createCodelist(), list, code }
      expect(value).toBeSchema(schema)
      expect(schema.validateSync(value).code).toBe(code)
    }
  }
)
