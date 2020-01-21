import * as React from 'react'

import { ContextListener, ContextValue, Context } from './types'
import { CONTEXT_SUBSCRIBE_PROPERTY, CONTEXT_VALUE_PROPERTY } from './utils'

// Disables updates propogation for React Content. React has a special handling for "0" value.
//
// @see https://github.com/facebook/react/blob/b53ea6ca05d2ccb9950b40b33f74dfee0421d872/packages/react-reconciler/src/ReactFiberBeginWork.js#L2576
const calculateChangedBits = () => 0

const createProvider = <Value>(
  Original: React.Provider<ContextValue<Value>>,
): React.FC<React.ProviderProps<Value>> => props => {
  const listeners = React.useRef<ContextListener<Value>[]>([])

  // We call listeners in render intentionally. Listeners are not technically pure, but
  // otherwise we can't get benefits from concurrent mode.
  //
  // We make sure to work with double or more invocation of listeners.
  listeners.current.forEach(listener => listener(props.value))

  const subscribe = React.useCallback((listener: ContextListener<Value>) => {
    listeners.current.push(listener)

    const unsubscribe = () => {
      const index = listeners.current.indexOf(listener)
      listeners.current.splice(index, 1)
    }

    return unsubscribe
  }, [])

  const value: ContextValue<Value> = {
    [CONTEXT_SUBSCRIBE_PROPERTY]: subscribe,
    [CONTEXT_VALUE_PROPERTY]: props.value,
  }

  return React.createElement(Original, { value }, props.children)
}

export const createContext = <Value>(defaultValue: Value): Context<Value> => {
  const context = React.createContext<ContextValue<Value>>(
    {
      get [CONTEXT_SUBSCRIBE_PROPERTY](): any {
        throw new Error(
          process.env.NODE_ENV === 'production'
            ? ''
            : `Please use <Provider /> component from "@fluentui/react-context-selector"`,
        )
      },
      [CONTEXT_VALUE_PROPERTY]: defaultValue,
    },
    calculateChangedBits,
  )
  context.Provider = createProvider<Value>(context.Provider) as any

  // We don't support Consumer API
  delete context.Consumer

  return context as any
}
