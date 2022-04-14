import * as React from 'react'
import { BehaviorSubject } from 'rxjs'
import { describe, expect, test } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useObservable, useSharedObservable } from './index'

describe('Observable hooks with single value states', () => {
    test('useObservable with single value state', async () => {
        function Component() {
            const [state, setState] = useObservable(false)
            return <h1 onClick={() => setState(!state)}>{state ? 'true' : 'false'}</h1>
        }

        render(<Component />)
        await waitFor(() => screen.getByRole('heading'))
        expect(screen.getByText('false')).toBeInTheDocument()

        fireEvent.click(screen.getByRole('heading'))
        expect(screen.getByText('true')).toBeInTheDocument()
    })

    test('useSharedObservable with single value state', async () => {
        const observable$ = new BehaviorSubject('banana')
        function ComponentA() {
            const [state, setState] = useSharedObservable(observable$)
            return (
                <h1 data-testid="a" onClick={() => setState('sandwich')}>
                    {state}
                </h1>
            )
        }

        function ComponentB() {
            const [state, setState] = useSharedObservable(observable$)
            return (
                <h1 data-testid="b" onClick={() => setState('pudding')}>
                    {state}
                </h1>
            )
        }

        render(
            <div>
                <ComponentA />
                <ComponentB />
            </div>
        )

        await waitFor(() => screen.getByTestId('a'))
        await waitFor(() => screen.getByTestId('b'))
        expect(screen.getByTestId('a')).toHaveTextContent('banana')
        expect(screen.getByTestId('b')).toHaveTextContent('banana')

        fireEvent.click(screen.getByTestId('a'))
        expect(screen.getByTestId('a')).toHaveTextContent('sandwich')
        expect(screen.getByTestId('b')).toHaveTextContent('sandwich')

        fireEvent.click(screen.getByTestId('b'))
        expect(screen.getByTestId('a')).toHaveTextContent('pudding')
        expect(screen.getByTestId('b')).toHaveTextContent('pudding')
    })

    test('useSharedObservable with single value state should not rerender if the state values are the same', async () => {
        const observable$ = new BehaviorSubject('banana')
        function ComponentA({ onRender }: { onRender: () => void }) {
            const [state, setState] = useSharedObservable(observable$)
            onRender()
            return (
                <h1 data-testid="a" onClick={() => setState('banana')}>
                    {state}
                </h1>
            )
        }

        let renderCount = 0

        render(<ComponentA onRender={() => renderCount++} />)

        await waitFor(() => screen.getByTestId('a'))
        expect(screen.getByTestId('a')).toHaveTextContent('banana')
        expect(renderCount).toBe(2)

        fireEvent.click(screen.getByTestId('a'))
        expect(screen.getByTestId('a')).toHaveTextContent('banana')
        expect(renderCount).toBe(2)
    })
})

