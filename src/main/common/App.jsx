import { useEffect, useState } from 'react'
import EmgLabelingApp from './components/EmgLabeling';

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
        <div>
            <h1>EMG Labeling Preview</h1>
            <EmgLabelingApp />
        </div>
    );
    return (
        {/* <Dashboard sessionId={providedSessionId} /> */}
    )
}

export default App