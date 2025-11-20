import {useMemo, useState, useEffect, useCallback, useRef} from "react"
import {useNavigate} from 'react-router-dom'

import "./StartPage.css"
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome"
import {faArrowRotateRight} from "@fortawesome/free-solid-svg-icons"
import {fetchAllSessions} from "@biosignal/common/api/index.js";
import SessionTable from "@biosignal/common/components/table/SessionTable.jsx";

export default function StartPage() {
    const navigate = useNavigate()
    const [sessions, setSessions] = useState([])
    const [page, setPage] = useState({ number: 1, size: 10, totalPages: 1, totalElements: 0 })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [query, setQuery] = useState("")
    const [hasLoaded, setHasLoaded] = useState(false)
    const mountedRef = useRef(true)

    useEffect(() => {
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

    const canLoadMore = page.number < page.totalPages

    const filtered = useMemo(() => {
        const raw = query.trim()
        if (!raw) return sessions
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
        }
        const useStructured = tokens.length > 0 && tokens.every(t => fieldExtractors[t.key])
        if (useStructured) {
            return sessions.filter(s => {
                for (const t of tokens) {
                    const rawFieldVal = fieldExtractors[t.key](s)
                    const normField = rawFieldVal.replace(/\s+/g, ' ').trim().toLowerCase()
                    const normValue = t.value.replace(/\s+/g, ' ').trim().toLowerCase()
                    if (t.op === '=') {
                        if (t.key === 'patientname') {
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
        }
        const q = raw.toLowerCase()
        return sessions.filter(s => {
            const patientId = s.patient?.id
            const patientName = s.patient?.name || ''
            return (
                String(s.sessionId).includes(q) ||
                (patientId != null && String(patientId).includes(q)) ||
                patientName.toLowerCase().includes(q) ||
                (s.measurementType || '').toLowerCase().includes(q) ||
                (s.inputFileName || '').toLowerCase().includes(q)
            )
        })
    }, [sessions, query])

    const handleOpenSession = (sessionId) => {
        navigate(`/sessions/${sessionId}`)
    }

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
                        placeholder="Search (e.g. patientname=Nguyen Van A, sessionid=7, ..."
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
                    <p className="shortcut-text">
                        Or create a new session by pressing <code>Ctrl+O</code> (or <code>Cmd+O</code> on Mac).
                    </p>
                </div>
            </main>
        </div>
    )
}