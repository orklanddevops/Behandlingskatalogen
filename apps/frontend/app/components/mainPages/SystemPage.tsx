'use client'

import { Tabs } from '@navikt/ds-react'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { getInformationTypesBy } from '@/api/InfoTypeApi'
import { EListName } from '@/constants/codelistConstant'
import { InfoTypeTable } from '../InformationType/InfoTypeTableSimple'
import ProcessList from '../Process/ProcessList'
import SystemInformationPanel from '../SystemInformation/SystemInformationPanel'
import { PageHeader } from '../common/PageHeader'
import { ESection } from './ProcessPage'

export const SystemPage = () => {
  const { systemCode } = useParams<{ systemCode: string }>()
  const [activeTab, setActiveTab] = useState('behandlinger')

  return (
    <>
      {systemCode && (
        <>
          <PageHeader section={ESection.system} code={systemCode} />

          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List>
              <Tabs.Tab value='behandlinger' label='Databehandlinger' />
              <Tabs.Tab value='opplysningstyper' label='Opplysningstyper' />
              <Tabs.Tab value='systeminformasjon' label='Systeminformasjon' />
            </Tabs.List>
            <Tabs.Panel value='behandlinger'>
              <ProcessList
                section={ESection.system}
                code={systemCode}
                listName={EListName.SYSTEM}
                isEditable={false}
              />
            </Tabs.Panel>
            <Tabs.Panel value='opplysningstyper'>
              <InfoTypeTable
                title='Opplysningstyper systemet er master for'
                getInfoTypes={async () =>
                  (await getInformationTypesBy({ orgMaster: systemCode })).content
                }
              />
            </Tabs.Panel>
            <Tabs.Panel value='systeminformasjon'>
              <SystemInformationPanel key={systemCode} systemCode={systemCode} />
            </Tabs.Panel>
          </Tabs>
        </>
      )}
    </>
  )
}
