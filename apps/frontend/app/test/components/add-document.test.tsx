/** @jest-environment jsdom */
import { act } from 'react'
import { Root, createRoot } from 'react-dom/client'
import {
  getDefaultProcessDocument,
  getDocument,
  getDocumentByPageAndPageSize,
} from '../../api/DocumentApi'
import { AddDocumentModal } from '../../components/Process/Accordion/AddDocumentModal'
import { IDocument, IProcess } from '../../constants'

jest.mock('shortid', () => ({ generate: () => 'test-id' }))

jest.mock('../../api/DocumentApi', () => ({
  getDefaultProcessDocument: jest.fn(),
  getDocument: jest.fn(),
  getDocumentByPageAndPageSize: jest.fn(),
}))
jest.mock('../../components/InformationType/Sensitivity', () => ({
  Sensitivity: () => null,
}))

let container: HTMLDivElement
let root: Root
const subjectCategory = { code: 'BRUKER', shortName: 'Bruker' }
const fullDocument = {
  id: 'new-template',
  name: 'Ny dokumentmal',
  informationTypes: [
    {
      informationTypeId: 'name',
      informationType: { id: 'name', name: 'Navn' },
      subjectCategories: [subjectCategory],
    },
  ],
} as IDocument
const submit = jest.fn()

async function renderModal(isOpen: boolean) {
  await act(async () =>
    root.render(
      <AddDocumentModal
        isOpen={isOpen}
        addDefaultDocument={false}
        process={{ policies: [] } as unknown as IProcess}
        submit={submit}
        onClose={() => {}}
        error={null}
      />
    )
  )
}
async function chooseTemplate() {
  const input = container.querySelector<HTMLInputElement>('input[aria-label="Søk dokumenter"]')!
  expect(input).not.toBeNull()
  await act(async () => {
    input.focus()
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  })
  const option = Array.from(document.querySelectorAll('[role="option"]')).find(
    (node) => node.textContent === fullDocument.name
  )!
  expect(option).toBeDefined()
  await act(async () => option.dispatchEvent(new MouseEvent('click', { bubbles: true })))
}
beforeEach(() => {
  ;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  jest.mocked(getDefaultProcessDocument).mockResolvedValue(undefined)
  jest.mocked(getDocument).mockResolvedValue(fullDocument)
  // The list API returns references without the full information-type details.
  jest.mocked(getDocumentByPageAndPageSize).mockResolvedValue({
    pages: 1,
    content: [
      {
        ...fullDocument,
        informationTypes: [{ informationTypeId: 'name', subjectCategories: [subjectCategory] }],
      },
    ],
  } as any)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  jest.clearAllMocks()
})
test('selects and submits a new template using complete information-type details', async () => {
  await renderModal(true)
  await chooseTemplate()
  expect(getDocument).toHaveBeenCalledWith('new-template')
  expect(document.body.textContent).toContain('Navn')
  const button = Array.from(document.querySelectorAll('button')).find(
    (node) => node.textContent === 'Legg til'
  )!
  await act(async () => button.dispatchEvent(new MouseEvent('click', { bubbles: true })))
  expect(submit).toHaveBeenCalledWith(
    expect.objectContaining({
      document: fullDocument,
      informationTypes: fullDocument.informationTypes,
    }),
    expect.anything()
  )
})
test('refreshes templates when the dialog reopens', async () => {
  jest.mocked(getDocumentByPageAndPageSize).mockResolvedValueOnce({ pages: 1, content: [] } as any)
  await renderModal(true)
  await renderModal(false)
  await renderModal(true)
  expect(getDocumentByPageAndPageSize).toHaveBeenCalledTimes(2)
  await chooseTemplate()
  expect(getDocument).toHaveBeenCalledWith('new-template')
})
test('shows a recoverable error when template details cannot be fetched', async () => {
  jest.mocked(getDocument).mockRejectedValueOnce(new Error('offline'))
  await renderModal(true)
  await chooseTemplate()
  expect(document.querySelector('[role="alert"]')?.textContent).toContain(
    'Kunne ikke hente dokumentet'
  )
  expect(submit).not.toHaveBeenCalled()
})
