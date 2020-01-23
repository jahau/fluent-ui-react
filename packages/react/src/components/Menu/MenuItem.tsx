import { Accessibility, menuItemBehavior, submenuBehavior } from '@fluentui/accessibility'
import {
  focusAsync,
  getElementType,
  getUnhandledProps,
  useAccessibility,
} from '@fluentui/react-bindings'
import { EventListener } from '@fluentui/react-component-event-listener'
import { Ref, toRefObject } from '@fluentui/react-component-ref'
import * as customPropTypes from '@fluentui/react-proptypes'
import * as _ from 'lodash'
import cx from 'classnames'
import * as PropTypes from 'prop-types'
import * as React from 'react'
// @ts-ignore
import { ThemeContext } from 'react-fela'

import {
  childrenExist,
  createShorthandFactory,
  doesNodeContainClick,
  UIComponentProps,
  ChildrenComponentProps,
  ContentComponentProps,
  commonPropTypes,
  isFromKeyboard,
  ShorthandFactory,
} from '../../utils'
import Icon, { IconProps } from '../Icon/Icon'
import Menu, { MenuProps, MenuShorthandKinds } from './Menu'
import Box, { BoxProps } from '../Box/Box'
import {
  ComponentEventHandler,
  WithAsProp,
  ShorthandValue,
  ShorthandCollection,
  withSafeTypeForAs,
  ProviderContextPrepared,
} from '../../types'
import { Popper } from '../../utils/positioner'
import { useStyles } from '@fluentui/react-bindings/src'

export interface MenuItemSlotClassNames {
  wrapper: string
  submenu: string
}

export interface MenuItemProps
  extends UIComponentProps,
    ChildrenComponentProps,
    ContentComponentProps {
  /**
   * Accessibility behavior if overridden by the user.
   * @available menuItemAsToolbarButtonBehavior, tabBehavior
   */
  accessibility?: Accessibility

  /** A menu item can be active. */
  active?: boolean

  /** A menu item can show it is currently unable to be interacted with. */
  disabled?: boolean

  /** Name or shorthand for Menu Item Icon */
  icon?: ShorthandValue<IconProps>

  /** A menu may have just icons. */
  iconOnly?: boolean

  /** MenuItem index inside Menu. */
  index?: number

  /** MenuItem position inside Menu (skipping separators). */
  itemPosition?: number

  /** MenuItem count inside Menu. */
  itemsCount?: number

  /**
   * Called on click.
   *
   * @param event - React's original SyntheticEvent.
   * @param data - All props.
   */
  onClick?: ComponentEventHandler<MenuItemProps>

  /**
   * Called after user's focus.
   * @param event - React's original SyntheticEvent.
   * @param data - All props.
   */
  onFocus?: ComponentEventHandler<MenuItemProps>

  /**
   * Called after item blur.
   * @param event - React's original SyntheticEvent.
   * @param data - All props.
   */
  onBlur?: ComponentEventHandler<MenuItemProps>

  /** A menu can adjust its appearance to de-emphasize its contents. */
  pills?: boolean

  /**
   * A menu can point to show its relationship to nearby content.
   * For vertical menu, it can point to the start of the item or to the end.
   */
  pointing?: boolean | 'start' | 'end'

  /** The menu item can have primary type. */
  primary?: boolean

  /** The menu item can have secondary type. */
  secondary?: boolean

  /** Menu items can by highlighted using underline. */
  underlined?: boolean

  /** A vertical menu displays elements vertically. */
  vertical?: boolean

  /** Shorthand for the wrapper component. */
  wrapper?: ShorthandValue<BoxProps>

  /** Shorthand for the submenu. */
  menu?: ShorthandValue<MenuProps> | ShorthandCollection<MenuItemProps, MenuShorthandKinds>

  /** Indicates if the menu inside the item is open. */
  menuOpen?: boolean

  /** Default menu open */
  defaultMenuOpen?: boolean

  /** Callback for setting the current menu item as active element in the menu. */
  onActiveChanged?: ComponentEventHandler<MenuItemProps>

  /** Indicates whether the menu item is part of submenu. */
  inSubmenu?: boolean

  /** Shorthand for the submenu indicator. */
  indicator?: ShorthandValue<IconProps>

  /**
   * Event for request to change 'open' value.
   * @param event - React's original SyntheticEvent.
   * @param data - All props and proposed value.
   */
  onMenuOpenChange?: ComponentEventHandler<MenuItemProps>
}

export interface MenuItemState {
  isFromKeyboard: boolean
  menuOpen: boolean
}

