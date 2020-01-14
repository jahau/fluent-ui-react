import {
  Accessibility,
  AccessibilityAttributes,
  imageBehavior,
  ImageBehaviorProps,
} from '@fluentui/accessibility'
import {
  getElementType,
  getUnhandledProps,
  useAccessibility,
  useStyles,
} from '@fluentui/react-bindings'
import * as PropTypes from 'prop-types'
import * as React from 'react'

import { createShorthandFactory, UIComponentProps, commonPropTypes } from '../../utils'
import { FluentComponentStaticProps, WithAsProp, withSafeTypeForAs } from '../../types'

export interface ImageProps extends UIComponentProps, ImageBehaviorProps {
  /** Alternative text. */
  alt?: string

  'aria-label'?: AccessibilityAttributes['aria-label']

  /** Accessibility behavior if overridden by the user. */
  accessibility?: Accessibility<ImageBehaviorProps>

  /** An image may be formatted to appear inline with text as an avatar. */
  avatar?: boolean

  /** An image can appear circular. */
  circular?: boolean

  /** An image can take up the width of its container. */
  fluid?: boolean

  /** Image source URL. */
  src?: string
}

const Image: React.FC<WithAsProp<ImageProps>> & FluentComponentStaticProps<ImageProps> = props => {
  const {
    accessibility,
    alt,
    animation,
    'aria-label': ariaLabel,
    avatar,
    circular,
    className,
    design,
    fluid,
    styles,
    variables,
  } = props

  const getA11Props = useAccessibility(accessibility, {
    debugName: Image.displayName,
    mapPropsToBehavior: () => ({
      alt,
      'aria-label': ariaLabel,
    }),
  })
  const [classes] = useStyles(Image.displayName, {
    className: Image.className,
    mapPropsToStyles: () => ({
      avatar,
      circular,
      fluid,
    }),
    mapPropsToInlineStyles: () => ({
      unstable_animation: animation,
      className,
      design,
      styles,
      variables,
    }),
  })

  const ElementType = getElementType(props)
  const unhandledProps = getUnhandledProps(Image.handledProps, props)

  return <ElementType {...getA11Props('root', { className: classes.root, ...unhandledProps })} />
}

Image.className = 'ui-image'
Image.displayName = 'Image'
Image.defaultProps = {
  as: 'img',
  accessibility: imageBehavior,
}

Image.propTypes = {
  ...commonPropTypes.createCommon({
    children: false,
    content: false,
  }),
  accessibility: PropTypes.func,
  avatar: PropTypes.bool,
  circular: PropTypes.bool,
  fluid: PropTypes.bool,
}

Image.handledProps = Object.keys(Image.propTypes) as any

Image.create = createShorthandFactory({ Component: Image, mappedProp: 'src', allowsJSX: false })

/**
 * An Image is a graphic representation of something.
 *
 * @accessibility
 * If image should be visible to screen readers, textual representation needs to be provided in 'alt' property.
 *
 * Other considerations:
 *  - when alt property is empty, then Narrator in scan mode navigates to image and narrates it as empty paragraph.
 *  - when image has role='presentation' then screen readers navigate to the element in scan/virtual mode. To avoid this, the attribute "aria-hidden='true'" is applied by the default image behavior.
 *  - when alt property is used in combination with aria-label, arialabbeledby or title, additional screen readers verification is needed as each screen reader handles this combination differently.
 */
export default withSafeTypeForAs<typeof Image, ImageProps, 'img'>(Image)
