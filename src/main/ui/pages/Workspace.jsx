import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react'
import './Workspace.css'
import { useDispatch } from 'react-redux'
import LeftPanel from "../components/panel/LeftPanel.jsx";
import RightPanel from "../components/panel/RightPanel.jsx";
import { useNavigate } from "react-router-dom";
import { biosignalApi, useGetSessionWorkspaceQuery, useUpdateSessionWorkspaceCacheMutation } from '../redux/api/index.js';
import { setChannel } from '../redux/slices/workspaceSlice.js';

const COLLAPSE_BREAKPOINT = 1100
const RESIZER_WIDTH_PX = 6

const formatAnnotations = (list) => {
    if (!Array.isArray(list)) return [];
    return list.map(a => ({
        annotationId: a.annotationId,
        startTimeMs: a.startTimeMs ?? a.startTime,
        endTimeMs: a.endTimeMs ?? a.endTime,
        labelName: a.label?.name || a.labelName || 'Unknown',
        note: a.note || null,
        needsRevision: a.needsRevision || false,
        label: a.label || null
    }));
};

const processAnnotations = (signal) => {
    if (signal?.annotations) {
        const ann = Array.isArray(signal.annotations) ? signal.annotations : [signal.annotations];
        return formatAnnotations(ann);
    }
    return [];
};

export default function Workspace({ sessionId }) {
    const containerRef = useRef(null)
    const navigate = useNavigate()
    const dispatch = useDispatch()

    const { data: workspaceData, isLoading: loading, error } = useGetSessionWorkspaceQuery(sessionId, {
        skip: !sessionId
    });

    const session = workspaceData?.session || null;
    const channels = workspaceData?.session?.channels || [];
    const defaultSignal = workspaceData?.defaultChannel?.signal || null;
    const defaultChannelId = workspaceData?.defaultChannel?.channelId || (channels.length ? channels[0].channelId : null);

    const annotations = useMemo(() => {
        return processAnnotations(defaultSignal);
    }, [defaultSignal]);

    const [layoutMode, setLayoutMode] = useState('split')
    const [startPosition, setStartPosition] = useState(1)
    const [leftPercent, setLeftPercent] = useState(50)
    const [channelId, setChannelId] = useState(defaultChannelId)
    const isDraggingRef = useRef(false)
    const startXRef = useRef(0)
    const [updateWorkspaceCache] = useUpdateSessionWorkspaceCacheMutation();

    useEffect(() => {
        if (defaultChannelId) {
            setChannelId(defaultChannelId)
        }
    }, [defaultChannelId])

    // --- 2. VÁ CACHE KHI CÓ EVENT TỪ SIGNAL CHART / LABEL TABLE ---
    useEffect(() => {
        const onUpdated = (e) => {
            const detail = e?.detail;
            if (!detail) return;
            if (detail.channelId != null && detail.channelId !== channelId) return;
            const anns = Array.isArray(detail.annotations) ? detail.annotations : [];
            if (sessionId) {
                updateWorkspaceCache({
                    sessionId: sessionId,
                    channelId: detail.channelId,
                    newAnnotations: anns
                });
            }
        };
        window.addEventListener('annotations-updated', onUpdated);
        return () => window.removeEventListener('annotations-updated', onUpdated);
    }, [channelId, sessionId, updateWorkspaceCache]);

    // --- 3. VÁ CACHE KHI NHẬN IPC STATUS TỪ ELECTRON ---
    useEffect(() => {
        let cleanupStatus;
        if (window.biosignalApi?.on) {
            cleanupStatus = window.biosignalApi.on.sessionStatusUpdated((updatedSession) => {
                if (!updatedSession?.sessionId || updatedSession.sessionId !== sessionId) return;
                dispatch(
                    biosignalApi.util.updateQueryData('getSessionWorkspace', sessionId, (draft) => {
                        if (draft.session) {
                            draft.session.status = updatedSession.status;
                            draft.session.updatedAt = updatedSession.updatedAt;
                        }
                    })
                );
            });
        }
        return () => {
            if (typeof cleanupStatus === 'function') cleanupStatus();
        };
    }, [dispatch, sessionId]);

    // Các phần AutoLayout, Grid, Move, Resize... giữ nguyên
    useEffect(() => {
        const applyAutoLayout = () => {
            const small = window.innerWidth < COLLAPSE_BREAKPOINT
            setLayoutMode(prev => small ? (prev === 'right' ? 'right' : 'left') : 'split')
        }
        applyAutoLayout()
        window.addEventListener('resize', applyAutoLayout)
        return () => window.removeEventListener('resize', applyAutoLayout)
    }, [])

    const gridTemplateColumns = useMemo(() => {
        if (layoutMode !== 'split') return '1fr'
        const left = Math.max(10, Math.min(90, leftPercent))
        const right = 100 - left
        return `calc(${left}% - ${RESIZER_WIDTH_PX/2}px) ${RESIZER_WIDTH_PX}px calc(${right}% - ${RESIZER_WIDTH_PX/2}px)`
    }, [layoutMode, leftPercent])

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

    const endResize = useCallback(() => {
        if (!isDraggingRef.current) return
        isDraggingRef.current = false
        document.body.classList.remove('dragging')
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', endResize)
    }, [onMouseMove])

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
    }, [])

    const rootClass = `dashboard-root ${layoutMode === 'split' ? 'split' : 'single'}`

    const containerStyle = useMemo(() => {
        return layoutMode === 'split'
            ? { gridTemplateColumns, columnGap: 0 }
            : { gridTemplateColumns }
    }, [layoutMode, gridTemplateColumns])

    const handleSetChannelId = (newChannelId) => {
        setChannelId(newChannelId)
        dispatch(setChannel(newChannelId))
    }

    return (
        <div className={rootClass}>
            <div className="workspace-header">
                <button className="back-btn" onClick={() => navigate('/')}>
                    Back
                </button>
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
                            onChannelSelected={handleSetChannelId}
                            labels={annotations} // TRUYỀN THẲNG BIẾN ANNOTATIONS TỪ USEMEMO
                            loading={loading}
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
                            annotations={annotations} // TRUYỀN THẲNG BIẾN ANNOTATIONS TỪ USEMEMO
                            channelId={channelId}
                            startPosition={startPosition}
                            onStartPositionChange={setStartPosition}
                            loading={loading}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}