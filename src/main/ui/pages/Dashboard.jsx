import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import "./Dashboard.css";

import DashboardHeader from "../components/DashboardHeader";
import SearchToolbar from "../components/SearchToolbar";
import SessionsTable from "../components/SessionsTable";
import ActionToolbar from "../components/ActionToolbar";
import { useSessionFilter } from "../hooks/useSessionFilter";
import { useTableSort } from "../hooks/useTableSort";

import { biosignalApi, useGetAllSessionsQuery, useDeleteSessionMutation } from "../redux/api/index.js";

export default function Dashboard() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [query, setQuery] = useState("");
    const { data: sessions = [], isLoading: loading, error, refetch } = useGetAllSessionsQuery();
    const [deleteSession] = useDeleteSessionMutation();
    const filteredSessions = useSessionFilter(sessions, query);

    const {
        sortedData,
        sortConfig,
        handleSort
    } = useTableSort(filteredSessions);

    useEffect(() => {
        let cleanupSessions;
        let cleanupStatus;
        if (window.biosignalApi?.on) {
            cleanupSessions = window.biosignalApi.on.sessionsUpdated(() => {
                refetch();
            });
            cleanupStatus = window.biosignalApi.on.sessionStatusUpdated((updatedSession) => {
                if (!updatedSession?.sessionId) return;
                dispatch(
                    biosignalApi.util.updateQueryData('getAllSessions', undefined, (draftSessions) => {
                        const sessionToUpdate = draftSessions.find(s => s.sessionId === updatedSession.sessionId);
                        if (sessionToUpdate) {
                            sessionToUpdate.status = updatedSession.status;
                            sessionToUpdate.updatedAt = updatedSession.updatedAt;
                        }
                    })
                );
            });
        }
        return () => {
            if (typeof cleanupSessions === 'function') cleanupSessions();
            if (typeof cleanupStatus === 'function') cleanupStatus();
        };
    }, [dispatch, refetch]);

    const handleOpenSession = (sessionId) => {
        navigate(`/sessions/${sessionId}`);
    };

    const handleDeleteSession = async (sessionId) => {
        try {
            await deleteSession(sessionId).unwrap();
            window.alert('Session deleted successfully.');
        } catch (e) {
            window.alert('Failed to delete session.');
            console.error(e);
        }
    };

    const handleFileAction = async (apiCall) => {
        if (loading) return;
        try {
            await apiCall;
        } finally {
        }
    };

    return (
        <div className="start-page-root dashboard-container">
            <main className="start-page-main dashboard-main">
                <div className="dashboard-wrapper">
                    <DashboardHeader />

                    <div className="dashboard-sessions-block sessions-block-container">
                        <SearchToolbar
                            query={query}
                            onQueryChange={setQuery}
                            onRefresh={refetch}
                            loading={loading}
                        />

                        {error && <div className="start-page-error">{error}</div>}

                        {loading && sessions.length === 0 && (
                            <div className="start-page-placeholder">Loading sessions…</div>
                        )}

                        {!loading && sessions.length === 0 && (
                            <div className="start-page-placeholder">No sessions found.</div>
                        )}

                        <SessionsTable
                            sessions={sortedData}
                            sortConfig={sortConfig}
                            onSort={handleSort}
                            onOpenSession={handleOpenSession}
                            onDelete={handleDeleteSession}
                        />

                        <div className="dashboard-sessions-footer footer-stats">
                            Total {filteredSessions.length} file(s)
                        </div>

                        <ActionToolbar
                            onImportRaw={() => handleFileAction(window.biosignalApi.head.importRaw())}
                            onImportReviewed={() => handleFileAction(window.biosignalApi.head.importReviewed())}
                            onOpenFolder={() => handleFileAction(window.biosignalApi.head.openFolder())}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}