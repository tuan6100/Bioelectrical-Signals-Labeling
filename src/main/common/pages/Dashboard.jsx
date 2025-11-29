import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react'
import './Dashboard.css'
import {useFetchSession} from "../hooks/useFetchSession.js";
import LeftPanel from "../components/panel/LeftPanel.jsx";
import RightPanel from "../components/panel/RightPanel.jsx";


const COLLAPSE_BREAKPOINT = 1100
const RESIZER_WIDTH_PX = 6

export default function Dashboard({ sessionId }) {
    const containerRef = useRef(null)

    const {
        loading,
        error,
        session,
        channels,
        channelId,
        defaultSignal,
        labels: hookLabels,
        setChannelId
    } = useFetchSession(sessionId)

    const [annotations, setAnnotations] = useState([])
    const [layoutMode, setLayoutMode] = useState('split')
    const [startPosition, setStartPosition] = useState(1)
    const [tableData, setTableData] = useState([])
    const [isLabeled, setIsLabeled] = useState(false)
    const [isDoubleChecked, setIsDoubleChecked] = useState(false)
    const [leftPercent, setLeftPercent] = useState(50)
    const isDraggingRef = useRef(false)
    const startXRef = useRef(0)
    const startPercentRef = useRef(50)

    useEffect(() => {
        setAnnotations(Array.isArray(hookLabels) ? hookLabels : [])
    }, [hookLabels])

    useEffect(() => {
        const onUpdated = (e) => {
            const detail = e?.detail;
            if (!detail) return;
            if (detail.channelId != null && detail.channelId !== channelId) return;
            const anns = Array.isArray(detail.annotations) ? detail.annotations : [];
            setAnnotations(anns);
        };
        window.addEventListener('annotations-updated', onUpdated);
        return () => window.removeEventListener('annotations-updated', onUpdated);
    }, [channelId])

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
                        disabled={loading}
                    >
                        Left
                    </button>
                    <button
                        className={`toggle-btn ${layoutMode === 'split' ? 'active' : ''}`}
                        onClick={() => setLayoutMode('split')}
                        disabled={loading || window.innerWidth < COLLAPSE_BREAKPOINT}
                    >
                        Split
                    </button>
                    <button
                        className={`toggle-btn ${layoutMode === 'right' ? 'active' : ''}`}
                        onClick={() => setLayoutMode('right')}
                        disabled={loading}
                    >
                        Right
                    </button>
                </div>

                <div className="header-status">
                    {loading && <span className="session-loading">Loading...</span>}
                    {error && <span className="session-error">Error occurs when loading</span>}
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
                            channelId={channelId}
                            defaultSignal={defaultSignal}
                            onChannelSelected={setChannelId}
                            labels={hookLabels}
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
                            channelId={channelId}
                            startPosition={startPosition}
                            onStartPositionChange={setStartPosition}
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