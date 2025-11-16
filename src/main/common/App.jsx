import {useEffect, useState} from 'react'
import Dashboard from "./pages/Dashboard.jsx";
import {isDesktopEnv} from "../app/api/provider/index.js";


function App() {
    const [sessionKey, setSessionKey] = useState({ id: null, refresh: 0 });

    useEffect(() => {
        if (isDesktopEnv()) {
            return window.biosignalApi.on.sessionId(({sessionId, refresh}) => {
                console.log(`Received session ID: ${sessionId}, refresh: ${refresh}`);
                setSessionKey({id: sessionId, refresh});
            });
        }
    }, []);

    return (
        <div>
            <h1>Biosignal Labeling Preview</h1>
            <Dashboard sessionId={sessionKey.id} />
        </div>
    );
}

export default App