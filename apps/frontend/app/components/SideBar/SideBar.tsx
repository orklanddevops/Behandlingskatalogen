import Image from 'next/image'
import { TThemeMode } from '@/util/themeMode'
import NavItem from './NavItem'

const SideBar = ({ themeMode }: { themeMode: TThemeMode }) => (
  <nav className='orkland-sidebar flex h-full w-60 flex-col' aria-label='Hovedmeny'>
    <div className='sticky top-0 flex h-[calc(100dvh-4.5rem)] flex-col'>
      <div className='min-h-0 flex-1 overflow-y-auto px-3 pt-6'>
        <NavItem
          to='/process'
          text='Behandlinger'
          tooltip='En aktivitet du gjør på personopplysninger for å oppnå et formål. For eksempel saksbehandling av kommunale tjenester.'
        />
        <NavItem to='/dpprocess' text='Orkland kommune som databehandler' />
        <NavItem
          to='/informationtype'
          text='Opplysningstyper'
          tooltip='Personopplysninger som for eksempel navn, kontaktinformasjon og sivilstand.'
        />
        <NavItem
          to='/document'
          text='Dokumenter'
          tooltip='En samling av opplysningstyper. Søknader og vedtak er eksempler på dokumenter som inneholder flere opplysningstyper.'
        />
        <NavItem
          to='/disclosure'
          text='Utleveringer'
          tooltip='Utleveringer av personopplysninger fra Orkland kommune til eksterne virksomheter eller etater.'
        />
        <NavItem
          to='/thirdparty'
          text='Eksterne parter'
          tooltip='Parter utenfor Orkland kommune som vi samhandler med, for eksempel innbyggere, leverandører og offentlige etater.'
        />
        <NavItem
          to='/system'
          text='Systemer'
          tooltip='Applikasjoner og fagsystemer som brukes i kommunens tjenester.'
        />
        <NavItem to='/processor' text='Databehandlere' />
        <NavItem
          to='/dashboard'
          text='Dashboard'
          tooltip='Oversikt og statistikk over behandlinger i behandlingskatalogen.'
        />
        <NavItem to='/veileder' text='Veileder' />
      </div>
      <div className='mt-auto px-5 pb-8 pt-6'>
        <a
          href='https://www.orkland.kommune.no/'
          target='_blank'
          rel='noopener noreferrer'
          className='orkland-sidebar-logo'
          aria-label='Orkland kommune – åpnes i ny fane'
        >
          <Image
            src={
              themeMode === 'dark' ? '/orkland-kommune-logo.svg' : '/orkland-kommune-logo-light.svg'
            }
            alt='Orkland kommune'
            width={1684}
            height={720}
            loading='eager'
            style={{ width: '100%', height: 'auto' }}
          />
        </a>
      </div>
    </div>
  </nav>
)

export default SideBar
