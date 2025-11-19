import {useMemo, useState, useEffect, useCallback, useRef} from "react";
import {useNavigate} from 'react-router-dom'
import {fetchAllSessions} from "../api/index.js";
import SessionItem from "../components/table/SessionTable.jsx";
import "./StartPage.css";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faArrowRotateRight} from "@fortawesome/free-solid-svg-icons";

export default function StartPage() {
    const navigate = useNavigate()
    const [sessions, setSessions] = useState([]);
    const [page, setPage] = useState({ number: 1, size: 10, totalPages: 1, totalElements: 0 });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [query, setQuery] = useState("");
    const [hasLoaded, setHasLoaded] = useState(false);
    const mountedRef = useRef(true);

    useEffect(() => {
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const loadPage = useCallback(async (nextPage) => {
        if (loading) return;
        try {
            setLoading(true);
            setError("");
            const res = await fetchAllSessions(nextPage, page.size);
            const incoming = Array.isArray(res?.contents) ? res.contents : [];
            if (!mountedRef.current) return;
            setSessions(prev => nextPage === 1 ? incoming : [...prev, ...incoming]);
            if (res?.page) {
                setPage(res.page);
            } else {
                setPage(p => ({ number: nextPage, size: p.size, totalPages: 0, totalElements: 0 }));
            }
        } catch (e) {
            console.error(e);
            if (mountedRef.current) setError("Failed to load sessions.");
        } finally {
            if (mountedRef.current) {
                setLoading(false);
                setHasLoaded(true);
            }
        }
    }, [page.size, loading]);

    useEffect(() => {
        loadPage(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const canLoadMore = page.number < page.totalPages;

    const filtered = useMemo(() => {
        if (!query.trim()) return sessions;
        const q = query.toLowerCase();
        return sessions.filter(s => {
            const patientId = s.patient?.id;
            const patientName = s.patient?.name || "";
            return (
                String(s.sessionId).includes(q) ||
                (patientId != null && String(patientId).includes(q)) ||
                patientName.toLowerCase().includes(q) ||
                (s.measurementType || "").toLowerCase().includes(q) ||
                (s.inputFileName || "").toLowerCase().includes(q)
            );
        });
    }, [sessions, query]);

    const handleOpenSession = (sessionId) => {
        navigate(`/sessions/${sessionId}`)
    };

    return (
        <div className="start-page-root">
            <aside className="start-page-sidebar">
                <div className="start-page-sidebar-header">
                    <div className="start-page-sidebar-title">Sessions</div>
                    <div className="start-page-sidebar-actions">
                        <>
                            <FontAwesomeIcon
                                icon={faArrowRotateRight}
                                title="Refresh"
                                style={{ cursor: 'pointer' }}
                                onClick={(e) => {
                                    e.preventDefault()
                                    loadPage(1)
                                }}
                                disabled={loading}
                            />
                        </>
                    </div>
                </div>

                <div className="start-page-search-wrap">
                    <input
                        className="start-page-search-input"
                        type="text"
                        placeholder="Search by session / patient / file..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>

                <div className="start-page-list">
                    {error && <div className="start-page-error">{error}</div>}

                    {loading && sessions.length === 0 && (
                        <div className="start-page-placeholder">Loading sessions…</div>
                    )}

                    {!loading && hasLoaded && sessions.length === 0 && (
                        <div className="start-page-placeholder">No sessions found.</div>
                    )}

                    {filtered.map(s => (
                        <SessionItem
                            key={s.sessionId}
                            session={s}
                            onClick={() => handleOpenSession(s.sessionId)}
                        />
                    ))}
                </div>

                <div className="start-page-sidebar-footer">
                    <button
                        className="load-more-btn"
                        disabled={!canLoadMore || loading}
                        onClick={() => loadPage(page.number + 1)}
                    >
                        {loading ? "Loading…" : canLoadMore ? "Load more" : "No more"}
                    </button>
                    <div className="pagination-info">
                        Page {page.number} of {Math.max(page.totalPages, 1)}
                    </div>
                </div>
            </aside>

            <main className="start-page-main">
                <div className="empty-state">
                    <h2 className="empty-title">Choose a session to start</h2>
                    <div className="or-divider">
                        <span className="or-line" />
                        <span className="or-text">or</span>
                        <span className="or-line" />
                    </div>
                    <p className="shortcut-text">
                        Or create a new session by pressing <code>Ctrl+O</code> (or <code>Cmd+O</code> on Mac).
                    </p>
                </div>
            </main>
        </div>
    );
}