const MenuItem: React.FC<WithAsProp<MenuItemProps>> & {
  className: string
  create: ShorthandFactory<MenuItemProps>
  handledProps: string[]
  slotClassNames: MenuItemSlotClassNames
} = props => {
  const {
    accessibility,
    children,
    content,
    icon,
    wrapper,
    menu,
    primary,
    secondary,
    inSubmenu,
    active,
    vertical,
    indicator,
    disabled,
  } = props

  const menuRef = React.createRef<HTMLElement>()
  const itemRef = React.createRef<HTMLElement>()

  const context: ProviderContextPrepared = React.useContext(ThemeContext)

  const { menuOpen } = this.state

  const defaultIndicator = { name: vertical ? 'icon-arrow-end' : 'icon-arrow-down' }
  const indicatorWithDefaults = indicator === undefined ? defaultIndicator : indicator
  const targetRef = toRefObject(context.target)

  const getA11Props = useAccessibility(accessibility, {
    actionHandlers: {
      performClick: event => !event.defaultPrevented && handleClick(event),
      openMenu: event => openMenu(event),
      closeAllMenusAndFocusNextParentItem: event => closeAllMenus(event),
      closeMenu: event => closeMenu(event),
      closeMenuAndFocusTrigger: event => closeMenu(event, true),
      doNotNavigateNextParentItem: event => {
        event.stopPropagation()
      },
      closeAllMenus: event => closeAllMenus(event),
    },
    rtl: context.rtl,
  })
  const { classes, styles: resolvedStyles } = useStyles(MenuItem.displayName, {
    className: MenuItem.className,
    mapPropsToStyles: () => ({}),
    mapPropsToInlineStyles: () => ({}),
    rtl: context.rtl,
  })

  const handleWrapperBlur = (e: React.FocusEvent) => {
    if (!inSubmenu && !e.currentTarget.contains(e.relatedTarget)) {
      trySetMenuOpen(false, e)
    }
  }

  const outsideClickHandler = (e: MouseEvent) => {
    if (!isSubmenuOpen()) return
    if (
      !doesNodeContainClick(itemRef.current, e, context.target) &&
      !doesNodeContainClick(menuRef.current, e, context.target)
    ) {
      trySetMenuOpen(false, e)
    }
  }

  const performClick = e => {
    if (menu) {
      if (doesNodeContainClick(menuRef.current, e, context.target)) {
        // submenu was clicked => close it and propagate
        trySetMenuOpen(false, e, () => focusAsync(itemRef.current))
      } else {
        // the menuItem element was clicked => toggle the open/close and stop propagation
        trySetMenuOpen(active ? !state.menuOpen : true, e)
        e.stopPropagation()
        e.preventDefault()
      }
    }
  }

  const handleClick = (e: Event | React.SyntheticEvent) => {
    if (disabled) {
      e.preventDefault()
      return
    }

    performClick(e)
    _.invoke(props, 'onClick', e, props)
  }

  const handleBlur = (e: React.SyntheticEvent) => {
    setState({ isFromKeyboard: false })

    _.invoke(props, 'onBlur', e, props)
  }

  const handleFocus = (e: React.SyntheticEvent) => {
    setState({ isFromKeyboard: isFromKeyboard() })

    _.invoke(props, 'onFocus', e, props)
  }

  const isSubmenuOpen = (): boolean => {
    return !!(menu && state.menuOpen)
  }

  const closeAllMenus = (e: React.KeyboardEvent) => {
    if (!isSubmenuOpen()) {
      return
    }

    trySetMenuOpen(false, e, () => {
      if (!inSubmenu) {
        focusAsync(itemRef.current)
      }
    })

    // avoid spacebar scrolling the page
    if (!inSubmenu) {
      e.preventDefault()
    }
  }

  const closeMenu = (e: React.KeyboardEvent, forceTriggerFocus?: boolean) => {
    if (!isSubmenuOpen()) {
      return
    }

    const shouldStopPropagation = inSubmenu || vertical
    trySetMenuOpen(false, e, () => {
      if (forceTriggerFocus || shouldStopPropagation) {
        focusAsync(itemRef.current)
      }
    })

    if (forceTriggerFocus || shouldStopPropagation) {
      e.stopPropagation()
    }
  }

  const openMenu = (e: React.KeyboardEvent) => {
    if (menu && !state.menuOpen) {
      trySetMenuOpen(true, e)
      _.invoke(props, 'onActiveChanged', e, { ...props, active: true })
      e.stopPropagation()
      e.preventDefault()
    }
  }

  const trySetMenuOpen = (
    newValue: boolean,
    e: MouseEvent | React.KeyboardEvent | React.FocusEvent,
    onStateChanged?: any,
  ) => {
    this.setState({ menuOpen: newValue })
    // The reason why post-effect is not passed as callback to trySetState method
    // is that in 'controlled' mode the post-effect is applied before final re-rendering
    // which cause a broken behavior: for e.g. when it is needed to focus submenu trigger on ESC.
    // TODO: all DOM post-effects should be applied at componentDidMount & componentDidUpdated stages.
    onStateChanged && onStateChanged()
    _.invoke(props, 'onMenuOpenChange', e, {
      ...props,
      menuOpen: newValue,
    })
  }

  const ElementType = getElementType(props)
  const unhandledProps = getUnhandledProps(MenuItem.handledProps as any, props)

  const menuItemInner = childrenExist(children) ? (
    children
  ) : (
    <Ref innerRef={itemRef}>
      <ElementType
        {...getA11Props('root', {
          className: classes.root,
          disabled,
          onBlur: handleBlur,
          onFocus: handleFocus,
          ...unhandledProps,
          ...(!wrapper && { onClick: handleClick }),
        })}
      >
        {Icon.create(icon, {
          defaultProps: () => ({
            xSpacing: !!content ? 'after' : 'none',
            styles: resolvedStyles.icon,
          }),
        })}
        {Box.create(content, {
          defaultProps: () => ({ as: 'span', styles: resolvedStyles.content }),
        })}
        {menu &&
          Icon.create(indicatorWithDefaults, {
            defaultProps: () => ({
              name: vertical ? 'icon-menu-arrow-end' : 'icon-menu-arrow-down',
              styles: resolvedStyles.indicator,
            }),
          })}
      </ElementType>
    </Ref>
  )

  const maybeSubmenu =
    menu && active && menuOpen ? (
      <>
        <Ref innerRef={menuRef}>
          <Popper
            align={vertical ? 'top' : context.rtl ? 'end' : 'start'}
            position={vertical ? (context.rtl ? 'before' : 'after') : 'below'}
            targetRef={itemRef}
          >
            {Menu.create(menu, {
              defaultProps: () => ({
                accessibility: submenuBehavior,
                className: MenuItem.slotClassNames.submenu,
                vertical: true,
                primary,
                secondary,
                styles: resolvedStyles.menu,
                submenu: true,
                indicator,
              }),
            })}
          </Popper>
        </Ref>
        <EventListener listener={outsideClickHandler} targetRef={targetRef} type="click" />
      </>
    ) : null

  if (wrapper) {
    return Box.create(wrapper, {
      defaultProps: () =>
        getA11Props('wrapper', {
          className: cx(MenuItem.slotClassNames.wrapper, classes.wrapper),
        }),
      overrideProps: () => ({
        children: (
          <>
            {menuItemInner}
            {maybeSubmenu}
          </>
        ),
        onClick: handleClick,
        onBlur: handleWrapperBlur,
      }),
    })
  }
  return menuItemInner
}

