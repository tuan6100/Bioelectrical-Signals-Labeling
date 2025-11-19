import {useEffect} from 'react'
import { BrowserRouter, useNavigate } from 'react-router-dom'
import {isDesktopEnv} from "../app/api/provider/index.js";
import AppRoutes from './routes/index.jsx'

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
        <BrowserRouter>
            <h1>Biosignal Labeling Preview</h1>
            <SessionListener />
            <AppRoutes />
        </BrowserRouter>
    )
}

export default App