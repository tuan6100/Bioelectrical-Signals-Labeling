import React from 'react'
import { useRoutes, useParams } from 'react-router-dom'
import Dashboard from '../pages/Dashboard.jsx'
import Workspace from '../pages/Workspace.jsx'

function WorkspaceRouteWrapper() {
    const { sessionId } = useParams()
    if (!sessionId) return null
    const idNum = Number(sessionId)
    return <Workspace sessionId={Number.isFinite(idNum) ? idNum : sessionId} />
}

export default function AppRoutes() {
    return useRoutes([
        { path: '/', element: <Dashboard /> },
        { path: '/sessions/:sessionId', element: <WorkspaceRouteWrapper /> }
    ])
}