MenuItem.className = 'ui-menu__item'
MenuItem.displayName = 'MenuItem'

MenuItem.slotClassNames = {
  submenu: `${MenuItem.className}__submenu`,
  wrapper: `${MenuItem.className}__wrapper`,
}

MenuItem.defaultProps = {
  as: 'a',
  accessibility: menuItemBehavior as Accessibility,
  wrapper: { as: 'li' },
}
MenuItem.propTypes = {
  ...commonPropTypes.createCommon(),
  active: PropTypes.bool,
  disabled: PropTypes.bool,
  icon: customPropTypes.itemShorthandWithoutJSX,
  iconOnly: PropTypes.bool,
  index: PropTypes.number,
  itemPosition: PropTypes.number,
  itemsCount: PropTypes.number,
  onClick: PropTypes.func,
  onFocus: PropTypes.func,
  onBlur: PropTypes.func,
  pills: PropTypes.bool,
  pointing: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.oneOf<'start' | 'end'>(['start', 'end']),
  ]),
  primary: customPropTypes.every([customPropTypes.disallow(['secondary']), PropTypes.bool]),
  secondary: customPropTypes.every([customPropTypes.disallow(['primary']), PropTypes.bool]),
  underlined: PropTypes.bool,
  vertical: PropTypes.bool,
  wrapper: PropTypes.oneOfType([PropTypes.node, PropTypes.object]),
  menu: PropTypes.oneOfType([customPropTypes.itemShorthand, customPropTypes.collectionShorthand]),
  menuOpen: PropTypes.bool,
  defaultMenuOpen: PropTypes.bool,
  onActiveChanged: PropTypes.func,
  inSubmenu: PropTypes.bool,
  indicator: customPropTypes.itemShorthandWithoutJSX,
  onMenuOpenChange: PropTypes.func,
}
MenuItem.handledProps = Object.keys(MenuItem.propTypes)

MenuItem.create = createShorthandFactory({ Component: MenuItem, mappedProp: 'content' })

/**
 * A MenuItem is an actionable item within a Menu.
 */
export default withSafeTypeForAs<typeof MenuItem, MenuItemProps, 'a'>(MenuItem)
