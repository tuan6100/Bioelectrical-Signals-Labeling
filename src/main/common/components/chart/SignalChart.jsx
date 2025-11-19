import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import {
    fetchCreateLabel,
    fetchGetAllLabels,
    fetchUpdateAnnotation,
    fetchDeleteAnnotation,
    fetchShowErrorDialog
} from "../../api";
import './SignalChart.css';
import LabelContextMenu from './LabelContextMenu.jsx';

export default function SignalChart({
                                        samples,
                                        samplingRateHz,
                                        durationMs,
                                        viewport,
                                        onViewportChange,
                                        channelId,
                                        existingLabels,
                                        minLabelDurationMs
                                    }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const overlapDialogShownRef = useRef(false);
    const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
    const [dragState, setDragState] = useState({ active: false, startTime: null, endTime: null });
    const [panState, setPanState] = useState({ active: false, startX: null, startViewport: null });
    const [resizeState, setResizeState] = useState({ active: false, label: null, edge: null, originalStart: null, originalEnd: null });
    const [labels, setLabels] = useState([]);
    const [allLabelOptions, setAllLabelOptions] = useState([]);
    const [hoveredLabelId, setHoveredLabelId] = useState(null);
    const [resizeEdge, setResizeEdge] = useState(null);
    const [hoverSample, setHoverSample] = useState(null);

    const [contextMenu, setContextMenu] = useState({
        visible: false,
        x: 0,
        y: 0,
        type: null,
        targetLabel: null
    });

    const [isCreatingNewLabel, setIsCreatingNewLabel] = useState(false);
    const [isEditingPersisted, setIsEditingPersisted] = useState(false);
    const [isCreatingNewLabelPersisted, setIsCreatingNewLabelPersisted] = useState(false);

    const MARGIN = { top: 20, right: 20, bottom: 50, left: 60 };

    const dispatchAnnotationsUpdated = useCallback((next) => {
        try {
            const persisted = (next || labels || [])
                .filter(l => !(l.state === 'pending' || (l.name || '').toLowerCase() === 'pending'))
                .map(l => ({
                    annotationId: l.annotationId,
                    startTimeMs: Number(l.startTimeMs),
                    endTimeMs: Number(l.endTimeMs),
                    labelName: l.labelName || l.name || (l.label?.name) || 'Unknown',
                    note: l.note ?? null,
                    label: l.label ?? null
                }));
            const evt = new CustomEvent('annotations-updated', {
                detail: { channelId, annotations: persisted }
            });
            window.dispatchEvent(evt);
        } catch (_) {}
    }, [labels, channelId]);

    const buildLabelOptions = useCallback((raw) => {
        const options = (raw || [])
            .filter(l => l.name && l.name.trim() && l.name.toLowerCase() !== 'pending')
            .map(l => ({ value: l.name.trim(), label: l.name.trim() }));
        const unique = options.filter((opt, idx, arr) =>
            arr.findIndex(o => o.value.toLowerCase() === opt.value.toLowerCase()) === idx
        );
        if (!unique.some(o => o.value.toLowerCase() === 'unknown')) {
            unique.unshift({ value: 'Unknown', label: 'Unknown' });
        }
        return unique;
    }, []);

    const refreshLabelCatalog = useCallback(async () => {
        try {
            const latest = await fetchGetAllLabels();
            setAllLabelOptions(buildLabelOptions(latest));
        } catch (e) {
            console.error('Failed to refresh label catalog:', e);
        }
    }, [buildLabelOptions]);

    useEffect(() => {
        fetchGetAllLabels().then(ls => {
            setAllLabelOptions(buildLabelOptions(ls));
        });
    }, [buildLabelOptions]);

    const effectiveDurationMs = useMemo(() => {
        if (durationMs != null) return durationMs;
        if (!samples || samples.length === 0) return 1000;
        return samples[samples.length - 1].time;
    }, [durationMs, samples]);

    const dataRange = useMemo(() => {
        if (!samples || samples.length === 0) return { min: -1, max: 1 };
        const values = samples.map(s => s.value).filter(v => typeof v === 'number');
        const min = Math.min(...values);
        const max = Math.max(...values);
        const padding = (max - min) * 0.1 || 1;
        return { min: min - padding, max: max + padding };
    }, [samples]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const updateSize = () => {
            const rect = container.getBoundingClientRect();
            setDimensions({ width: rect.width, height: rect.height });
        };
        updateSize();
        const observer = new ResizeObserver(updateSize);
        observer.observe(container);
        return () => observer.disconnect();
    }, []);

    const chartWidth = dimensions.width - MARGIN.left - MARGIN.right;
    const chartHeight = dimensions.height - MARGIN.top - MARGIN.bottom;

    const clampedViewport = useMemo(() => ({
        startMs: viewport.startMs,
        endMs: Math.min(viewport.endMs, effectiveDurationMs)
    }), [viewport, effectiveDurationMs]);

    const timeToX = useCallback((time) => {
        const range = clampedViewport.endMs - clampedViewport.startMs;
        return MARGIN.left + ((time - clampedViewport.startMs) / range) * chartWidth;
    }, [clampedViewport, chartWidth]);

    const xToTime = useCallback((x) => {
        const range = clampedViewport.endMs - clampedViewport.startMs;
        return clampedViewport.startMs + ((x - MARGIN.left) / chartWidth) * range;
    }, [clampedViewport, chartWidth]);

    const valueToY = useCallback((value) => {
        const range = dataRange.max - dataRange.min;
        return MARGIN.top + chartHeight - ((value - dataRange.min) / range) * chartHeight;
    }, [dataRange, chartHeight]);

    const getColorScheme = useCallback((label, hovered) => {
        const baseName = (label.name || '').trim().toLowerCase();
        const pending = label.state === 'pending' || baseName === 'pending';
        if (pending) {
            return {
                fill: hovered ? 'rgba(50,50,50,0.30)' : 'rgba(50,50,50,0.25)',
                stroke: hovered ? 'rgba(0,0,0,0.95)' : 'rgba(0,0,0,0.85)',
                line: 'rgba(0,0,0,0.85)'
            };
        }
        if (baseName === 'unknown') {
            return {
                fill: hovered ? 'rgba(0,100,255,0.40)' : 'rgba(0,100,255,0.30)',
                stroke: hovered ? 'rgba(0,80,200,1.0)' : 'rgba(0,80,200,0.9)',
                line: 'rgba(0,80,200,0.95)'
            };
        }
        return {
            fill: hovered ? 'rgba(255,50,50,0.40)' : 'rgba(255,50,50,0.30)',
            stroke: hovered ? 'rgba(200,0,0,1.0)' : 'rgba(200,0,0,0.9)',
            line: 'rgba(200,0,0,0.95)'
        };
    }, []);

    const findLabelAtTime = useCallback((timeMs) => {
        for (let i = labels.length - 1; i >= 0; i--) {
            const l = labels[i];
            if (timeMs >= l.startTimeMs && timeMs <= l.endTimeMs) return l;
        }
        return null;
    }, [labels]);

    const findLabelEdgeAtTime = useCallback((timeMs, tolerance = 5) => {
        const toleranceMs = tolerance * (clampedViewport.endMs - clampedViewport.startMs) / chartWidth;
        for (let i = labels.length - 1; i >= 0; i--) {
            const l = labels[i];
            if (l.state === 'pending' || (l.name || '').toLowerCase() === 'pending') continue;
            if (Math.abs(timeMs - l.startTimeMs) < toleranceMs) {
                return { label: l, edge: 'left' };
            }
            if (Math.abs(timeMs - l.endTimeMs) < toleranceMs) {
                return { label: l, edge: 'right' };
            }
        }
        return null;
    }, [labels, clampedViewport, chartWidth]);

    const findNearestSample = useCallback((targetTime) => {
        if (!samples || samples.length === 0) return null;
        let lo = 0;
        let hi = samples.length - 1;
        while (lo < hi) {
            const mid = Math.floor((lo + hi) / 2);
            if (samples[mid].time === targetTime) {
                lo = hi = mid;
                break;
            }
            if (samples[mid].time < targetTime) {
                lo = mid + 1;
            } else {
                hi = mid;
            }
        }
        let idx = lo;
        const prevIdx = Math.max(0, idx - 1);
        const distCurr = Math.abs(samples[idx].time - targetTime);
        const distPrev = Math.abs(samples[prevIdx].time - targetTime);
        if (distPrev < distCurr) idx = prevIdx;
        return samples[idx];
    }, [samples]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        canvas.width = dimensions.width * dpr;
        canvas.height = dimensions.height * dpr;
        canvas.style.width = `${dimensions.width}px`;
        canvas.style.height = `${dimensions.height}px`;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, dimensions.width, dimensions.height);

        labels.forEach(label => {
            const isHovered = hoveredLabelId === label.annotationId;
            const inView = !(label.endTimeMs < clampedViewport.startMs || label.startTimeMs > clampedViewport.endMs);
            if (!inView) return;
            const baseName = (label.name || '').trim().toLowerCase();
            const isPending = label.state === 'pending' || baseName === 'pending';
            if (!isPending && !isHovered) return;
            const x1 = Math.max(timeToX(label.startTimeMs), MARGIN.left);
            const x2 = Math.min(timeToX(label.endTimeMs), MARGIN.left + chartWidth);
            if (x2 <= x1) return;
            const scheme = getColorScheme(label, isHovered);
            ctx.fillStyle = scheme.fill;
            ctx.fillRect(x1, MARGIN.top, x2 - x1, chartHeight);
            ctx.strokeStyle = scheme.stroke;
            ctx.lineWidth = isHovered ? 3 : 2;
            ctx.strokeRect(x1, MARGIN.top, x2 - x1, chartHeight);

            if (isPending || isHovered) {
                ctx.fillStyle = scheme.stroke;
                ctx.font = isHovered ? 'bold 13px sans-serif' : 'bold 11px sans-serif';
                ctx.fillText(label.name || 'Pending', x1 + 5, MARGIN.top + 15);
            }
        });

        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        const timeStep = (clampedViewport.endMs - clampedViewport.startMs) / 10;
        for (let i = 0; i <= 10; i++) {
            const t = clampedViewport.startMs + i * timeStep;
            const x = timeToX(t);
            ctx.beginPath();
            ctx.moveTo(x, MARGIN.top);
            ctx.lineTo(x, MARGIN.top + chartHeight);
            ctx.stroke();
        }
        const valueStep = (dataRange.max - dataRange.min) / 10;
        for (let i = 0; i <= 10; i++) {
            const v = dataRange.min + i * valueStep;
            const y = valueToY(v);
            ctx.beginPath();
            ctx.moveTo(MARGIN.left, y);
            ctx.lineTo(MARGIN.left + chartWidth, y);
            ctx.stroke();
        }

        drawWaveform(ctx, samples)

        if (dragState.active) {
            const s = Math.min(dragState.startTime, dragState.endTime);
            const e = Math.max(dragState.startTime, dragState.endTime);
            const x1 = timeToX(s);
            const x2 = timeToX(e);
            ctx.strokeStyle = 'rgba(100,100,100,0.6)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(x1, MARGIN.top, x2 - x1, chartHeight);
            ctx.setLineDash([]);
        }

        if (hoverSample) {
            ctx.save();
            ctx.strokeStyle = 'rgba(30,30,30,0.6)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.moveTo(hoverSample.canvasX, MARGIN.top);
            ctx.lineTo(hoverSample.canvasX, MARGIN.top + chartHeight);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#ff8800';
            ctx.beginPath();
            ctx.arc(hoverSample.canvasX, hoverSample.canvasY, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#cc6600';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
        }

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(MARGIN.left, MARGIN.top);
        ctx.lineTo(MARGIN.left, MARGIN.top + chartHeight);
        ctx.lineTo(MARGIN.left + chartWidth, MARGIN.top + chartHeight);
        ctx.stroke();
        ctx.fillStyle = '#000';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        for (let i = 0; i <= 10; i++) {
            const t = clampedViewport.startMs + i * timeStep;
            const x = timeToX(t);
            ctx.fillText(t.toFixed(0), x, MARGIN.top + chartHeight + 20);
        }
        ctx.font = '12px sans-serif';
        ctx.fillText(
            `Time (ms)${samplingRateHz ? ` @ ${samplingRateHz} Hz` : ''}`,
            MARGIN.left + chartWidth / 2,
            dimensions.height - 10
        );
        ctx.textAlign = 'right';
        ctx.font = '11px sans-serif';
        for (let i = 0; i <= 10; i++) {
            const v = dataRange.min + i * valueStep;
            const y = valueToY(v);
            ctx.fillText(v.toFixed(2), MARGIN.left - 10, y + 4);
        }
        ctx.save();
        ctx.translate(15, MARGIN.top + chartHeight / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Sample (µV)', 0, 0);
        ctx.restore();
    }, [
        dimensions, samples, clampedViewport, dataRange, labels, dragState,
        timeToX, valueToY, chartWidth, chartHeight, samplingRateHz,
        hoveredLabelId, findLabelAtTime, getColorScheme, hoverSample
    ]);

    const drawWaveform = (ctx, samples) => {
        if (!samples || samples.length === 0) return;
        let prevX = null;
        let prevY = null;
        let currentColor = null;
        let currentWidth = 1.5;
        let pathStarted = false;
        const flushSegment = () => {
            if (!pathStarted) return;
            ctx.stroke();
            pathStarted = false;
        };
        for (let i = 0; i < samples.length; i++) {
            const s = samples[i];
            if (s.time < clampedViewport.startMs || s.time > clampedViewport.endMs) continue;
            const x = timeToX(s.time);
            const y = valueToY(s.value);
            const label = findLabelAtTime(s.time);
            const scheme = label ? getColorScheme(label, hoveredLabelId === label.annotationId) : null;
            const nextColor = scheme ? scheme.line : '#000';
            const nextWidth = scheme ? 2.0 : 1.25;
            const styleChanged = nextColor !== currentColor || nextWidth !== currentWidth;
            if (styleChanged) {
                flushSegment();
                currentColor = nextColor;
                currentWidth = nextWidth;
                ctx.strokeStyle = currentColor;
                ctx.lineWidth = currentWidth;
                ctx.beginPath();
                pathStarted = true;
                if (prevX != null && prevY != null) {
                    ctx.moveTo(prevX, prevY);
                    ctx.lineTo(x, y);
                } else {
                    ctx.moveTo(x, y);
                }
            } else {
                if (!pathStarted) {
                    ctx.strokeStyle = currentColor;
                    ctx.lineWidth = currentWidth;
                    ctx.beginPath();
                    pathStarted = true;
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }

            prevX = x;
            prevY = y;
        }
        flushSegment();
    };


    const handleMouseDown = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (x < MARGIN.left || x > MARGIN.left + chartWidth ||
            y < MARGIN.top || y > MARGIN.top + chartHeight) {
            return;
        }
        const time = xToTime(x);
        const edgeInfo = findLabelEdgeAtTime(time);
        if (edgeInfo) {
            setResizeState({
                active: true,
                label: edgeInfo.label,
                edge: edgeInfo.edge,
                originalStart: edgeInfo.label.startTimeMs,
                originalEnd: edgeInfo.label.endTimeMs
            });
            return;
        }
        if (e.ctrlKey || e.metaKey) {
            setPanState({
                active: true,
                startX: x,
                startViewport: { ...viewport }
            });
        } else {
            const hit = findLabelAtTime(time);
            const isPending = hit && (hit.state === 'pending' || (hit.name || '').trim().toLowerCase() === 'pending');
            if (hit && !isPending) {
                const id = hit.annotationId ?? hit.id;
                if (id != null) {
                    setHoveredLabelId(hit.annotationId);
                    try {
                        const evt = new CustomEvent('annotation-select', { detail: { id } });
                        window.dispatchEvent(evt);
                    } catch (_) {}
                }
                return;
            }
            setDragState({
                active: true,
                startTime: time,
                endTime: time
            });
        }
    };

    const handleMouseMove = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (contextMenu.visible) {
            const menuElement = document.getElementById('label-context-menu');
            if (menuElement) {
                const menuRect = menuElement.getBoundingClientRect();
                const isOverMenu = (
                    e.clientX >= menuRect.left &&
                    e.clientX <= menuRect.right &&
                    e.clientY >= menuRect.top &&
                    e.clientY <= menuRect.bottom
                );
                if (isOverMenu) {
                    if (hoveredLabelId !== null) setHoveredLabelId(null);
                    setHoverSample(null);
                    return;
                }
            }
        }

        const time = xToTime(x);
        if (x >= MARGIN.left && x <= MARGIN.left + chartWidth &&
            y >= MARGIN.top && y <= MARGIN.top + chartHeight &&
            !panState.active && !resizeState.active) {
            const nearest = findNearestSample(time);
            if (nearest) {
                setHoverSample({
                    timeMs: nearest.time,
                    value: nearest.value,
                    canvasX: timeToX(nearest.time),
                    canvasY: valueToY(nearest.value)
                });
            } else {
                setHoverSample(null);
            }
        } else {
            setHoverSample(null);
        }

        if (resizeState.active) {
            const newTime = Math.max(0, Math.min(xToTime(x), effectiveDurationMs));
            setLabels(prev => prev.map(l => {
                if (l.annotationId !== resizeState.label.annotationId) return l;
                if (resizeState.edge === 'left') {
                    const maxStart = resizeState.originalEnd - effectiveMinResizeMs;
                    const newStart = Math.min(newTime, maxStart);
                    return { ...l, startTimeMs: newStart };
                } else {
                    const minEnd = resizeState.originalStart + effectiveMinResizeMs;
                    const newEnd = Math.max(newTime, minEnd);
                    return { ...l, endTimeMs: newEnd };
                }
            }));
            return;
        }
        if (x >= MARGIN.left && x <= MARGIN.left + chartWidth &&
            y >= MARGIN.top && y <= MARGIN.top + chartHeight) {
            if (e.ctrlKey || e.metaKey) {
                if (hoveredLabelId !== null) setHoveredLabelId(null);
                setResizeEdge(null);
            } else {
                const edgeInfo = findLabelEdgeAtTime(time);
                if (edgeInfo) {
                    setResizeEdge(edgeInfo.edge);
                    setHoveredLabelId(edgeInfo.label.annotationId);
                } else {
                    setResizeEdge(null);
                    const hit = findLabelAtTime(time);
                    const newHoverId = hit ? hit.annotationId : null;
                    if (newHoverId !== hoveredLabelId) setHoveredLabelId(newHoverId);
                }
            }
        } else {
            if (hoveredLabelId !== null) setHoveredLabelId(null);
            setResizeEdge(null);
        }

        if (dragState.active) {
            setDragState(prev => ({ ...prev, endTime: time }));
        } else if (panState.active) {
            const dx = x - panState.startX;
            const timeRange = viewport.endMs - viewport.startMs;
            const timeShift = -(dx / chartWidth) * timeRange;
            let newStart = panState.startViewport.startMs + timeShift;
            let newEnd = panState.startViewport.endMs + timeShift;
            if (newStart < 0) {
                newEnd = newEnd - newStart;
                newStart = 0;
            }
            if (newEnd > effectiveDurationMs) {
                newStart = newStart - (newEnd - effectiveDurationMs);
                newEnd = effectiveDurationMs;
            }
            onViewportChange({ startMs: newStart, endMs: newEnd });
        }
    };

    const handleMouseUp = async () => {
        if (resizeState.active) {
            const resizedLabel = labels.find(l => l.annotationId === resizeState.label.annotationId);
            if (resizedLabel) {
                const newStart = resizedLabel.startTimeMs;
                const newEnd = resizedLabel.endTimeMs;
                if (newStart !== resizeState.originalStart || newEnd !== resizeState.originalEnd) {
                    const hasOverlap = labels.some(l => {
                        if (l.annotationId === resizedLabel.annotationId) return false;
                        if (l.state === 'pending' || (l.name || '').toLowerCase() === 'pending') return false;
                        return l.endTimeMs > newStart && l.startTimeMs < newEnd;
                    });
                    if (hasOverlap) {
                        setLabels(prev => prev.map(l =>
                            l.annotationId === resizeState.label.annotationId
                                ? { ...l, startTimeMs: resizeState.originalStart, endTimeMs: resizeState.originalEnd }
                                : l
                        ));
                    } else {
                        try {
                            await fetchUpdateAnnotation(resizedLabel.annotationId, {
                                channelId: channelId,
                                startTimeMs: newStart,
                                endTimeMs: newEnd
                            });
                            // Notify others
                            dispatchAnnotationsUpdated(labels.map(l =>
                                l.annotationId === resizedLabel.annotationId
                                    ? { ...l, startTimeMs: newStart, endTimeMs: newEnd }
                                    : l
                            ));
                        } catch (err) {
                            console.error('Failed to update label time range:', err);
                            setLabels(prev => prev.map(l =>
                                l.annotationId === resizeState.label.annotationId
                                    ? { ...l, startTimeMs: resizeState.originalStart, endTimeMs: resizeState.originalEnd }
                                    : l
                            ));
                        }
                    }
                }
            }
            setResizeState({ active: false, label: null, edge: null, originalStart: null, originalEnd: null });
            return;
        }

        if (dragState.active) {
            let s = Math.min(dragState.startTime, dragState.endTime);
            let e = Math.max(dragState.startTime, dragState.endTime);
            let width = e - s;
            if (width <= 0) {
                setDragState({ active: false, startTime: null, endTime: null });
                return;
            }

            const pendingPredicate = (l) => l.state === 'pending' || (l.name || '').toLowerCase() === 'pending';
            const persistedPredicate = (l) => !pendingPredicate(l);
            const overlappingPersisted = labels.filter(l => persistedPredicate(l) && l.endTimeMs > s && l.startTimeMs < e);
            if (overlappingPersisted.length) {
                setDragState({ active: false, startTime: null, endTime: null });
                if (!overlapDialogShownRef.current) {
                    overlapDialogShownRef.current = true;
                    await fetchShowErrorDialog(
                        'Overlap',
                        `Selection ${s.toFixed(2)} - ${e.toFixed(2)} ms overlaps an existing label. Choose a free region.`
                    );
                    overlapDialogShownRef.current = false;
                }
                return;
            } else {
                const overlappingPending = labels.filter(l => pendingPredicate(l) && l.endTimeMs > s && l.startTimeMs < e);
                if (overlappingPending.length) {
                    const mergedStart = Math.min(s, ...overlappingPending.map(l => l.startTimeMs));
                    const mergedEnd = Math.max(e, ...overlappingPending.map(l => l.endTimeMs));
                    setLabels(prev => {
                        const filtered = prev.filter(l => !overlappingPending.includes(l));
                        return [
                            ...filtered,
                            {
                                annotationId: Date.now(),
                                name: 'Pending',
                                startTimeMs: mergedStart,
                                endTimeMs: mergedEnd,
                                state: 'pending'
                            }
                        ];
                    });
                } else {
                    setLabels(prev => [
                        ...prev,
                        {
                            annotationId: Date.now(),
                            name: 'Pending',
                            startTimeMs: s,
                            endTimeMs: e,
                            state: 'pending'
                        }
                    ]);
                }
            }
            setDragState({ active: false, startTime: null, endTime: null });
        }

        if (panState.active) {
            setPanState({ active: false, startX: null, startViewport: null });
        }
    };

    const handleMouseLeave = () => {
        setHoveredLabelId(null);
        setHoverSample(null);
        handleMouseUp();
    };

    const handleWheel = (e) => {
        e.preventDefault();
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        if (x < MARGIN.left || x > MARGIN.left + chartWidth) return;
        const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
        const mouseTime = xToTime(x);
        const newRange = (viewport.endMs - viewport.startMs) * zoomFactor;
        const mouseRatio = (mouseTime - viewport.startMs) / (viewport.endMs - viewport.startMs);
        let newStart = mouseTime - newRange * mouseRatio;
        let newEnd = mouseTime + newRange * (1 - mouseRatio);
        if (newStart < 0) {
            newEnd = newEnd - newStart;
            newStart = 0;
        }
        if (newEnd > effectiveDurationMs) {
            newStart = newStart - (newEnd - effectiveDurationMs);
            newEnd = effectiveDurationMs;
        }
        if (newEnd - newStart < minViewportSpanMs) {
            const mid = (newStart + newEnd) / 2;
            newStart = Math.max(0, mid - minViewportSpanMs / 2);
            newEnd = Math.min(effectiveDurationMs, mid + minViewportSpanMs / 2);
        }
        onViewportChange({ startMs: Math.max(0, newStart), endMs: Math.min(effectiveDurationMs, newEnd) });
    };

    const handleContextMenu = (e) => {
        e.preventDefault();
        refreshLabelCatalog();
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const time = xToTime(x);
        const hits = [];
        for (let i = labels.length - 1; i >= 0; i--) {
            const l = labels[i];
            if (time >= l.startTimeMs && time <= l.endTimeMs) hits.push(l);
        }
        const isPending = (l) => l.state === 'pending' || (l.name || '').trim().toLowerCase() === 'pending';
        const persistedHit = hits.find(l => !isPending(l));
        const pendingHit = hits.find(l => isPending(l));
        if (persistedHit) {
            setContextMenu({
                visible: true,
                x: e.clientX,
                y: e.clientY,
                type: 'persisted',
                targetLabel: persistedHit
            });
            setIsCreatingNewLabel(false);
            setIsEditingPersisted(false);
        } else if (pendingHit) {
            setContextMenu({
                visible: true,
                x: e.clientX,
                y: e.clientY,
                type: 'pending',
                targetLabel: pendingHit
            });
            setIsCreatingNewLabel(false);
            setIsEditingPersisted(false);
        } else {
            setContextMenu({ visible: false, x: 0, y: 0, type: null, targetLabel: null });
            setIsCreatingNewLabel(false);
            setIsEditingPersisted(false);
        }
    };

    const handleSelectLabel = async (option) => {
        const label = contextMenu.targetLabel;
        if (!label) return;
        const newName = option.value;
        let savedLabel = label;
        try {
            if (newName !== 'Pending') {
                const labelDto = {
                    channelId,
                    startTime: label.startTimeMs,
                    endTime: label.endTimeMs,
                    name: newName
                };
                savedLabel = await fetchCreateLabel(labelDto);
            }
            setLabels(prev => {
                const next = prev.map(l =>
                    l.annotationId === label.annotationId
                        ? { ...l, name: newName, labelName: savedLabel?.labelName || newName, ...savedLabel, state: 'persisted' }
                        : l
                );
                // Notify others with new persisted list
                dispatchAnnotationsUpdated(next);
                return next;
            });
        } catch (err) {
            console.error('Create label failed, removing pending selection:', err);
            setLabels(prev => prev.filter(l => l.annotationId !== label.annotationId));
        } finally {
            setContextMenu({ visible: false, x: 0, y: 0, type: null, targetLabel: null });
            setIsCreatingNewLabel(false);
        }
    };

    const handlePersistedEditChoose = async (option) => {
        const label = contextMenu.targetLabel;
        if (!label) return;
        const newName = option.value;
        try {
            const updated = await fetchUpdateAnnotation(label.annotationId, { labelName: newName });
            if (updated) {
                setLabels(prev => {
                    const next = prev.map(l =>
                        l.annotationId === label.annotationId
                            ? { ...l, name: updated.labelName, labelName: updated.labelName, labelId: updated.labelId }
                            : l
                    );
                    dispatchAnnotationsUpdated(next);
                    return next;
                });
            }
        } catch (err) {
            console.error('Update annotation failed:', err);
            await fetchShowErrorDialog('Update Failed', `Failed to update annotation: ${err.message || err}`);
        } finally {
            setContextMenu({ visible: false, x: 0, y: 0, type: null, targetLabel: null });
            setIsEditingPersisted(false);
        }
    };

    const handleCreateNewLabelPersisted = async (inputValue) => {
        const label = contextMenu.targetLabel;
        if (!label) return;
        const name = (inputValue || '').trim();
        if (!name) return;
        setIsCreatingNewLabelPersisted(false);
        await handlePersistedEditChoose({ value: name, label: name });
        refreshLabelCatalog();
    };

    const handlePersistedDelete = async () => {
        const label = contextMenu.targetLabel;
        if (!label) return;
        const confirmed = window.confirm(`Delete label "${label.name || 'Unknown'}"?\nRange: ${label.startTimeMs.toFixed(1)} - ${label.endTimeMs.toFixed(1)} ms`);
        if (!confirmed) {
            setContextMenu({ visible: false, x: 0, y: 0, type: null, targetLabel: null });
            return;
        }
        try {
            const success = await fetchDeleteAnnotation(label.annotationId);
            if (success) {
                setLabels(prev => {
                    const next = prev.filter(l => l.annotationId !== label.annotationId);
                    dispatchAnnotationsUpdated(next);
                    return next;
                });
            } else {
                throw new Error('Delete operation returned false');
            }
        } catch (err) {
            console.error('Delete annotation failed:', err);
            await fetchShowErrorDialog('Delete Failed', `Failed to delete annotation: ${err.message || err}`);
        } finally {
            setContextMenu({ visible: false, x: 0, y: 0, type: null, targetLabel: null });
        }
    };

    const handleCreateLabelOption = async (inputValue) => {
        if (!inputValue || typeof inputValue !== 'string' || inputValue.trim() === '') {
            return;
        }
        const trimmed = inputValue.trim();
        const newOption = { value: trimmed, label: trimmed };
        setAllLabelOptions(prev => {
            const exists = prev.some(o => o.value.toLowerCase() === trimmed.toLowerCase());
            if (exists) return prev;
            return [...prev, newOption];
        });

        await handleSelectLabel(newOption);
    };

    const handleCancelContextMenu = () => {
        setContextMenu({ visible: false, x: 0, y: 0, type: null, targetLabel: null });
        setIsCreatingNewLabel(false);
        setIsEditingPersisted(false);
    };

    useEffect(() => {
        if (contextMenu.visible) {
            const handleClick = (e) => {
                const menuElement = document.getElementById('label-context-menu');
                if (menuElement && menuElement.contains(e.target)) {
                    return;
                }
                handleCancelContextMenu();
            };
            document.addEventListener('mousedown', handleClick);
            return () => document.removeEventListener('mousedown', handleClick);
        }
    }, [contextMenu.visible]);

    useEffect(() => {
        const normalized = (existingLabels || []).map(l => ({
            annotationId: l.annotationId,
            startTimeMs: Number(l.startTimeMs),
            endTimeMs: Number(l.endTimeMs),
            name: (l.labelName || l.name || l.label?.name || 'Unknown'),
            note: l.note ?? null,
            state: 'persisted'
        }));
        setLabels(prev => {
            const transient = prev.filter(x => x.state === 'pending' || x.state === 'temporary');
            return [...normalized, ...transient];
        });
    }, [existingLabels]);

    useEffect(() => {
        const handleAnnotationSelect = (e) => {
            const id = e?.detail?.id;
            if (id == null) return;
            const match = labels.find(l => (l.annotationId ?? l.id) === id);
            if (match && match.annotationId != null) setHoveredLabelId(match.annotationId);
        };
        window.addEventListener('annotation-select', handleAnnotationSelect);
        return () => window.removeEventListener('annotation-select', handleAnnotationSelect);
    }, [labels]);


    useEffect(() => {
        const handleAnnotationsUpdated = (e) => {
            const detail = e?.detail;
            if (!detail || detail.channelId !== channelId) return;
            const anns = Array.isArray(detail.annotations) ? detail.annotations : [];
            const normalized = anns.map(a => ({
                annotationId: a.annotationId ?? a.id,
                startTimeMs: Number(a.startTimeMs),
                endTimeMs: Number(a.endTimeMs),
                name: a.labelName || a.name || (a.label?.name) || 'Unknown',
                note: a.note ?? null,
                state: 'persisted'
            }));
            setLabels(prev => {
                const transient = prev.filter(x => x.state === 'pending' || x.state === 'temporary');
                return [...normalized, ...transient];
            });
        };
        window.addEventListener('annotations-updated', handleAnnotationsUpdated);
        return () => window.removeEventListener('annotations-updated', handleAnnotationsUpdated);
    }, [channelId]);

    const autoFitDoneRef = useRef(false);

    useEffect(() => {
        if (!labels || labels.length === 0) return;
        if (autoFitDoneRef.current) return;
        const minStart = Math.min(...labels.map(l => Number(l.startTimeMs) || 0));
        const maxEnd = Math.max(...labels.map(l => Number(l.endTimeMs) || 0));
        if (!isFinite(minStart) || !isFinite(maxEnd) || maxEnd <= minStart) return;
        const pad = Math.max(10, (maxEnd - minStart) * 0.02);
        const fitStart = Math.max(0, minStart - pad);
        const fitEnd = Math.min(effectiveDurationMs, maxEnd + pad);
        const includesAll = viewport.startMs <= fitStart && viewport.endMs >= fitEnd;
        if (!includesAll) {
            onViewportChange({ startMs: fitStart, endMs: fitEnd });
        }
        autoFitDoneRef.current = true;
    }, [labels, effectiveDurationMs, viewport, onViewportChange]);

    const sampleDtMs = useMemo(() => {
        if (!samples || samples.length < 2) return 0;
        const dt = samples[1].time - samples[0].time;
        return (dt > 0 && isFinite(dt)) ? dt : 0;
    }, [samples]);

    const effectiveMinResizeMs = useMemo(() => {
        const v = Number(minLabelDurationMs);
        if (Number.isFinite(v) && v >= 0) return v;
        return 0;
    }, [minLabelDurationMs]);

    const minViewportSpanMs = useMemo(() => {
        const base = effectiveMinResizeMs && effectiveMinResizeMs > 0 ? effectiveMinResizeMs : 0;
        const dt = sampleDtMs && sampleDtMs > 0 ? sampleDtMs : 1;
        return Math.max(base / 2, dt);
    }, [effectiveMinResizeMs, sampleDtMs]);

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                cursor: resizeState.active ? 'ew-resize' :
                    resizeEdge ? 'ew-resize' :
                        dragState.active ? 'crosshair' :
                            panState.active ? 'grabbing' :
                                'default'
            }}
        >
            <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onWheel={handleWheel}
                onContextMenu={handleContextMenu}
                style={{ display: 'block' }}
            />

            {hoverSample && (
                <div
                    style={{
                        position: 'absolute',
                        top: Math.max(MARGIN.top, Math.min(hoverSample.canvasY - 28, dimensions.height - 55)),
                        left: Math.min(Math.max(hoverSample.canvasX + 8, MARGIN.left), dimensions.width - 160),
                        background: 'rgba(0,0,0,0.75)',
                        color: '#fff',
                        padding: '6px 8px',
                        fontSize: '12px',
                        borderRadius: 6,
                        pointerEvents: 'none',
                        lineHeight: 1.3,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                        zIndex: 10,
                        maxWidth: 150
                    }}
                >
                    <div>t: {hoverSample.timeMs.toFixed(2)} ms</div>
                    <div>v: {typeof hoverSample.value === 'number' ? hoverSample.value.toFixed(3) : hoverSample.value}</div>
                </div>
            )}

            {contextMenu.visible && (
                <LabelContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    type={contextMenu.type}
                    allLabelOptions={allLabelOptions}
                    isCreatingNewLabel={contextMenu.type === 'pending' ? isCreatingNewLabel : false}
                    isEditingPersisted={contextMenu.type === 'persisted' ? isEditingPersisted : false}
                    isCreatingNewLabelPersisted={contextMenu.type === 'persisted' ? isCreatingNewLabelPersisted : false}
                    onSelectLabel={handleSelectLabel}
                    onAddNewLabelClick={(val) => setIsCreatingNewLabel(val !== false)}
                    onCancelPendingClick={() => {
                        const pending = contextMenu.targetLabel;
                        if (pending) {
                            setLabels(prev => prev.filter(l => l.annotationId !== pending.annotationId));
                        }
                        setContextMenu({ visible: false, x: 0, y: 0, type: null, targetLabel: null });
                    }}
                    onCreateNewLabelInputSubmit={(value) => handleCreateLabelOption(value)}
                    onEditPersistedClick={() => setIsEditingPersisted(true)}
                    onDeletePersistedClick={handlePersistedDelete}
                    onBackPersistedClick={() => { setIsEditingPersisted(false); setIsCreatingNewLabelPersisted(false); }}
                    onChoosePersistedLabel={handlePersistedEditChoose}
                    onCreateNewPersistedLabelClick={() => setIsCreatingNewLabelPersisted(true)}
                    onCreateNewPersistedLabelSubmit={(value) => handleCreateNewLabelPersisted(value)}
                />
            )}
        </div>
    );
}


