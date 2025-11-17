import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react'
import './Dashboard.css'
import LeftPanel from "../components/panel/LeftPanel.jsx";
import RightPanel from "../components/panel/RightPanel.jsx";
import { fetchSessionDashboard } from "../api/index.js";

const COLLAPSE_BREAKPOINT = 1100
const RESIZER_WIDTH_PX = 6

export default function Dashboard({ sessionId }) {
    const containerRef = useRef(null)
    const [session, setSession] = useState(null)
    const [channels, setChannels] = useState([])
    const [defaultChannelSignal, setDefaultChannelSignal] = useState(null)
    const [annotations, setAnnotations] = useState([])
    const [selectedChannelId, setSelectedChannelId] = useState(null)
    const [layoutMode, setLayoutMode] = useState('split')
    const [isLoading, setIsLoading] = useState(false)
    const [errorSession, setErrorSession] = useState(null)
    const [startPosition, setStartPosition] = useState(1)
    const [tableData, setTableData] = useState([])
    const [isLabeled, setIsLabeled] = useState(false)
    const [isDoubleChecked, setIsDoubleChecked] = useState(false)
    const [leftPercent, setLeftPercent] = useState(50)
    const isDraggingRef = useRef(false)
    const startXRef = useRef(0)
    const startPercentRef = useRef(50)

    useEffect(() => {
        if (!sessionId) return
        setIsLoading(true)
        setErrorSession(null)
        fetchSessionDashboard(sessionId)
            .then(data => {
                setSession(data.session || null)
                const chs = data.session?.channels || []
                setChannels(chs)
                const cid = data.defaultChannel?.channelId || (chs.length ? chs[0].channelId : null)
                setSelectedChannelId(cid)
                setDefaultChannelSignal(data.defaultChannel?.signal || null)

                const anns = data.defaultChannel?.signal?.annotations
                if (Array.isArray(anns)) {
                    setAnnotations(anns)
                } else if (anns && typeof anns === 'object') {
                    setAnnotations([anns])
                } else {
                    setAnnotations([])
                }
            })
            .catch(err => {
                console.error('Failed to fetch session dashboard:', err)
                setErrorSession(err)
            })
            .finally(() => setIsLoading(false))
    }, [sessionId])

    const applyAutoLayout = useCallback(() => {
        const small = window.innerWidth < COLLAPSE_BREAKPOINT
        setLayoutMode(prev => small ? (prev === 'right' ? 'right' : 'left') : 'split')
    }, [])

    useEffect(() => {
        applyAutoLayout()
        window.addEventListener('resize', applyAutoLayout)
        return () => window.removeEventListener('resize', applyAutoLayout)
    }, [applyAutoLayout])

    const gridTemplateColumns = useMemo(() => {
        if (layoutMode !== 'split') return '1fr'
        const left = Math.max(10, Math.min(90, leftPercent))
        const right = 100 - left
        return `calc(${left}% - ${RESIZER_WIDTH_PX/2}px) ${RESIZER_WIDTH_PX}px calc(${right}% - ${RESIZER_WIDTH_PX/2}px)`
    }, [layoutMode, leftPercent])

    const endResize = useCallback(() => {
        if (!isDraggingRef.current) return
        isDraggingRef.current = false
        document.body.classList.remove('dragging')
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', endResize)
    }, [])

    const onMouseMove = useCallback((e) => {
        if (!isDraggingRef.current || !containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        const width = rect.width
        if (width <= 0) return
        const usable = Math.max(1, width - RESIZER_WIDTH_PX)
        const dx = e.clientX - startXRef.current
        const deltaPercent = (dx / usable) * 100
        const next = Math.max(10, Math.min(90, startPercentRef.current + deltaPercent))
        setLeftPercent(next)
    }, [])

    const startResize = useCallback((e) => {
        if (layoutMode !== 'split') return
        isDraggingRef.current = true
        startXRef.current = e.clientX
        startPercentRef.current = leftPercent
        document.body.classList.add('dragging')
        window.addEventListener('mousemove', onMouseMove)
        window.addEventListener('mouseup', endResize)
    }, [layoutMode, leftPercent, onMouseMove, endResize])

    useEffect(() => {
        return () => {
            if (isDraggingRef.current) {
                document.body.classList.remove('dragging')
                window.removeEventListener('mousemove', onMouseMove)
                window.removeEventListener('mouseup', endResize)
            }
        }
    }, [onMouseMove, endResize])

    const handleBack = () => console.log('Quay trở lại')
    const handleSetup = () => console.log('Setup từ vị trí:', startPosition)
    const handleUpload = () => console.log('Upload CSV')
    const handleDownload = () => console.log('Download data')
    const handleDeleteRow = (id) => setTableData(prev => prev.filter(row => row.id !== id))
    const handleAddLabel = () => {
        const newLabel = { id: Date.now(), startSecond: '', endSecond: '', label1: '', label2: '', label3: '', label4: '', label5: '' }
        setTableData(prev => [...prev, newLabel])
    }
    const handleSave = () => console.log('Lưu kết quả:', tableData)
    const handleLabelChange = (rowId, labelField, value) => {
        setTableData(prev => prev.map(row =>
            row.id === rowId ? { ...row, [labelField]: value } : row
        ))
    }

    // Sync annotations between chart and table via global event
    useEffect(() => {
        const onUpdated = (e) => {
            const detail = e?.detail;
            if (!detail) return;
            if (detail.channelId != null && detail.channelId !== selectedChannelId) return;
            const anns = Array.isArray(detail.annotations) ? detail.annotations : [];
            setAnnotations(anns);
        };
        window.addEventListener('annotations-updated', onUpdated);
        return () => window.removeEventListener('annotations-updated', onUpdated);
    }, [selectedChannelId])

    const rootClass = `dashboard-root ${layoutMode === 'split' ? 'split' : 'single'}`

    const containerStyle = useMemo(() => {
        return layoutMode === 'split'
            ? { gridTemplateColumns, columnGap: 0 }
            : { gridTemplateColumns }
    }, [layoutMode, gridTemplateColumns])

    return (
        <div className={rootClass}>
            <div className="workspace-header">
                <div className="layout-toggle">
                    <button
                        className={`toggle-btn ${layoutMode === 'left' ? 'active' : ''}`}
                        onClick={() => setLayoutMode('left')}
                        disabled={isLoading}
                    >
                        Left
                    </button>
                    <button
                        className={`toggle-btn ${layoutMode === 'split' ? 'active' : ''}`}
                        onClick={() => setLayoutMode('split')}
                        disabled={isLoading || window.innerWidth < COLLAPSE_BREAKPOINT}
                    >
                        Split
                    </button>
                    <button
                        className={`toggle-btn ${layoutMode === 'right' ? 'active' : ''}`}
                        onClick={() => setLayoutMode('right')}
                        disabled={isLoading}
                    >
                        Right
                    </button>
                </div>

                <div className="header-status">
                    {isLoading && <span className="session-loading">Đang tải...</span>}
                    {errorSession && <span className="session-error">Lỗi tải dữ liệu</span>}
                </div>
            </div>

            <div
                className="dashboard-panels"
                ref={containerRef}
                style={containerStyle}
            >
                {(layoutMode === 'split' || layoutMode === 'left') && (
                    <div className="panel panel-left">
                        <LeftPanel
                            session={session}
                            sessionId={sessionId}
                            channels={channels}
                            channelId={selectedChannelId}
                            defaultSignal={defaultChannelSignal}
                            onChannelSelected={setSelectedChannelId}
                            onBack={handleBack}
                        />
                    </div>
                )}

                {layoutMode === 'split' && (
                    <div className="panel-resizer" onMouseDown={startResize} />
                )}

                {(layoutMode === 'split' || layoutMode === 'right') && (
                    <div className="panel panel-right">
                        <RightPanel
                            session={session}
                            annotations={annotations}
                            channelId={selectedChannelId}
                            startPosition={startPosition}
                            onStartPositionChange={setStartPosition}
                            onSetup={handleSetup}
                            onUpload={handleUpload}
                            onDownload={handleDownload}
                            tableData={tableData}
                            onDeleteRow={handleDeleteRow}
                            onAddLabel={handleAddLabel}
                            onSave={handleSave}
                            isLabeled={isLabeled}
                            isDoubleChecked={isDoubleChecked}
                            onToggleLabeled={setIsLabeled}
                            onToggleDoubleChecked={setIsDoubleChecked}
                            onLabelChange={handleLabelChange}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
