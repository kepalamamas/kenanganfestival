import { createContext, useContext, useEffect, useState } from 'react'
import { api } from './api'

export const EventContext = createContext(null)
export const useEvent = () => useContext(EventContext)

export function EventProvider({ children }) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({
    loading: true,
    event: null,
    form: null,
    open: false,
    error: '',
  })
  useEffect(() => {
    const controller = new AbortController()
    setState((previous) => ({ ...previous, loading: true, error: '' }))
    api
      .event(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted)
          setState({ ...result, loading: false, error: '' })
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({
            loading: false,
            event: null,
            form: null,
            open: false,
            error: error.message,
          })
      })
    return () => controller.abort()
  }, [attempt])
  return (
    <EventContext.Provider
      value={{ ...state, reload: () => setAttempt((value) => value + 1) }}
    >
      {children}
    </EventContext.Provider>
  )
}
