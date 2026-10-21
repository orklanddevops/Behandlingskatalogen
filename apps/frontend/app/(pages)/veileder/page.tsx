'use client'

import { BodyLong, Heading, Link, List } from '@navikt/ds-react'

export default function Veileder() {
  return (
    <main className='max-w-3xl space-y-6'>
      <Heading size='xlarge' level='1'>
        Veileder for Orkland kommune
      </Heading>
      <BodyLong>
        Behandlingskatalogen gir oversikt over kommunens behandling av personopplysninger. Bruk
        katalogen til å dokumentere hva opplysningene brukes til, hvem som har ansvar, og hvordan de
        håndteres.
      </BodyLong>
      <section className='space-y-3'>
        <Heading size='medium' level='2'>
          Kom i gang
        </Heading>
        <List as='ol'>
          <List.Item>
            Velg Behandlinger i menyen for å finne eller opprette en behandling.
          </List.Item>
          <List.Item>
            Beskriv formål, ansvar, opplysningstyper, systemer og behandlingsgrunnlag.
          </List.Item>
          <List.Item>
            Registrer eventuelle eksterne parter, databehandlere og utleveringer.
          </List.Item>
          <List.Item>
            Kontroller dokumentasjonen, og hold den oppdatert når behandlingen endres.
          </List.Item>
        </List>
      </section>
      <section className='space-y-3'>
        <Heading size='medium' level='2'>
          Trenger du hjelp?
        </Heading>
        <BodyLong>
          Kontakt systemansvarlig i Orkland kommune for spørsmål om tilgang, dokumentasjon eller
          endringer i katalogen.
        </BodyLong>
        <Link href='https://www.orkland.kommune.no/' target='_blank' rel='noopener noreferrer'>
          Orkland kommunes nettsted
        </Link>
      </section>
    </main>
  )
}
