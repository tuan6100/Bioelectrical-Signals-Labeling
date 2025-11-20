import {useEffect} from 'react'
import {HashRouter, useNavigate} from 'react-router-dom'
import {isDesktopEnv} from "@biosignal/app/api/provider/index.js";
import AppRoutes from "@biosignal/common/routes/index.jsx";


function SessionListener() {
    const navigate = useNavigate()
    useEffect(() => {
        if (!isDesktopEnv()) return
        return window.biosignalApi.on.sessionId(({sessionId}) => {
            if (sessionId != null) {
                navigate(`/sessions/${sessionId}`)
            }
        })
    }, [navigate])
    return null
}

function App() {
    return (
        <HashRouter>
            <h1>Biosignal Labeling Preview</h1>
            <SessionListener />
            <AppRoutes />
        </HashRouter>
    )
}

export default App