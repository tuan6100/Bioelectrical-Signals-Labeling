import {useMemo, useState, useEffect, useCallback, useRef} from "react"
import {useNavigate} from 'react-router-dom'

import "./Dashboard.css"
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome"
import {faArrowRotateRight, faSort, faSortUp, faSortDown} from "@fortawesome/free-solid-svg-icons"
import {fetchAllSessions} from "../api/index.js";
import SessionTable from "../components/table/SessionTable.jsx";

export default function Dashboard() {
    const navigate = useNavigate()
    const [sessions, setSessions] = useState([])
    const [page, setPage] = useState({ number: 1, size: 5, totalPages: 1, totalElements: 0 })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [query, setQuery] = useState("")
    const [hasLoaded, setHasLoaded] = useState(false)
    const [statusSortOrder, setStatusSortOrder] = useState('none');
    const mountedRef = useRef(true)

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false
        }
    }, [])

    const loadPage = useCallback(async (nextPage) => {
        if (loading) return
        try {
            setLoading(true)
            setError("")
            const res = await fetchAllSessions(nextPage, page.size)
            const incoming = Array.isArray(res?.contents) ? res.contents : []
            if (!mountedRef.current) return
            setSessions(prev => nextPage === 1 ? incoming : [...prev, ...incoming])
            if (res?.page) {
                setPage(res.page)
            } else {
                setPage(p => ({ number: nextPage, size: p.size, totalPages: 0, totalElements: 0 }))
            }
        } catch (e) {
            console.error(e)
            if (mountedRef.current) setError("Failed to load sessions.")
        } finally {
            if (mountedRef.current) {
                setLoading(false)
                setHasLoaded(true)
            }
        }
    }, [page.size, loading])

    useEffect(() => {
        loadPage(1)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (window.biosignalApi?.on?.sessionsUpdated) {
            const unsubscribe = window.biosignalApi.on.sessionsUpdated(() => {
                loadPage(1);
            });
            return () => unsubscribe();
        }
    }, [loadPage]);

    const canLoadMore = page.number < page.totalPages

    const sortedAndFiltered = useMemo(() => {
        const raw = query.trim()
        let filteredSessions = sessions;

        if (raw) {
            const parts = raw.match(/("[^"]*"|'[^']*'|\S+)/g) || []
            const tokens = []
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i]
                const m = part.match(/^(\w+)([=-])(.*)$/)
                if (m) {
                    let key = m[1].toLowerCase()
                    const op = m[2]
                    let value = m[3] || ''
                    if (op === '=') {
                        while (i + 1 < parts.length && !parts[i + 1].match(/^(\w+)([=-])/)) {
                            if (parts[i + 1] === ',') break
                            value += (value ? ' ' : '') + parts[++i]
                        }
                    }
                    value = value.replace(/^("|')(.*)\1$/, '$2')
                    value = value.replace(/[\s,]+$/, '')
                    tokens.push({ key, op, value })
                }
            }

            const fieldExtractors = {
                sessionid: s => (s.sessionId != null ? String(s.sessionId) : ''),
                patientid: s => (
                    s.patient?.id != null ? String(s.patient.id) :
                        s.patientId != null ? String(s.patientId) :
                            s.patient_id != null ? String(s.patient_id) : ''
                ),
                patientname: s => {
                    const direct = s.patient?.name || s.patientName || s.patient_name || ''
                    const fn = s.patient?.firstName || s.patientFirstName || s.patient_first_name || ''
                    const ln = s.patient?.lastName || s.patientLastName || s.patient_last_name || ''
                    const combined = [fn, ln].filter(Boolean).join(' ').trim()
                    return (direct || combined).trim()
                },
                measurementtype: s => (s.measurementType || s.sessionMeasurementType || s.measurement_type || ''),
                filename: s => (s.inputFileName || s.sourceFileName || s.fileName || s.source_file_name || ''),
                status: s => (s.status || '').toLowerCase(),
            }
            const useStructured = tokens.length > 0 && tokens.every(t => fieldExtractors[t.key])
            if (useStructured) {
                filteredSessions = sessions.filter(s => {
                    for (const t of tokens) {
                        const rawFieldVal = fieldExtractors[t.key](s)
                        const normField = rawFieldVal.replace(/\s+/g, ' ').trim().toLowerCase()
                        const normValue = t.value.replace(/\s+/g, ' ').trim().toLowerCase()
                        if (t.op === '=') {
                            if (t.key === 'patientname' || t.key === 'status') {
                                if (!normField.includes(normValue)) return false
                            } else {
                                if (normField !== normValue) return false
                            }
                        } else {
                            if (!normField.includes(normValue)) return false
                        }
                    }
                    return true
                })
            } else {
                const q = raw.toLowerCase()
                filteredSessions = sessions.filter(s => {
                    const patientId = s.patient?.id
                    const patientName = s.patient?.name || ''
                    return (
                        String(s.sessionId).includes(q) ||
                        (patientId != null && String(patientId).includes(q)) ||
                        patientName.toLowerCase().includes(q) ||
                        (s.measurementType || '').toLowerCase().includes(q) ||
                        (s.inputFileName || '').toLowerCase().includes(q) ||
                        (s.status || '').toLowerCase().includes(q)
                    )
                })
            }
        }

        if (statusSortOrder !== 'none') {
            const statusOrder = { 'NEW': 1, 'IN_PROGRESS': 2, 'COMPLETED': 3 };
            filteredSessions.sort((a, b) => {
                const orderA = statusOrder[a.status] || 0;
                const orderB = statusOrder[b.status] || 0;
                if (statusSortOrder === 'asc') {
                    return orderA - orderB;
                } else {
                    return orderB - orderA;
                }
            });
        }

        return filteredSessions;
    }, [sessions, query, statusSortOrder])

    const toggleStatusSort = () => {
        setStatusSortOrder(current => {
            if (current === 'none') return 'asc';
            if (current === 'asc') return 'desc';
            return 'none';
        });
    };

    const handleOpenSession = (sessionId) => {
        navigate(`/sessions/${sessionId}`)
    }

    return (
        <div className="start-page-root">
            <aside className="start-page-sidebar">
                <h1>Biosignal Labeling Dashboard</h1>
                <div className="start-page-sidebar-header">
                    <div className="start-page-sidebar-title">Sessions</div>
                    <div className="start-page-sidebar-actions">
                        <button
                            className="icon-btn"
                            title={`Sort by Status (${statusSortOrder === 'asc' ? 'Completed first' :  'New first' })`}
                            onClick={toggleStatusSort}
                            style={{ marginRight: '15px' }}
                        >
                            <FontAwesomeIcon
                                icon={statusSortOrder === 'asc' ? faSortUp : statusSortOrder === 'desc' ? faSortDown : faSort}
                            />
                        </button>
                        <button
                            className="icon-btn"
                            title="Refresh List"
                            onClick={(e) => {
                                e.preventDefault()
                                loadPage(1)
                            }}
                            disabled={loading}
                        >
                            <FontAwesomeIcon
                                icon={faArrowRotateRight}
                                spin={loading}
                                size="lg"
                            />
                        </button>
                    </div>
                </div>

                <div className="start-page-search-wrap">
                    <input
                        className="start-page-search-input"
                        type="text"
                        placeholder="Search (e.g. status=NEW, patientname=Nguyen Van A, ...)"
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

                    {sortedAndFiltered.map(s => (
                        <SessionTable
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
                    <div className="shortcut-text">
                        <p>Import a file: <code>Ctrl+N</code></p>
                        <p>Import files from folder: <code>Ctrl+N</code></p>
                    </div>

                </div>
            </main>
        </div>
    )
}
