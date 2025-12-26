import {useMemo, useState, useEffect, useCallback, useRef} from "react"
import {useNavigate} from 'react-router-dom'

import "./Dashboard.css"
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome"
import {faArrowRotateRight, faSort, faSortUp, faSortDown, faEnvelope } from "@fortawesome/free-solid-svg-icons"
import {fetchAllSessions} from "../api/index.js";

export default function Dashboard() {
    const navigate = useNavigate()
    const [sessions, setSessions] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [query, setQuery] = useState("")
    const [hasLoaded, setHasLoaded] = useState(false)
    const mountedRef = useRef(true)

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false
        }
    }, [])

    const fetchSessions = useCallback(async () => {
        if (loading) return
        try {
            setLoading(true)
            setError("")
            const res = await fetchAllSessions()
            const allSessions = Array.isArray(res) ? res : (Array.isArray(res?.contents) ? res.contents : [])

            if (!mountedRef.current) return
            setSessions(allSessions)
        } catch (e) {
            console.error(e)
            if (mountedRef.current) setError("Failed to load sessions.")
        } finally {
            if (mountedRef.current) {
                setLoading(false)
                setHasLoaded(true)
            }
        }
    }, [loading])

    useEffect(() => {
        fetchSessions()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (window.biosignalApi?.on?.sessionStatusUpdated) {
            const unsubscribe = window.biosignalApi.on.sessionStatusUpdated(updatedSession => {
                setSessions(prevSessions => prevSessions.map(s =>
                    s.sessionId === updatedSession.sessionId
                        ? { ...s, status: updatedSession.status, updatedAt: updatedSession.updatedAt }
                        : s
                ));
            });
            return () => unsubscribe();
        }
    }, []);

    useEffect(() => {
        if (window.biosignalApi?.on?.sessionsUpdated) {
            const unsubscribe = window.biosignalApi.on.sessionsUpdated(() => {
                fetchSessions();
            });
            return () => unsubscribe();
        }
    }, []);

    const Filtered = useMemo(() => {
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

        return filteredSessions;
    }, [sessions, query])

    const handleOpenSession = (sessionId) => {
        navigate(`/sessions/${sessionId}`)
    }

    const handleFileAction = async (apiCall) => {
        if (loading) return;
        setLoading(true);
        try {
            await apiCall;
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="start-page-root" style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', backgroundColor: '#f5f5f5', overflow: 'hidden' }}>

            <main className="start-page-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', padding: '20px', boxSizing: 'border-box', overflow: 'hidden' }}>
                <div className="dashboard-wrapper" style={{ display: 'flex', flexDirection: 'column', flex: 1, backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>

                    <div className="dashboard-top-nav" style={{
                        padding: '20px 20px 0 20px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-end'
                    }}>
                        <img
                            src="/logo/ibme-logo.png"
                            alt="iBME Logo"
                            style={{ height: '100px', width: 'auto', marginBottom: '8px' }}
                        />
                        <h1 style={{ textAlign: "center", margin: 0, fontSize: '2rem', color: '#333', fontFamily: 'Open Sans, sans-serif' }}>
                            EMG Biosignal Labeling Dashboard
                        </h1>
                        <div className="header-actions" style={{ marginBottom: '5px' }}>
                            <a
                                href="https://lab.ibme.edu.vn/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="contact-link"
                                style={{
                                    textDecoration: 'none',
                                    color: '#007bff',
                                    fontWeight: '500',
                                    fontSize: '0.9rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px'
                                }}
                            >
                                <FontAwesomeIcon icon={faEnvelope} />Contact Us
                            </a>
                        </div>
                    </div>

                    <div className="dashboard-sessions-block" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', padding: '20px' }}>

                        <div className="dashboard-sessions-header" style={{ flexShrink: 0, marginBottom: '15px' }}>
                            <div className="start-page-search-wrap start-page-search-wrap--with-action" style={{ flexShrink: 0, marginBottom: 0 }}>
                                <input
                                    className="start-page-search-input start-page-search-input--with-action"
                                    type="text"
                                    placeholder="Search (e.g. status=NEW, patientname=Nguyen Van A, ...)"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                />

                                <button
                                    className="icon-btn start-page-search-action"
                                    title="Refresh List"
                                    onClick={(e) => {
                                        e.preventDefault()
                                        fetchSessions()
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

                        {error && <div className="start-page-error">{error}</div>}
                        {loading && sessions.length === 0 && (
                            <div className="start-page-placeholder">Loading sessions…</div>
                        )}
                        {!loading && hasLoaded && sessions.length === 0 && (
                            <div className="start-page-placeholder">No sessions found.</div>
                        )}

                        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #eee', borderRadius: '4px' }}>
                            <table className="sessions-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8f9fa', zIndex: 1, boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                                <tr>
                                    <th style={{ padding: '12px', textAlign: 'center' }}>No</th>
                                    <th style={{ padding: '12px', textAlign: 'center' }}>Patient Name</th>
                                    <th style={{ padding: '12px', textAlign: 'center' }}>Patient ID</th>
                                    <th style={{ padding: '12px', textAlign: 'center' }}>Start Time</th>
                                    <th style={{ padding: '12px', textAlign: 'center' }}>File Name</th>
                                    <th style={{ padding: '12px', textAlign: 'center' }}>Checked</th>
                                    <th style={{ padding: '12px', textAlign: 'center' }}>Double-checked</th>
                                    <th style={{ padding: '12px', textAlign: 'center' }}>Status</th>
                                </tr>
                                </thead>
                                <tbody>
                                {Filtered.map((s, idx) => {
                                    const no = idx + 1
                                    const statusRaw = (s.status || '').toUpperCase()
                                    const statusObj = {
                                        'NEW': 'New',
                                        'IN_PROGRESS': 'In Progress',
                                        'REQUEST_DOUBLE_CHECK': 'Request Double Check',
                                        'WAIT_FOR_DOUBLE_CHECK': 'Wait for Double Check',
                                        'COMPLETED': 'Completed'
                                    }
                                    const statusLabel = statusObj[statusRaw] || statusRaw || '-'
                                    const patientId = s.patient?.id ?? s.patientId ?? '-'
                                    const patientName = s.patient?.name ?? s.patientName ?? '-'
                                    const isChecked = statusRaw === 'COMPLETED'
                                    const isDoubleChecked = s.isDoubleChecked || false

                                    return (
                                        <tr key={s.sessionId} className={`session-row session-status-${(s.status||'').toLowerCase()}`} onClick={() => handleOpenSession(s.sessionId)} style={{cursor: 'pointer', borderBottom: '1px solid #eee'}}>
                                            <td style={{ padding: '10px' }}>{no}</td>
                                            <td style={{ padding: '10px' }}>{patientName}</td>
                                            <td style={{ padding: '10px' }}>{patientId}</td>
                                            <td style={{ padding: '10px' }}>{s.startTime || '-'}</td>
                                            {/* <td style={{ padding: '10px' }}>{s.endTime || '-'}</td> */}
                                            {/* <td style={{ padding: '10px' }}>{s.measurementType || '-'}</td> */}
                                            <td style={{ padding: '10px' }}>{s.inputFileName || '-'}</td>
                                            <td style={{ padding: '10px', textAlign: 'center' }}>{isChecked ? '✓' : ''}</td>
                                            <td style={{ padding: '10px', textAlign: 'center' }}>{isDoubleChecked ? '✓' : ''}</td>
                                            <td style={{ padding: '10px' }}>
                                                <span className={`badge status-${statusRaw.toLowerCase()}`}>{statusLabel}</span>
                                            </td>
                                        </tr>
                                    )
                                })}
                                </tbody>
                            </table>
                        </div>

                        <div className="dashboard-sessions-footer" style={{ marginTop: '10px', flexShrink: 0, textAlign: 'right', fontSize: '0.85rem', color: '#666' }}>
                            Total {Filtered.length} file(s)
                        </div>
                        <div className="dashboard-toolbar" style={{ display: 'flex', gap: '10px', marginBottom: '15px', justifyContent: 'flex-end'}}>
                            <button
                                className="primary-btn"
                                onClick={() => handleFileAction(window.biosignalApi.head.importRaw())}
                            >
                                Import Raw Data
                            </button>

                            <button
                                className="primary-btn"
                                onClick={() => handleFileAction(window.biosignalApi.head.importReviewed())}
                            >
                                Import Reviewed Data
                            </button>

                            <button
                                className="secondary-btn"
                                onClick={() => handleFileAction(window.biosignalApi.head.openFolder())}
                            >
                                Open Folder
                            </button>
                            </div>
                    </div>
                </div>
            </main>
        </div>
    )
}