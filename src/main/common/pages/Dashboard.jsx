import { useState } from "react";
import { useNavigate } from 'react-router-dom';
import "./Dashboard.css";
import { fetchDeleteSession } from "../api/index.js";

// Components
import DashboardHeader from "../components/DashboardHeader";
import SearchToolbar from "../components/SearchToolbar";
import SessionsTable from "../components/SessionsTable";
import ActionToolbar from "../components/ActionToolbar";

// Custom Hooks
import { useSessions } from "../hooks/useSessions";
import { useSessionFilter } from "../hooks/useSessionFilter";

export default function Dashboard() {
    const navigate = useNavigate();
    const [query, setQuery] = useState("");
    
    const { sessions, loading, error, hasLoaded, fetchSessions } = useSessions();
    const filteredSessions = useSessionFilter(sessions, query);

    const handleOpenSession = (sessionId) => {
        navigate(`/sessions/${sessionId}`);
    };

    const handleDeleteSession = async (sessionId) => {
        try {
            // Call the delete API
            await fetchDeleteSession(sessionId);
            
            // Refresh sessions after successful delete
            await fetchSessions();
        } catch (error) {
            console.error('Failed to delete session:', error);
            alert('Failed to delete session. Please try again.');
        }
    };

    const handleFileAction = async (apiCall) => {
        if (loading) return;
        try {
            await apiCall;
        } finally {
            // Actions are handled by the API
        }
    };

    return (
        <div className="start-page-root" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            width: '100vw', 
            height: '100vh', 
            backgroundColor: '#f5f5f5', 
            overflow: 'hidden' 
        }}>
            <main className="start-page-main" style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                width: '100%', 
                padding: '20px', 
                boxSizing: 'border-box', 
                overflow: 'hidden' 
            }}>
                <div className="dashboard-wrapper" style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    flex: 1, 
                    backgroundColor: '#fff', 
                    borderRadius: '8px', 
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
                    overflow: 'hidden' 
                }}>
                    <DashboardHeader />

                    <div className="dashboard-sessions-block" style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        flex: 1, 
                        overflow: 'hidden', 
                        padding: '20px' 
                    }}>
                        <SearchToolbar
                            query={query}
                            onQueryChange={setQuery}
                            onRefresh={fetchSessions}
                            loading={loading}
                        />

                        {error && <div className="start-page-error">{error}</div>}
                        
                        {loading && sessions.length === 0 && (
                            <div className="start-page-placeholder">Loading sessions…</div>
                        )}
                        
                        {!loading && hasLoaded && sessions.length === 0 && (
                            <div className="start-page-placeholder">No sessions found.</div>
                        )}

                        <SessionsTable
                            sessions={filteredSessions}
                            onOpenSession={handleOpenSession}
                            onDelete={handleDeleteSession}
                        />

                        <div className="dashboard-sessions-footer" style={{ 
                            marginTop: '10px', 
                            flexShrink: 0, 
                            textAlign: 'right', 
                            fontSize: '0.85rem', 
                            color: '#666' 
                        }}>
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