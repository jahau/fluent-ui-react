import { Accessibility, menuBehavior } from '@fluentui/accessibility'
import {
  getElementType,
  getUnhandledProps,
  useAccessibility,
  useStateManager,
  useStyles,
} from '@fluentui/react-bindings'
import * as customPropTypes from '@fluentui/react-proptypes'
import { createMenuManager } from '@fluentui/state'
import {
  ComponentVariablesObject,
  ComponentSlotStylesPrepared,
  mergeComponentVariables,
} from '@fluentui/styles'
import * as _ from 'lodash'
import * as PropTypes from 'prop-types'
import * as React from 'react'
// @ts-ignore
import { ThemeContext } from 'react-fela'

import {
  childrenExist,
  createShorthandFactory,
  UIComponentProps,
  ChildrenComponentProps,
  commonPropTypes,
  getKindProp,
  rtlTextContainer,
  ShorthandFactory,
} from '../../utils'

import MenuItem, { MenuItemProps } from './MenuItem'
import {
  WithAsProp,
  ShorthandCollection,
  ShorthandValue,
  withSafeTypeForAs,
  ComponentEventHandler,
  ProviderContextPrepared,
} from '../../types'
import MenuDivider from './MenuDivider'
import { IconProps } from '../Icon/Icon'

export type MenuShorthandKinds = 'divider' | 'item'

export interface MenuSlotClassNames {
  divider: string
  item: string
}

export interface MenuProps extends UIComponentProps, ChildrenComponentProps {
  /**
   * Accessibility behavior if overridden by the user.
   * @available menuAsToolbarBehavior, tabListBehavior, tabBehavior
   */
  accessibility?: Accessibility

  /** Index of the currently active item. */
  activeIndex?: number | string

  /** Initial activeIndex value. */
  defaultActiveIndex?: number | string

  /** A vertical menu may take the size of its container. */
  fluid?: boolean

  /** A menu may have just icons. */
  iconOnly?: boolean

  /** Shorthand array of props for Menu. */
  items?: ShorthandCollection<MenuItemProps, MenuShorthandKinds>

  /**
   * Called when a panel title is clicked.
   *
   * @param event - React's original SyntheticEvent.
   * @param data - All item props.
   */
  onItemClick?: ComponentEventHandler<MenuItemProps>

  /** A menu can adjust its appearance to de-emphasize its contents. */
  pills?: boolean

  /**
   * A menu can point to show its relationship to nearby content.
   * For vertical menu, it can point to the start of the item or to the end.
   */
  pointing?: boolean | 'start' | 'end'

  /** The menu can have primary type. */
  primary?: boolean

  /** The menu can have secondary type. */
  secondary?: boolean

  /** Menu items can by highlighted using underline. */
  underlined?: boolean

  /** A vertical menu displays elements vertically. */
  vertical?: boolean

  /** Indicates whether the menu is submenu. */
  submenu?: boolean

  /** Shorthand for the submenu indicator. */
  indicator?: ShorthandValue<IconProps>
}

export interface MenuState {
  activeIndex?: number | string
}

