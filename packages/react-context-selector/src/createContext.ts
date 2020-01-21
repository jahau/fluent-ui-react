import * as React from 'react'
import { ContextListener, ContextValue, Context } from './types'

export const SUBSCRIBE_CONTEXT_PROPERTY = 's'
export const VALUE_CONTEXT_PROPERTY = 'v'

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
    [SUBSCRIBE_CONTEXT_PROPERTY]: subscribe,
    [VALUE_CONTEXT_PROPERTY]: props.value,
  }

  return React.createElement(Original, { value }, props.children)
}

export const createContext = <Value>(defaultValue: Value): Context<Value> => {
  const context = React.createContext<ContextValue<Value>>(
    {
      get [SUBSCRIBE_CONTEXT_PROPERTY](): any {
        throw new Error(
          process.env.NODE_ENV === 'production'
            ? ''
            : `Please use <Provider> from "@fluentui/react-bindings"`,
        )
      },
      [VALUE_CONTEXT_PROPERTY]: defaultValue,
    },
    calculateChangedBits,
  )
  context.Provider = createProvider<Value>(context.Provider) as any

  // We don't support Consumer API
  delete context.Consumer

  return context as any
}
