import {useEffect, useState} from 'react'
import Dashboard from "./pages/Dashboard.jsx";
import EmgLabelingApp from './components/EmgLabeling';

function App() {
    const [sessionKey, setSessionKey] = useState({ id: null, refresh: 0 });

    useEffect(() => {
        return window.biosignalApi.on.sessionId(({sessionId, refresh}) => {
            setSessionKey({id: sessionId, refresh});
        });
    }, []);

    return (
        <div>
            <Dashboard sessionId={sessionKey.id} />
            <h1>EMG Labeling Preview</h1>
            <EmgLabelingApp />
        </div>
    );
}

export default App