const Menu: React.FC<WithAsProp<MenuProps>> & {
  className: string
  create: ShorthandFactory<MenuProps>
  slotClassNames: MenuSlotClassNames
  handledProps: string[]

  Divider: typeof MenuDivider
  Item: typeof MenuItem
} = props => {
  const {
    accessibility,
    defaultActiveIndex,
    activeIndex,
    children,
    className,
    iconOnly,
    items,
    pills,
    pointing,
    primary,
    secondary,
    underlined,
    vertical,
    submenu,
    indicator,
    design,
    styles,
    variables,
  } = props

  const context: ProviderContextPrepared = React.useContext(ThemeContext)

  const { actions, state } = useStateManager(createMenuManager, {
    mapPropsToInitialState: () => ({ activeIndex: defaultActiveIndex }),
    mapPropsToState: () => ({ activeIndex }),
  })
  const getA11Props = useAccessibility(accessibility, {
    debugName: Menu.displayName,
    mapPropsToBehavior: () => ({}),
    rtl: context.rtl,
  })
  const { classes, styles: resolvedStyles } = useStyles(Menu.displayName, {
    className: Menu.className,
    mapPropsToStyles: () => ({
      pills,
      pointing,
      primary,
      secondary,
      underlined,
      vertical,
    }),
    mapPropsToInlineStyles: () => ({ className, design, styles, variables }),
    rtl: context.rtl,
  })

  const ElementType = getElementType(props)
  const unhandledProps = getUnhandledProps(Menu.handledProps as any, props)

  const handleItemOverrides = variables => predefinedProps => ({
    onClick: (e, itemProps) => {
      actions.select(itemProps.index)

      _.invoke(props, 'onItemClick', e, itemProps)
      _.invoke(predefinedProps, 'onClick', e, itemProps)
    },
    onActiveChanged: (e, itemProps) => {
      actions.select(itemProps.index)

      _.invoke(predefinedProps, 'onActiveChanged', e, itemProps)
    },
    variables: mergeComponentVariables(variables, predefinedProps.variables),
  })

  const handleDividerOverrides = variables => predefinedProps => ({
    variables: mergeComponentVariables(variables, predefinedProps.variables),
  })

  const renderItems = (
    styles: ComponentSlotStylesPrepared,
    variables: ComponentVariablesObject,
    // accessibility: ReactAccessibilityBehavior,
  ) => {
    const itemsCount = _.filter(items, item => getKindProp(item, 'item') !== 'divider').length
    let itemPosition = 0

    const overrideItemProps = handleItemOverrides(variables)
    const overrideDividerProps = handleDividerOverrides(variables)

    return _.map(items, (item, index) => {
      const active = state.activeIndex === index
      const kind = getKindProp(item, 'item')

      if (kind === 'divider') {
        return MenuDivider.create(item, {
          defaultProps: () => ({
            className: Menu.slotClassNames.divider,
            primary,
            secondary,
            vertical,
            styles: styles.divider,
            inSubmenu: submenu,
            // TODO: fix me
            // accessibility: accessibility.childBehaviors
            //   ? accessibility.childBehaviors.divider
            //   : undefined,
          }),
          overrideProps: overrideDividerProps,
        })
      }

      itemPosition++

      return MenuItem.create(item, {
        defaultProps: () => ({
          className: Menu.slotClassNames.item,
          iconOnly,
          pills,
          pointing,
          primary,
          secondary,
          underlined,
          vertical,
          index,
          itemPosition,
          itemsCount,
          active,
          inSubmenu: submenu,
          indicator,
          // TODO: fix me
          // accessibility: accessibility.childBehaviors
          //   ? accessibility.childBehaviors.item
          //   : undefined,
        }),
        overrideProps: overrideItemProps,
      })
    })
  }

  return (
    <ElementType
      {...getA11Props('root', {
        className: classes.root,
        ...rtlTextContainer.getAttributes({ forElements: [children] }),
        ...unhandledProps,
      })}
    >
      {childrenExist(children) ? children : renderItems(resolvedStyles, variables)}
    </ElementType>
  )
}

Menu.className = 'ui-menu'
Menu.displayName = 'Menu'

Menu.slotClassNames = {
  divider: `${Menu.className}__divider`,
  item: `${Menu.className}__item`,
}

Menu.defaultProps = {
  as: 'ul',
  accessibility: menuBehavior as Accessibility,
}
Menu.propTypes = {
  ...commonPropTypes.createCommon({
    content: false,
  }),
  activeIndex: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  defaultActiveIndex: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  fluid: PropTypes.bool,
  iconOnly: PropTypes.bool,
  items: customPropTypes.collectionShorthandWithKindProp(['divider', 'item']),
  onItemClick: PropTypes.func,
  pills: PropTypes.bool,
  pointing: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.oneOf<'start' | 'end'>(['start', 'end']),
  ]),
  primary: customPropTypes.every([customPropTypes.disallow(['secondary']), PropTypes.bool]),
  secondary: customPropTypes.every([customPropTypes.disallow(['primary']), PropTypes.bool]),
  underlined: PropTypes.bool,
  vertical: PropTypes.bool,
  submenu: PropTypes.bool,
  indicator: customPropTypes.itemShorthandWithoutJSX,
}
Menu.handledProps = Object.keys(Menu.propTypes)

Menu.Item = MenuItem
Menu.Divider = MenuDivider

Menu.create = createShorthandFactory({ Component: Menu, mappedArrayProp: 'items' })

/**
 * A Menu is a component that offers a grouped list of choices to the user.
 *
 * @accessibility
 * Implements ARIA [Menu](https://www.w3.org/TR/wai-aria-practices-1.1/#menu), [Toolbar](https://www.w3.org/TR/wai-aria-practices-1.1/#toolbar) or [Tabs](https://www.w3.org/TR/wai-aria-practices-1.1/#tabpanel) design pattern, depending on the behavior used.
 * @accessibilityIssues
 * [JAWS - navigation instruction for menubar](https://github.com/FreedomScientific/VFO-standards-support/issues/203)
 * [JAWS - navigation instruction for menu with aria-orientation="horizontal"](https://github.com/FreedomScientific/VFO-standards-support/issues/204)
 * [JAWS [VC] doesn't narrate menu item, when it is open from menu button](https://github.com/FreedomScientific/VFO-standards-support/issues/324)
 * [JAWS [app mode] focus moves to second menu item, when it is open from menu button](https://github.com/FreedomScientific/VFO-standards-support/issues/325)
 * [Enter into a tablist JAWS narrates: To switch pages, press Control+PageDown](https://github.com/FreedomScientific/VFO-standards-support/issues/337)
 * 51114083 VoiceOver+Web narrate wrong position in menu / total count of menu items, when pseudo element ::after or ::before is used
 */
export default withSafeTypeForAs<typeof Menu, MenuProps, 'ul'>(Menu)
