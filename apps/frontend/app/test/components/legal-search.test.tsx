/** @jest-environment jsdom */
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { getProcessesFor } from '../../api/ProcessApi'
import { LegalPage } from '../../components/mainPages/LegalPage'
import { EListName } from '../../constants/codelistConstant'
import { CodelistContext, ICodelistProps } from '../../provider/kodeverkProvider'

let mockSearchParams = new URLSearchParams('nationalLaw=MAT')
jest.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
  usePathname: () => '/process/legal',
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}))
jest.mock('../../api/ProcessApi', () => ({ getProcessesFor: jest.fn() }))
jest.mock('../../components/Process/SimpleProcessTable', () => ({
  SimpleProcessTable: ({ processes }: any) => (
    <div>{processes.map((p: any) => p.name).join(',')}</div>
  ),
}))

test('a single navigation replaces the selected law and stale responses cannot replace the latest results', async () => {
  ;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
  const container = document.createElement('div')
  const root = createRoot(container)
  const pending: Array<(value: any) => void> = []
  jest
    .mocked(getProcessesFor)
    .mockImplementation(() => new Promise((resolve) => pending.push(resolve)))
  const render = () =>
    root.render(
      <CodelistContext.Provider
        value={
          {
            utils: {
              getCodes: (list: EListName) =>
                list === EListName.NATIONAL_LAW
                  ? [
                      { code: 'MAT', shortName: 'Matloven' },
                      { code: 'FLAGG', shortName: 'Flaggloven' },
                    ]
                  : [],
            } as unknown as ICodelistProps,
          } as any
        }
      >
        <LegalPage />
      </CodelistContext.Provider>
    )
  try {
    await act(async () => render())
    expect(container.querySelectorAll('select')[1].value).toBe('MAT')
    mockSearchParams = new URLSearchParams('nationalLaw=FLAGG')
    await act(async () => render())
    expect(container.querySelectorAll('select')[1].value).toBe('FLAGG')
    expect(getProcessesFor).toHaveBeenLastCalledWith({
      nationalLaw: 'FLAGG',
      gdprArticle: undefined,
    })
    await act(async () => pending[1]({ content: [{ name: 'Flagg result' }] }))
    await act(async () => pending[0]({ content: [{ name: 'Mat result' }] }))
    expect(container.textContent).toContain('Flagg result')
    expect(container.textContent).not.toContain('Mat result')
  } finally {
    await act(async () => root.unmount())
  }
})
