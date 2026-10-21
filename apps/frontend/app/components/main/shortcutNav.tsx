import { BodyLong, BodyShort } from '@navikt/ds-react'
import { theme } from '@/util/theme'
import RouteLink from '../common/RouteLink'

type TShortcutCardProps = {
  title: string
  subtitle: string
  to: string
}

const ShortcutCard = (props: TShortcutCardProps) => {
  const { title, subtitle, to } = props

  return (
    <div className='w-full sm:w-auto'>
      <RouteLink
        href={to}
        hideUnderline={true}
        className='orkland-shortcut-link block w-full sm:w-auto'
      >
        <div
          className='orkland-shortcut-card w-full sm:w-[320px]'
          style={{
            height: '150px',
            margin: theme.sizing.scale200,
            boxSizing: 'border-box',
          }}
        >
          <div className='flex flex-col items-center justify-center h-full text-center'>
            <div>
              <BodyLong
                style={{
                  wordBreak: 'break-word',
                  color: 'var(--ax-text-default)',
                  textDecoration: 'underline',

                  fontWeight: 'bolder',
                  marginTop: theme.sizing.scale300,
                  marginBottom: theme.sizing.scale200,
                }}
              >
                {title}
              </BodyLong>
            </div>
            <div className='w-full'>
              <BodyShort style={{ color: 'var(--ax-text-neutral)' }}>{subtitle}</BodyShort>
            </div>
          </div>
        </div>
      </RouteLink>
    </div>
  )
}

export const ShortcutNav = () => (
  <div className='flex justify-between flex-wrap'>
    <ShortcutCard title='Behandlinger' subtitle='Se og endre behandlinger' to='/process' />
    <ShortcutCard
      title='Opplysningstyper'
      subtitle='Se og endre opplysningstyper'
      to='/informationtype'
    />
    <ShortcutCard title='Eksterne parter' subtitle='Se alle eksterne parter' to='/thirdparty' />
    <ShortcutCard title='Dashboard' subtitle='Se statistikk over behandlinger' to='/dashboard' />
  </div>
)
