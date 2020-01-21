import * as React from 'react'

import { SUBSCRIBE_CONTEXT_PROPERTY, VALUE_CONTEXT_PROPERTY } from './createContext'
import { Context, ContextSelector, ContextValue } from './types'

const SELECTOR_PROPERTY = 'r'
const SELECTED_PROPERTY = 'l'
const VALUE_PROPERTY = 's'

// useLayoutEffect that does not show warning when server-side rendering, see Alex Reardon's article for more info
// @see https://medium.com/@alexandereardon/uselayouteffect-and-ssr-192986cdcf7a
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect

type UseSelectorRef<Value, SelectedValue> = {
  [SELECTOR_PROPERTY]: ContextSelector<Value, SelectedValue>
  [VALUE_PROPERTY]: Value
  [SELECTED_PROPERTY]: SelectedValue
}

/**
 * This hook returns context selected value by selector.
 * It will only accept context created by `createContext`.
 * It will trigger re-render if only the selected value is referencially changed.
 *
 * @example
 * const firstName = useContextSelector(PersonContext, state => state.firstName);
 */
export const useContextSelector = <Value, SelectedValue>(
  context: Context<Value>,
  selector: ContextSelector<Value, SelectedValue>,
): SelectedValue => {
  const {
    [SUBSCRIBE_CONTEXT_PROPERTY]: subscribe,
    [VALUE_CONTEXT_PROPERTY]: value,
  } = React.useContext((context as unknown) as Context<ContextValue<Value>>)
  const [, forceUpdate] = React.useReducer((c: number) => c + 1, 0) as [never, () => void]

  const ref = React.useRef<UseSelectorRef<Value, SelectedValue>>()
  const selected = selector(value)

  useIsomorphicLayoutEffect(() => {
    ref.current = {
      [SELECTOR_PROPERTY]: selector,
      [VALUE_PROPERTY]: value,
      [SELECTED_PROPERTY]: selected,
    }
  })
  useIsomorphicLayoutEffect(() => {
    const callback = (nextState: Value) => {
      try {
        const reference: UseSelectorRef<Value, SelectedValue> = ref.current as NonNullable<
          UseSelectorRef<Value, SelectedValue>
        >

        if (
          reference[VALUE_PROPERTY] === nextState ||
          Object.is(reference[SELECTED_PROPERTY], reference[SELECTOR_PROPERTY](nextState))
        ) {
          // not changed
          return
        }
      } catch (e) {
        // ignored (stale props or some other reason)
      }

      forceUpdate()
    }

    return subscribe(callback)
  }, [subscribe])

  return selected
}