describe('useObservable with object state', () => {
    test('Should not rerender components that read different state', async () => {
        const observable$ = new BehaviorSubject({
            a: 1,
            b: 1,
        })

        let renderCountA = 0
        let renderCountB = 0

        function ComponentA({ onRender }: { onRender: () => void }) {
            const [{ a }, setState] = useSharedObservable(observable$)
            onRender()
            return (
                <h1 data-testid="a" onClick={() => setState({ a: 2 })}>
                    {a}
                </h1>
            )
        }

        function ComponentB({ onRender }: { onRender: () => void }) {
            const [{ b }, setState] = useSharedObservable(observable$)
            onRender()
            return (
                <h1 data-testid="b" onClick={() => setState({ b: 2 })}>
                    {b}
                </h1>
            )
        }

        render(
            <div>
                <ComponentA onRender={() => renderCountA++} />
                <ComponentB onRender={() => renderCountB++} />
            </div>
        )

        await waitFor(() => screen.getByTestId('a'))
        await waitFor(() => screen.getByTestId('b'))
        expect(screen.getByTestId('a')).toHaveTextContent('1')
        expect(screen.getByTestId('b')).toHaveTextContent('1')

        fireEvent.click(screen.getByTestId('a'))
        expect(screen.getByTestId('a')).toHaveTextContent('2')
        expect(renderCountA).toBe(2)
        expect(screen.getByTestId('b')).toHaveTextContent('1')
        expect(renderCountB).toBe(1)

        fireEvent.click(screen.getByTestId('b'))
        expect(screen.getByTestId('a')).toHaveTextContent('2')
        expect(renderCountA).toBe(2)
        expect(screen.getByTestId('b')).toHaveTextContent('2')
        expect(renderCountB).toBe(2)
    })

    test('Should rerender multiple components that read the same state', async () => {
        const observable$ = new BehaviorSubject({
            a: 1,
            b: 1,
        })

        let renderCountA = 0
        let renderCountB = 0

        function ComponentA({ onRender }: { onRender: () => void }) {
            const [{ a, b }, setState] = useSharedObservable(observable$)
            onRender()
            return (
                <h1 data-testid="a" onClick={() => setState({ a: 2 })}>
                    {a}
                </h1>
            )
        }

        function ComponentB({ onRender }: { onRender: () => void }) {
            const [{ b }, setState] = useSharedObservable(observable$)
            onRender()
            return (
                <h1 data-testid="b" onClick={() => setState({ a: 3, b: 2 })}>
                    {b}
                </h1>
            )
        }

        render(
            <div>
                <ComponentA onRender={() => renderCountA++} />
                <ComponentB onRender={() => renderCountB++} />
            </div>
        )

        await waitFor(() => screen.getByTestId('a'))
        await waitFor(() => screen.getByTestId('b'))

        // Base case
        expect(screen.getByTestId('a')).toHaveTextContent('1')
        expect(screen.getByTestId('b')).toHaveTextContent('1')

        // Only ComponentA should rerender when changing "a"
        fireEvent.click(screen.getByTestId('a'))
        expect(screen.getByTestId('a')).toHaveTextContent('2')
        expect(renderCountA).toBe(2)
        expect(screen.getByTestId('b')).toHaveTextContent('1')
        expect(renderCountB).toBe(1)

        // ComponentA and ComponentB should rerender when changing "a" + "b"
        fireEvent.click(screen.getByTestId('b'))
        expect(screen.getByTestId('a')).toHaveTextContent('3')
        expect(renderCountA).toBe(3)
        expect(screen.getByTestId('b')).toHaveTextContent('2')
        expect(renderCountB).toBe(2)
    })

    test('Should not rerender components when prevState === newState', async () => {
        const observable$ = new BehaviorSubject({
            a: 1,
            b: 1,
        })

        let renderCountA = 0
        let renderCountB = 0

        function ComponentA({ onRender }: { onRender: () => void }) {
            const [{ a, b }, setState] = useSharedObservable(observable$)
            onRender()
            return (
                <h1 data-testid="a" onClick={() => setState({ a: 1 })}>
                    {a}
                </h1>
            )
        }

        function ComponentB({ onRender }: { onRender: () => void }) {
            const [{ b }, setState] = useSharedObservable(observable$)
            onRender()
            return (
                <h1 data-testid="b" onClick={() => setState({ a: 2, b: 1 })}>
                    {b}
                </h1>
            )
        }

        render(
            <div>
                <ComponentA onRender={() => renderCountA++} />
                <ComponentB onRender={() => renderCountB++} />
            </div>
        )

        await waitFor(() => screen.getByTestId('a'))
        await waitFor(() => screen.getByTestId('b'))

        // Base case
        expect(screen.getByTestId('a')).toHaveTextContent('1')
        expect(screen.getByTestId('b')).toHaveTextContent('1')

        // Changing the state of "a" to the same state should not rerender ComponentA or ComponentB
        fireEvent.click(screen.getByTestId('a'))
        expect(screen.getByTestId('a')).toHaveTextContent('1')
        expect(renderCountA).toBe(1)
        expect(screen.getByTestId('b')).toHaveTextContent('1')
        expect(renderCountB).toBe(1)

        // Changing the state of "a" should rerender ComponentA
        // Changing the state of "b" to the same state should not rerender ComponentB
        fireEvent.click(screen.getByTestId('b'))
        expect(screen.getByTestId('a')).toHaveTextContent('2')
        expect(renderCountA).toBe(2)
        expect(screen.getByTestId('b')).toHaveTextContent('1')
        expect(renderCountB).toBe(1)
    })
})
