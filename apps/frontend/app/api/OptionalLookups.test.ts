import axios from 'axios'
import { getDefaultProcessDocument } from './DocumentApi'
import { getSettings } from './SettingsApi'
import { getResourceById, hasResourceId } from './TeamApi'

jest.mock('axios')
jest.mock('./SettingsApi')
jest.mock('@/util/hooks', () => ({ useDebouncedState: jest.fn() }))

const get = jest.mocked(axios.get)
const settings = jest.mocked(getSettings)

describe('optional lookups', () => {
  it.each([null, undefined, '', 'null', 'undefined'])(
    'does not request an unconfigured default document (%s)',
    async (defaultProcessDocument) => {
      settings.mockResolvedValue({ defaultProcessDocument } as Awaited<
        ReturnType<typeof getSettings>
      >)
      await expect(getDefaultProcessDocument()).resolves.toBeUndefined()
      expect(get).not.toHaveBeenCalled()
    }
  )

  it('loads the configured default document', async () => {
    settings.mockResolvedValue({ defaultProcessDocument: 'document-id' } as Awaited<
      ReturnType<typeof getSettings>
    >)
    get.mockResolvedValue({ data: { id: 'document-id' } })
    await expect(getDefaultProcessDocument()).resolves.toEqual({ id: 'document-id' })
    expect(get).toHaveBeenCalledWith('/api/document/document-id')
  })

  it.each([null, undefined, '', ' ', 'null', 'undefined', 'migration'])(
    'skips absent or system resource identifiers (%s)',
    (id) => expect(hasResourceId(id)).toBe(false)
  )

  it('does not send an HTTP request for a null resource identifier', async () => {
    await expect(getResourceById('null')).rejects.toThrow('Missing resource ID')
    expect(get).not.toHaveBeenCalled()
  })
})
