import { BodyShort, Tooltip } from '@navikt/ds-react'
import { useLocation } from '@/util/router'
import RouteLink from '../common/RouteLink'

interface INavItemProps {
  text: string
  to: string
  tooltip?: string
  noWrap?: boolean
}

const checkCurrentLocationIsTheSameAsSideBarItem = (
  currentLocationUrl: string,
  sidebarItemUrl: string
): boolean => {
  if (sidebarItemUrl.slice(0, 2) === '//') {
    return false
  }
  return currentLocationUrl.split('/')[1] === sidebarItemUrl.split('/')[1]
}

const NavItem = (props: INavItemProps) => {
  const isActive = checkCurrentLocationIsTheSameAsSideBarItem(useLocation().pathname, props.to)
  const textColor = 'inherit'

  return (
    <RouteLink
      href={props.to}
      style={{ textDecoration: 'none' }}
      className='orkland-nav-item block w-full'
      aria-current={isActive ? 'page' : undefined}
    >
      <div className='flex min-h-10 items-center py-2'>
        {props.tooltip ? (
          <Tooltip content={props.tooltip} maxChar={200}>
            <BodyShort
              size='small'
              style={{
                color: textColor,
                fontWeight: isActive ? 600 : undefined,
                whiteSpace: props.noWrap ? 'nowrap' : undefined,
              }}
            >
              {props.text}
            </BodyShort>
          </Tooltip>
        ) : (
          <BodyShort
            size='small'
            style={{
              color: textColor,
              fontWeight: isActive ? 600 : undefined,
              whiteSpace: props.noWrap ? 'nowrap' : undefined,
            }}
          >
            {props.text}
          </BodyShort>
        )}
      </div>
    </RouteLink>
  )
}

export default NavItem
