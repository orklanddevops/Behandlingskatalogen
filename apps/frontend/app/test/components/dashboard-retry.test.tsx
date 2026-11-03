/** @jest-environment jsdom */
import { act } from 'react'
import { Root, createRoot } from 'react-dom/client'
import { getDashboard } from '../../api/DashboardApi'
import { DashboardPage } from '../../components/mainPages/dashboardPage'
import { IDashboardData } from '../../constants'

jest.mock('next/navigation', () => ({ useParams: () => ({}) }))
jest.mock('../../api/DashboardApi')
jest.mock('../../components/Charts/Charts', () => ({
  __esModule: true,
  default: () => <div>Statistikk lastet</div>,
}))
jest.mock('../../components/Dashboard/Departments', () => ({
  __esModule: true,
  default: () => <div>Enheter lastet</div>,
}))
jest.mock('../../components/Dashboard/FilterDashboardStatus', () => ({
  FilterDashboardStatus: () => null,
}))

test('failed dashboard lookup shows an error and retry loads the data', async () => {
  ;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root: Root = createRoot(container)
  try {
    jest
      .mocked(getDashboard)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ all: {}, departments: [] } as unknown as IDashboardData)
    await act(async () => root.render(<DashboardPage />))
    expect(container.textContent).toContain('Kunne ikke hente dashboardet')
    const retry = Array.from(container.querySelectorAll('button')).find(
      (node) => node.textContent === 'Prøv igjen'
    )!
    await act(async () => retry.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(container.textContent).toContain('Statistikk lastet')
    expect(container.textContent).not.toContain('Kunne ikke hente dashboardet')
    expect(getDashboard).toHaveBeenCalledTimes(2)
  } finally {
    await act(async () => root.unmount())
    container.remove()
    jest.resetAllMocks()
  }
})
