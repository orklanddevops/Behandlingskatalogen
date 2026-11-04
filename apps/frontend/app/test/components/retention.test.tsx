/** @jest-environment jsdom */
import { Formik } from 'formik'
import { act } from 'react'
import { Root, createRoot } from 'react-dom/client'
import DpRetentionItems from '../../components/DpProcess/common/RetentionItems'
import { RetentionView } from '../../components/Process/Retention'
import RetentionItems from '../../components/Process/common/RetentionItems'

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
test.each([RetentionItems, DpRetentionItems])(
  'keeps days alongside existing years and months',
  async (Items) => {
    await act(async () =>
      root.render(
        <Formik
          initialValues={{ retention: { retentionMonths: 14, retentionDays: 5 } }}
          onSubmit={() => {}}
        >
          {(formik) => (
            <>
              <Items formikBag={formik as any} />
              <output>{JSON.stringify(formik.values.retention)}</output>
            </>
          )}
        </Formik>
      )
    )
    const input = container.querySelector<HTMLInputElement>('input[step="1"]')!
    expect(input.value).toBe('5')
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '9')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(JSON.parse(container.querySelector('output')!.textContent!)).toEqual({
      retentionMonths: 14,
      retentionDays: 9,
    })
  }
)
test.each([
  [{ retentionDays: 7 }, 'Lagres i 7 dager'],
  [{ retentionMonths: 14, retentionDays: 3 }, 'Lagres i 1 år, 2 måneder og 3 dager'],
  [{ retentionMonths: 12 }, 'Lagres i 1 år'],
])('displays retention including days', async (retention, expected) => {
  await act(async () => root.render(<RetentionView retention={retention} />))
  expect(container.textContent).toContain(expected)
})
