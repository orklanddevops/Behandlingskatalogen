/** @jest-environment jsdom */
import { useParams } from 'next/navigation'
import { act } from 'react'
import { Root, createRoot } from 'react-dom/client'
import CodeListPage from '../../components/admin/CodeList/CodelistPage'
import { EListName, IAllCodelists } from '../../constants/codelistConstant'
import { CodelistContext, ICodelistProps } from '../../provider/kodeverkProvider'
import { IUserContext, UserContext } from '../../provider/userProvider'

jest.mock('../../api/GetAllApi', () => ({
  createCodelist: jest.fn(),
  updateCodelist: jest.fn(),
  deleteCodelist: jest.fn(),
  getCodelistUsage: jest.fn(),
}))
jest.mock('../../components/admin/CodeList/CodeListUsage', () => ({ Usage: () => null }))
jest.mock('next/navigation', () => ({ useParams: jest.fn() }))
jest.mock('../../util/router', () => ({ useNavigate: () => jest.fn() }))
jest.mock('../../components/admin/audit/AuditButtonDS', () => ({ AuditButtonDS: () => null }))
jest.mock('../../components/admin/CodeList/ModalCreateCodeList', () => () => null)
jest.mock('../../components/admin/CodeList/ModalUpdateCodeList', () => () => null)
jest.mock('../../components/admin/CodeList/ModalDeleteCodeList', () => () => null)

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  ;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})
async function render(list: EListName) {
  jest.mocked(useParams).mockReturnValue({ listname: list })
  const lists: IAllCodelists = {
    codelist: {
      [list]: [{ list, code: '1', shortName: 'Example', description: 'Example' }],
    },
  }
  const utils = {
    isLoaded: () => lists,
    makeIdLabelForAllCodeLists: () => [{ id: list, label: list }],
  } as ICodelistProps
  await act(async () =>
    root.render(
      <UserContext.Provider value={{ isAdmin: () => true } as IUserContext}>
        <CodelistContext.Provider value={{ lists, utils, setLists: jest.fn() }}>
          <CodeListPage />
        </CodelistContext.Provider>
      </UserContext.Provider>
    )
  )
}
test.each([EListName.DEPARTMENT, EListName.SEKSJON, EListName.SUB_DEPARTMENT])(
  'organisation category %s is read-only even for administrators',
  async (list) => {
    await render(list)
    expect(container.textContent).toContain('hentes automatisk fra organisasjonskartet i eADM')
    expect(container.textContent).not.toContain('Opprett ny kode')
    expect(container.querySelector('svg title')?.textContent).not.toBe('Redigér')
    expect(
      Array.from(container.querySelectorAll('svg title')).map((title) => title.textContent)
    ).not.toEqual(expect.arrayContaining(['Slett', 'Redigér']))
    expect(container.textContent).toContain('Example')
  }
)
test('team category retains creation, editing and deletion', async () => {
  await render(EListName.TEAM)
  expect(container.textContent).toContain('Opprett ny kode')
  expect(
    Array.from(container.querySelectorAll('svg title')).map((title) => title.textContent)
  ).toEqual(expect.arrayContaining(['Slett', 'Redigér']))
})
