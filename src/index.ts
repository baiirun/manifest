import { useCallback, useEffect, useRef, useState } from 'react'
import { BehaviorSubject as Observable } from 'rxjs'

export { Observable }

export const useObservable = <T>(initialState: T): [T, (value: T) => void, Observable<T>] => {
    // State is stored in the observable. We need to tell React to
    // re-render when it changes so the UI actually updates.
    const rerender = useState({})[1]
    const observable = useRef(new Observable(initialState))

    const next = useCallback(
        (payload: T) => {
            const state = observable.current.getValue()
            if (state !== payload) {
                observable.current.next(payload)
                rerender({})
            }
        },
        [initialState]
    )

    return [observable.current.getValue(), next, observable.current]
}

export const useSharedObservable = <T>(
    initialState: Observable<T>
): [T, (value: Partial<T>) => void, Observable<T>] => {
    // State is stored in the observable passed from the parent. We need to tell React to
    // re-render when it changes so the UI actually updates.
    const tracking = useRef<Record<string, unknown>>({})
    const rerender = useState({})[1]

    const next = useCallback(
        (payload: Partial<T>) => {
            const state = initialState.getValue()

            // We don't need to spread the new state object for observable values
            // that are not objects. We also don't rerender unless the single
            // state value has changed.
            if (typeof payload !== 'object') {
                if (state === payload) return
                initialState.next(payload)
                return
            }

            // We spread the current state for new state objects to allow callers
            // to make partial updates
            initialState.next({ ...state, ...payload })
        },
        [initialState]
    )

    useEffect(() => {
        // When another components calls `next` on the observable, we execute
        // a callback to re-render this component if the state the component
        // is tracking has changed.
        //
        // We set up the state tracking in the Proxy in `get()`
        const sub = initialState.subscribe({
            next: (payload: T) => {
                // If the observable value is not an object and the value has changed
                // we can just rerender
                if (typeof payload !== 'object') {
                    rerender({})
                    return
                }

                // We only rerender state values that the component is tracking
                // and only if the state has changed.
                let shouldRerender = false
                for (const _ in tracking.current) {
                    const key = _ as keyof T

                    if (tracking.current[_] !== payload[key]) {
                        // Update the state value we just received seen so we know
                        // if we need to rerender for the next state change.
                        tracking.current[_] = payload[key]
                        shouldRerender = true
                    }
                }

                if (shouldRerender) rerender({})
            },
        })

        return () => sub.unsubscribe()
    }, [initialState])

    const get = useCallback(() => {
        const observableState = initialState.getValue()

        if (typeof observableState !== 'object') return observableState

        // If the component passes object state we want to track the individual
        // keys in the object so the consumer only rerenders when the state they
        // are tracking changes.
        return new Proxy(observableState as Record<string, unknown>, {
            get(_, key: string) {
                const trackedKey = key as keyof T
                tracking.current[key] = observableState[trackedKey]
                return Reflect.get(_, key)
            },
        }) as T
    }, [initialState])

    return [get(), next, initialState]
}

// TODO: Clean up itself
// TODO: Closure scope within the callback does not update with values outside
//       of the closure since we are not passing dependencies. This function
//       really only works with observables.
export const createEffect = (cb: () => void) => {
    useEffect(cb, [])
}
