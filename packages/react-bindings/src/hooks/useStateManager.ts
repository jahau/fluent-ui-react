import { AnyAction, EnhancedActions, Manager, ManagerFactory, SideEffect } from '@fluentui/state'
import * as React from 'react'

type UseStateManagerOptions<State> = {
  mapPropsToInitialState?: () => Partial<State>
  mapPropsToState?: () => Partial<State>
  sideEffects?: SideEffect<State>[]
}

type UseStateManagerResult<State, Actions> = {
  state: Readonly<State>
  actions: Readonly<Actions>
}

const getDefinedProps = <Props extends Record<string, any>>(props: Props): Partial<Props> => {
  const definedProps: Partial<Props> = {}

  Object.keys(props).forEach(propName => {
    if (props[propName] !== undefined) {
      ;(<Record<string, any>>definedProps)[propName] = props[propName]
    }
  })

  return definedProps
}

const useStateManager = <
  State extends Record<string, any>,
  Actions extends Record<string, AnyAction>
>(
  managerFactory: ManagerFactory<State, Actions>,
  options: UseStateManagerOptions<State> = {},
): UseStateManagerResult<State, Actions> => {
  const {
    mapPropsToInitialState = () => ({} as Partial<State>),
    mapPropsToState = () => ({} as Partial<State>),
    sideEffects = [],
  } = options
  const latestManager = React.useRef<Manager<State, Actions> | null>(null)

  // Heads up! forceUpdate() is used only for triggering rerenders stateManager is SSOT()
  const [, forceUpdate] = React.useReducer((c: number) => c + 1, 0) as [never, () => void]
  const syncState = React.useCallback(() => forceUpdate(), [])

  // If manager exists, the current state will be used
  const initialState = latestManager.current
    ? latestManager.current.state
    : getDefinedProps(mapPropsToInitialState())

  latestManager.current = managerFactory({
    // Factory has already configured actions
    actions: {} as EnhancedActions<State, Actions>,
    state: { ...initialState, ...getDefinedProps(mapPropsToState()) },
    sideEffects: [...sideEffects, syncState],
  })

  // We need to pass exactly `manager.state` to provide the same state object during the same render
  // frame.
  // It keeps behavior consistency between React state tools and our managers
  // https://github.com/facebook/react/issues/11527#issuecomment-360199710

  if (process.env.NODE_ENV === 'production') {
    return { state: latestManager.current.state, actions: latestManager.current.actions }
  }

  // Object.freeze() is used only in dev-mode to avoid usage mistakes
  return {
    state: Object.freeze(latestManager.current.state),
    actions: Object.freeze(latestManager.current.actions),
  }
}

export default useStateManager
