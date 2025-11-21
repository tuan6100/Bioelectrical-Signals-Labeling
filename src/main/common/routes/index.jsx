import React from 'react'
import { useRoutes, useParams } from 'react-router-dom'
import StartPage from '../pages/StartPage.jsx'
import Dashboard from '../pages/Dashboard.jsx'

function DashboardRouteWrapper() {
    const { sessionId } = useParams()
    if (!sessionId) return null
    const idNum = Number(sessionId)
    return <Dashboard sessionId={Number.isFinite(idNum) ? idNum : sessionId} />
}

export default function AppRoutes() {
    return useRoutes([
        { path: '/', element: <StartPage /> },
        { path: '/sessions/:sessionId', element: <DashboardRouteWrapper /> }
    ])
}