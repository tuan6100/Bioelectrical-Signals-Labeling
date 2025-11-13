import { useEffect, useState } from 'react'
import Dashboard from "./pages/Dashboard.jsx";


function App() {
    const [providedSessionId, setProvidedSessionId] = useState(null)

    useEffect(() => {
        if (window.biosignalApi?.on?.sessionId) {
            const unsubscribe = window.biosignalApi.on.sessionId((sessionId) => {
                setProvidedSessionId(sessionId)
            })
            return () => unsubscribe && unsubscribe()
        }
    }, [])

    return (
         <Dashboard sessionId={providedSessionId} />
    )
}

export default App