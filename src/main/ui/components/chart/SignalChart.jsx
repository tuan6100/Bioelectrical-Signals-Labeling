import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {fetchCreateAnnotation, fetchDeleteAnnotation, fetchGetAllLabels, fetchUpdateAnnotation} from '../../api';
import './SignalChart.css';
import LabelContextMenu from './LabelContextMenu.jsx';
import {NavControl} from "../control/NavControl.jsx";
import {makeSound} from "../../hooks/useSound.js";
import {getBaseColor} from "../../hooks/useLabelColor.js";

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
    const [dimensions, setDimensions] = useState({ width: 800, height: 400 });

    const [dragState, setDragState] = useState({ active: false, startTime: null, endTime: null });
    const [panState, setPanState] = useState({ active: false, startX: null, startViewport: null });
    const [resizeState, setResizeState] = useState({ active: false, label: null, edge: null, originalStart: null, originalEnd: null });

    const interactionStateRef = useRef({ isResizing: false, isPanning: false, isDragging: false });

    const [labels, setLabels] = useState([]);
    const [allLabelOptions, setAllLabelOptions] = useState([]);
    const [hoveredLabelId, setHoveredLabelId] = useState(null);
    const [resizeEdge, setResizeEdge] = useState(null);
    const [hoverSample, setHoverSample] = useState(null);

    const topScrollRef = useRef(null);
    const topInnerRef = useRef(null);
    const programmaticScrollRef = useRef(false);
    const scrollRafRef = useRef(null);

    const [manualYMax, setManualYMax] = useState(null);
    const [verticalOffset, setVerticalOffset] = useState(0);

    const VOLTAGE_LEVELS = useMemo(() => [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000], []);

    const [contextMenu, setContextMenu] = useState({
        visible: false,
        x: 0,
        y: 0,
        type: null,
        targetLabel: null,
        isNewlyCreated: false
    });

    const [isEditingPersisted, setIsEditingPersisted] = useState(false);

    const MARGIN = { top: 20, right: 20, bottom: 80, left: 60 };

    const msPerPixelRef = useRef(0);
    const prevChartWidthRef = useRef(0);

    const chartWidth = dimensions.width - MARGIN.left - MARGIN.right;
    const chartHeight = dimensions.height - MARGIN.top - MARGIN.bottom;
    const latestViewportRef = useRef(viewport);
    useEffect(() => { latestViewportRef.current = viewport; }, [viewport]);
    const latestEffectiveDurationMsRef = useRef(0);
    const autoPanRafRef = useRef(null);
    const autoPanDirRef = useRef(0);
    const autoPanIntensityRef = useRef(0);
    const autoPanLastTsRef = useRef(0);

    const dragStartCanvasXRef = useRef(null);
    const dragStartTimeRef = useRef(null);
    const resizeStartCanvasXRef = useRef(null);

    const EDGE_PAN_ZONE_PX = 40;
    const MAX_PAN_MS_PER_SEC = 1200;

    const stopAutoPan = useCallback(() => {
        if (autoPanRafRef.current != null) {
            cancelAnimationFrame(autoPanRafRef.current);
            autoPanRafRef.current = null;
        }
        autoPanDirRef.current = 0;
        autoPanIntensityRef.current = 0;
        autoPanLastTsRef.current = 0;
    }, []);

    const computeEdgePan = useCallback((canvasX) => {
        const leftEdge = MARGIN.left;
        const rightEdge = MARGIN.left + chartWidth;
        if (chartWidth <= 0) return { dir: 0, intensity: 0 };
        const distLeft = canvasX - leftEdge;
        if (distLeft < EDGE_PAN_ZONE_PX) {
            const intensity = Math.max(0, (EDGE_PAN_ZONE_PX - distLeft) / EDGE_PAN_ZONE_PX);
            return {
                dir: -1,
                intensity: Math.min(1, intensity)
            };
        }
        const distRight = rightEdge - canvasX;
        if (distRight < EDGE_PAN_ZONE_PX) {
            const intensity = Math.max(0, (EDGE_PAN_ZONE_PX - distRight) / EDGE_PAN_ZONE_PX);
            return {
                dir: 1,
                intensity: Math.min(1, intensity)
            };
        }
        return { dir: 0, intensity: 0 };
    }, [MARGIN.left, chartWidth]);

    const startAutoPan = useCallback(() => {
        if (autoPanRafRef.current != null) return;
        const step = (ts) => {
            const isDragging = interactionStateRef.current.isDragging;
            const isResizing = interactionStateRef.current.isResizing;
            const dir = autoPanDirRef.current;
            const intensity = autoPanIntensityRef.current;
            if ((!isDragging && !isResizing) || dir === 0 || intensity <= 0 || !onViewportChange) {
                stopAutoPan();
                return;
            }

            const prevTs = autoPanLastTsRef.current || ts;
            const dtSec = Math.max(0, (ts - prevTs) / 1000);
            autoPanLastTsRef.current = ts;

            const vp = latestViewportRef.current;
            const span = Math.max(1, (vp.endMs - vp.startMs));
            const effectiveDurationMs = Number(latestEffectiveDurationMsRef.current) || 0;
            const maxStart = Math.max(0, effectiveDurationMs - span);
            const deltaMs = dir * intensity * MAX_PAN_MS_PER_SEC * dtSec;
            let newStart = vp.startMs + deltaMs;
            newStart = Math.max(0, Math.min(maxStart, newStart));
            const newEnd = newStart + span;
            if (chartWidth > 0) msPerPixelRef.current = span / chartWidth;
            onViewportChange({ startMs: newStart, endMs: newEnd });
            autoPanRafRef.current = requestAnimationFrame(step);
        };

        autoPanRafRef.current = requestAnimationFrame(step);
    }, [chartWidth, onViewportChange, stopAutoPan]);


    useEffect(() => {
        if (chartWidth <= 0) return;
        if (Math.abs(chartWidth - prevChartWidthRef.current) < 2) {
            const range = viewport.endMs - viewport.startMs;
            if (range > 0) { msPerPixelRef.current = range / chartWidth; }
        }
    }, [viewport.startMs, viewport.endMs, chartWidth]);

    useEffect(() => {
        if (chartWidth <= 0) return;
        if (Math.abs(chartWidth - prevChartWidthRef.current) >= 2) {
            if (msPerPixelRef.current > 0) {
                const newRange = msPerPixelRef.current * chartWidth;
                if (onViewportChange) {
                    onViewportChange({ startMs: viewport.startMs, endMs: viewport.startMs + newRange });
                }
            }
        }
        prevChartWidthRef.current = chartWidth;
    }, [chartWidth, viewport.startMs, onViewportChange]);

    const dispatchAnnotationsUpdated = useCallback((next) => {
        setTimeout(() => {
            try {
                const persisted = (next || labels || [])
                    .map(l => ({ annotationId: l.annotationId, startTimeMs: Number(l.startTimeMs), endTimeMs: Number(l.endTimeMs), labelName: l.labelName || l.name || (l.label?.name) || 'Unknown', note: l.note ?? null, label: l.label ?? null }));
                const evt = new CustomEvent('annotations-updated', { detail: { channelId, annotations: persisted } });
                window.dispatchEvent(evt);
            } catch (_) {}
        }, 0);
    }, [labels, channelId]);

    const buildLabelOptions = useCallback((raw) => {
        const options = (raw || []).map(l => ({ value: l.name.trim(), label: l.name.trim() }));
        const unique = options.filter((opt, idx, arr) => arr.findIndex(o => o.value.toLowerCase() === opt.value.toLowerCase()) === idx);
        if (!unique.some(o => o.value.toLowerCase() === 'unknown')) { unique.unshift({ value: 'Unknown', label: 'Unknown' }); }
        return unique;
    }, []);

    const refreshLabelCatalog = useCallback(async () => {
        try { const latest = await fetchGetAllLabels(); setAllLabelOptions(buildLabelOptions(latest)); } catch (e) { console.error('Failed to refresh label catalog:', e); }
    }, [buildLabelOptions]);

    useEffect(() => { fetchGetAllLabels().then(ls => { setAllLabelOptions(buildLabelOptions(ls)); }); }, [buildLabelOptions]);

    const effectiveDurationMs = useMemo(() => {
        if (durationMs != null) return durationMs;
        if (!samples || samples.length === 0) return 1000;
        return samples[samples.length - 1].time;
    }, [durationMs, samples]);

    useEffect(() => {
        latestEffectiveDurationMsRef.current = effectiveDurationMs;
    }, [effectiveDurationMs]);

    const renderViewport = useMemo(() => {
        return {
            startMs: Math.max(0, viewport.startMs),
            endMs: Math.min(effectiveDurationMs, Math.max(viewport.startMs + 1, viewport.endMs))
        };
    }, [viewport, effectiveDurationMs]);

    const dataRange = useMemo(() => {
        let maxAbsValue = 0;
        if (samples && samples.length > 0) {
            for (let i = 0; i < samples.length; i++) {
                const v = Math.abs(samples[i].value || 0);
                if (v > maxAbsValue) maxAbsValue = v;
            }
        }
        if (maxAbsValue > 10000) maxAbsValue = 10000;
        if (maxAbsValue === 0) maxAbsValue = 100;
        let displayMax;
        if (manualYMax !== null) {
            displayMax = manualYMax;
        } else {
            displayMax = VOLTAGE_LEVELS.find(v => v >= maxAbsValue) || 10000;
        }
        return {
            min: -displayMax,
            max: displayMax,
            step: displayMax
        };
    }, [samples, manualYMax, VOLTAGE_LEVELS]);

    const handleZoomYIn = useCallback(() => {
        const currentMax = dataRange.max;
        const currentIndex = VOLTAGE_LEVELS.indexOf(currentMax);
        if (currentIndex > 0) {
            setManualYMax(VOLTAGE_LEVELS[currentIndex - 1]);
        } else if (currentIndex === -1) {
            const lower = [...VOLTAGE_LEVELS].reverse().find(v => v < currentMax);
            if (lower) setManualYMax(lower);
        }
    }, [dataRange.max, VOLTAGE_LEVELS]);

    const handleZoomYOut = useCallback(() => {
        const currentMax = dataRange.max;
        const currentIndex = VOLTAGE_LEVELS.indexOf(currentMax);
        if (currentIndex !== -1 && currentIndex < VOLTAGE_LEVELS.length - 1) {
            setManualYMax(VOLTAGE_LEVELS[currentIndex + 1]);
        } else if (currentIndex === -1) {
            const higher = VOLTAGE_LEVELS.find(v => v > currentMax);
            if (higher) setManualYMax(higher);
        }
    }, [dataRange.max, VOLTAGE_LEVELS]);

    const handleZoomXIn = useCallback(() => {

        const currentRange = renderViewport.endMs - renderViewport.startMs;
        const newRange = currentRange * 0.8;
        const center = (renderViewport.startMs + renderViewport.endMs) / 2;
        let newStart = center - newRange / 2;
        let newEnd = center + newRange / 2;
        if (newStart < 0) { newEnd -= newStart; newStart = 0; }
        if (newEnd > effectiveDurationMs) {
            newStart -= (newEnd - effectiveDurationMs);
            newEnd = effectiveDurationMs;
        }
        onViewportChange({ startMs: newStart, endMs: newEnd });
    }, [renderViewport, effectiveDurationMs, onViewportChange]);

    const handleZoomXOut = useCallback(() => {
        const currentRange = renderViewport.endMs - renderViewport.startMs;
        let newRange = currentRange * 1.25;
        if (newRange > effectiveDurationMs) newRange = effectiveDurationMs;
        const center = (renderViewport.startMs + renderViewport.endMs) / 2;
        let newStart = center - newRange / 2;
        let newEnd = center + newRange / 2;
        if (newStart < 0) { newEnd -= newStart; newStart = 0; }
        if (newEnd > effectiveDurationMs) { newStart -= (newEnd - effectiveDurationMs); newEnd = effectiveDurationMs; }
        onViewportChange({ startMs: newStart, endMs: newEnd });
    }, [renderViewport, effectiveDurationMs, onViewportChange]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!e.ctrlKey) return;
            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    handleZoomYIn();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    handleZoomYOut();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    handleZoomXIn();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    handleZoomXOut();
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        handleZoomYIn,
        handleZoomYOut,
        handleZoomXIn,
        handleZoomXOut
    ]);


    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const updateSize = () => {
            const rect = container.getBoundingClientRect();
            setDimensions(prev => {
                if (prev.width === rect.width && prev.height === rect.height) return prev;
                return { width: rect.width, height: rect.height };
            });
        };
        updateSize();
        const observer = new ResizeObserver(updateSize);
        observer.observe(container);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const container = topScrollRef.current;
        const inner = topInnerRef.current;
        if (!container || !inner) return;
        const viewportSpan = Math.max(1, renderViewport.endMs - renderViewport.startMs);
        const containerWidth = Math.max(0, container.clientWidth || 0);
        const innerWidth = Math.max(containerWidth, Math.ceil((effectiveDurationMs / viewportSpan) * containerWidth));
        inner.style.width = `${innerWidth}px`;
        const maxScroll = Math.max(0, inner.scrollWidth - containerWidth);
        const maxStart = Math.max(0, effectiveDurationMs - viewportSpan);
        const proportion = maxStart > 0 ? (viewport.startMs / maxStart) : 0;
        programmaticScrollRef.current = true;
        try {
            container.scrollLeft = Math.round(proportion * maxScroll);
        } finally {
            window.setTimeout(
                () => programmaticScrollRef.current = false ,
                30);
        }
    }, [dimensions.width, effectiveDurationMs, renderViewport.startMs, renderViewport.endMs, viewport.startMs]);

    const handleTopScroll = (e) => {
        if (programmaticScrollRef.current) return;
        if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = requestAnimationFrame(() => {
            const container = topScrollRef.current;
            const inner = topInnerRef.current;
            if (!container || !inner) return;
            const containerWidth = Math.max(0, container.clientWidth || 0);
            const maxScroll = Math.max(0, inner.scrollWidth - containerWidth);
            if (maxScroll <= 0) return;
            const proportion = container.scrollLeft / maxScroll;
            const viewportSpan = Math.max(1, renderViewport.endMs - renderViewport.startMs);
            const maxStart = Math.max(0, effectiveDurationMs - viewportSpan);
            const newStart = proportion * maxStart;
            const newEnd = newStart + viewportSpan;
            onViewportChange({ startMs: newStart, endMs: newEnd });
        });
    };

    const timeToX = useCallback((time) => {
        const range = renderViewport.endMs - renderViewport.startMs;
        if (range <= 0) return MARGIN.left;
        return MARGIN.left + ((time - renderViewport.startMs) / range) * chartWidth;
    }, [renderViewport, chartWidth, MARGIN.left]);

    const xToTime = useCallback((x) => {
        const range = renderViewport.endMs - renderViewport.startMs;
        return renderViewport.startMs + ((x - MARGIN.left) / chartWidth) * range;
    }, [renderViewport, chartWidth, MARGIN.left]);

    const valueToY = useCallback((value) => {
        const range = dataRange.max - dataRange.min;
        const currentMin = dataRange.min + verticalOffset;
        if (range === 0) return MARGIN.top + chartHeight / 2;
        return MARGIN.top + chartHeight - ((value - currentMin) / range) * chartHeight;
    }, [dataRange, chartHeight, MARGIN.top, verticalOffset]);

    const labelsToRender = useMemo(() => {
        if (!hoveredLabelId) return labels;
        const hoveredLabel = labels.find(l => l.annotationId === hoveredLabelId);
        if (!hoveredLabel) return labels;
        return [...labels.filter(l => l.annotationId !== hoveredLabelId), hoveredLabel];
    }, [labels, hoveredLabelId]);

    const findLabelAtTime = useCallback((timeMs) => {
        for (let i = labelsToRender.length - 1; i >= 0; i--) {
            const l = labelsToRender[i];
            if (timeMs >= l.startTimeMs && timeMs <= l.endTimeMs) return l;
        }
        return null;
    }, [labelsToRender]);


    const hexToRgba = useCallback((hex, alpha) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    }, []);

    const getColorScheme = useCallback((label, hovered) => {
        const baseColor = getBaseColor(label.name);
        return {
            fill: hexToRgba(baseColor, hovered ? 0.4 : 0.3),
            stroke: hexToRgba(baseColor, hovered ? 1.0 : 0.9),
            line: hexToRgba(baseColor, 0.95)
        };
    }, [hexToRgba]);

    const findLabelEdgeAtTime = useCallback((timeMs, tolerance = 5) => {
        const toleranceMs = tolerance * (renderViewport.endMs - renderViewport.startMs) / chartWidth;
        for (let i = labels.length - 1; i >= 0; i--) {
            const l = labels[i];
            if (Math.abs(timeMs - l.startTimeMs) < toleranceMs) { return { label: l, edge: 'left' }; }
            if (Math.abs(timeMs - l.endTimeMs) < toleranceMs) { return { label: l, edge: 'right' }; }
        }
        return null;
    }, [labels, renderViewport, chartWidth]);

    const findNearestSample = useCallback((targetTime) => {
        if (!samples || samples.length === 0) return null;
        let lo = 0; let hi = samples.length - 1;
        while (lo < hi) {
            const mid = Math.floor((lo + hi) / 2);
            if (samples[mid].time === targetTime) { lo = hi = mid; break; }
            if (samples[mid].time < targetTime) { lo = mid + 1; } else { hi = mid; }
        }
        let idx = lo; const prevIdx = Math.max(0, idx - 1);
        const distCurr = Math.abs(samples[idx].time - targetTime); const distPrev = Math.abs(samples[prevIdx].time - targetTime);
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

        labelsToRender.forEach(label => {
            const isHovered = hoveredLabelId === label.annotationId;
            const inView = !(label.endTimeMs < renderViewport.startMs || label.startTimeMs > renderViewport.endMs);
            if (!inView) return;
            if (!isHovered) return;
            const x1 = Math.max(timeToX(label.startTimeMs), MARGIN.left);
            const x2 = Math.min(timeToX(label.endTimeMs), MARGIN.left + chartWidth);
            if (x2 <= x1) return;
            const scheme = getColorScheme(label, isHovered);
            ctx.fillStyle = scheme.fill;
            ctx.fillRect(x1, MARGIN.top, x2 - x1, chartHeight);
            ctx.strokeStyle = scheme.stroke;
            ctx.lineWidth = isHovered ? 3 : 2;
            ctx.strokeRect(x1, MARGIN.top, x2 - x1, chartHeight);
            if (isHovered) {
                ctx.fillStyle = scheme.stroke;
                ctx.font = isHovered ? 'bold 13px sans-serif' : 'bold 11px sans-serif';
                ctx.fillText(label.name || 'Pending', x1 + 5, MARGIN.top + 15);
            }
        });

        const GRID_SIZE_X = 80;
        const GRID_SIZE_Y = 60;

        ctx.strokeStyle = '#e8e8e8';
        ctx.lineWidth = 1;
        ctx.save();
        ctx.beginPath();
        ctx.rect(MARGIN.left, MARGIN.top, chartWidth, chartHeight);
        ctx.clip();

        for (let x = MARGIN.left; x <= MARGIN.left + chartWidth; x += GRID_SIZE_X) {
            ctx.beginPath();
            const drawX = Math.floor(x) + 0.5;
            ctx.moveTo(drawX, MARGIN.top);
            ctx.lineTo(drawX, MARGIN.top + chartHeight);
            ctx.stroke();
        }

        const centerY = MARGIN.top + chartHeight / 2;
        for (let y = centerY; y >= MARGIN.top; y -= GRID_SIZE_Y) {
            ctx.beginPath();
            const drawY = Math.floor(y) + 0.5;
            ctx.moveTo(MARGIN.left, drawY);
            ctx.lineTo(MARGIN.left + chartWidth, drawY);
            ctx.stroke();
        }

        for (let y = centerY + GRID_SIZE_Y; y <= MARGIN.top + chartHeight; y += GRID_SIZE_Y) {
            ctx.beginPath();
            const drawY = Math.floor(y) + 0.5;
            ctx.moveTo(MARGIN.left, drawY);
            ctx.lineTo(MARGIN.left + chartWidth, drawY);
            ctx.stroke();
        }

        drawWaveform(ctx, samples);
        ctx.restore();

        // Vẽ các phần đánh dấu phụ (Drag & Hover)
        if (dragState.active) {
            const s = Math.min(dragState.startTime, dragState.endTime);
            const e = Math.max(dragState.startTime, dragState.endTime);
            const x1 = timeToX(s);
            const x2 = timeToX(e);

            ctx.save();
            ctx.strokeStyle = 'rgba(100,100,100,0.6)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(x1, MARGIN.top, x2 - x1, chartHeight);
            ctx.restore();
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
        const timeRange = renderViewport.endMs - renderViewport.startMs;
        const msPerDivX = GRID_SIZE_X * (timeRange / chartWidth);
        for (let x = MARGIN.left; x <= MARGIN.left + chartWidth + 1; x += GRID_SIZE_X) {
            const t = xToTime(x);
            let labelText;
            if (msPerDivX >= 1000) {
                labelText = (t / 1000).toFixed(2) + 's';
            } else if (msPerDivX >= 10) {
                labelText = t.toFixed(0);
            } else {
                labelText = t.toFixed(1);
            }
            ctx.fillText(labelText, x, MARGIN.top + chartHeight + 20);
        }

        const currentDuration = Math.max(1, renderViewport.endMs - renderViewport.startMs);
        const zoomLevel = effectiveDurationMs / currentDuration;
        ctx.font = '12px sans-serif';
        ctx.fillText(
            `Total ${durationMs} ms`,
            MARGIN.left + chartWidth / 2,
            dimensions.height - 10
        );

        // --- VẼ NHÃN TEXT TRỤC Y ---
        ctx.textAlign = 'right';
        ctx.font = '11px sans-serif';

        // Cần quy ngược Pixel màn hình sang giá trị điện áp (Inverse của ValueToY)
        const yToValue = (y) => {
            const range = dataRange.max - dataRange.min;
            const currentMin = dataRange.min + verticalOffset;
            if (chartHeight === 0) return currentMin;
            return currentMin + ((MARGIN.top + chartHeight - y) / chartHeight) * range;
        };

        for (let y = centerY; y >= MARGIN.top - 10; y -= GRID_SIZE_Y) {
            if (y > MARGIN.top + chartHeight + 10) continue;
            const v = yToValue(y);
            ctx.fillText(v.toFixed(0), MARGIN.left - 10, y + 4);
        }

        for (let y = centerY + GRID_SIZE_Y; y <= MARGIN.top + chartHeight + 10; y += GRID_SIZE_Y) {
            const v = yToValue(y);
            ctx.fillText(v.toFixed(0), MARGIN.left - 10, y + 4);
        }

        ctx.save();
        ctx.translate(15, MARGIN.top + chartHeight / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Sample (µV)', 0, 0);
        ctx.restore();

    }, [
        dimensions, samples, renderViewport, dataRange, labelsToRender, dragState,
        timeToX, valueToY, chartWidth, chartHeight, samplingRateHz,
        hoveredLabelId, findLabelAtTime, getColorScheme, hoverSample,
        MARGIN.left, MARGIN.top, durationMs, effectiveDurationMs,
        verticalOffset
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
        const vStart = renderViewport.startMs;
        const vEnd = renderViewport.endMs;

        for (let i = 0; i < samples.length; i++) {
            const s = samples[i];
            if (s.time < vStart || s.time > vEnd) continue;

            const x = timeToX(s.time);
            const y = valueToY(s.value);
            const overlappingLabels = labelsToRender.filter(l => s.time >= l.startTimeMs && s.time <= l.endTimeMs);
            let nextColor = '#000';
            let nextWidth = 1.25;
            if (overlappingLabels.length > 1) {
                nextColor = '#E41A1C'; // red for overlap
                nextWidth = 3.0;
            } else if (overlappingLabels.length === 1) {
                const label = overlappingLabels[0];
                const sch = getColorScheme(label, hoveredLabelId === label.annotationId);
                nextColor = sch.line;
                nextWidth = 2.0;
            }

            const styleChanged = nextColor !== currentColor || nextWidth !== currentWidth;
            if (styleChanged) {
                flushSegment();
                currentColor = nextColor;
                currentWidth = nextWidth;
                ctx.strokeStyle = currentColor;
                ctx.lineWidth = currentWidth;
                ctx.beginPath();
                pathStarted = true;
                if (prevX != null && prevY != null) { ctx.moveTo(prevX, prevY); ctx.lineTo(x, y); } else { ctx.moveTo(x, y); }
            } else {
                if (!pathStarted) {
                    ctx.strokeStyle = currentColor; ctx.lineWidth = currentWidth; ctx.beginPath(); pathStarted = true; ctx.moveTo(x, y);
                } else { ctx.lineTo(x, y); }
            }
            prevX = x; prevY = y;
        }
        flushSegment();
    };

    const handlePointerDown = async (e) => {
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (x < MARGIN.left || x > MARGIN.left + chartWidth || y < MARGIN.top || y > MARGIN.top + chartHeight) { return; }
        const time = xToTime(x);
        const edgeInfo = findLabelEdgeAtTime(time);

        if (edgeInfo) {
            interactionStateRef.current.isResizing = true;
            setResizeState({ active: true, label: edgeInfo.label, edge: edgeInfo.edge, originalStart: edgeInfo.label.startTimeMs, originalEnd: edgeInfo.label.endTimeMs });
            resizeStartCanvasXRef.current = x;
            return;
        }
        if (e.ctrlKey || e.metaKey) {
            interactionStateRef.current.isPanning = true;
            setPanState({ active: true, startX: x, startViewport: { ...viewport } });
        } else {
            const hit = findLabelAtTime(time);
            if (hit) {
                const id = hit.annotationId ?? hit.id;
                if (id != null) {
                    setHoveredLabelId(hit.annotationId);
                    try {
                        const evt = new CustomEvent('annotation-select', {
                            detail: { id }
                        });
                        window.dispatchEvent(evt);
                    } catch (_) {}
                }
                return;
            }
            interactionStateRef.current.isDragging = true;
            setDragState({ active: true, startTime: time, endTime: time });
            dragStartCanvasXRef.current = x;
            dragStartTimeRef.current = time;
        }
    };

    const handlePointerMove = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (contextMenu.visible) {
            const menuElement = document.getElementById('label-context-menu');
            if (menuElement) {
                const menuRect = menuElement.getBoundingClientRect();
                if (e.clientX >= menuRect.left && e.clientX <= menuRect.right && e.clientY >= menuRect.top && e.clientY <= menuRect.bottom) {
                    if (hoveredLabelId !== null) setHoveredLabelId(null);
                    setHoverSample(null);
                    return;
                }
            }
        }

        const stableMsPerPx = msPerPixelRef.current || ((renderViewport.endMs - renderViewport.startMs) / Math.max(1, chartWidth));
        const anchorX = dragStartCanvasXRef.current;
        const anchorT = dragStartTimeRef.current;
        const time = (anchorX != null && anchorT != null)
            ? (anchorT + (x - anchorX) * stableMsPerPx)
            : xToTime(x);

        if (!contextMenu.visible && !interactionStateRef.current.isPanning && (interactionStateRef.current.isDragging || interactionStateRef.current.isResizing)) {
            const { dir, intensity } = computeEdgePan(x);
            if (dir !== 0 && intensity > 0) {
                autoPanDirRef.current = dir;
                autoPanIntensityRef.current = intensity;
                startAutoPan();
            } else {
                stopAutoPan();
            }
        } else {
            stopAutoPan();
        }

        if (x >= MARGIN.left && x <= MARGIN.left + chartWidth && y >= MARGIN.top && y <= MARGIN.top + chartHeight && !interactionStateRef.current.isPanning && !interactionStateRef.current.isResizing) {
            const nearest = findNearestSample(time);
            if (nearest) {
                setHoverSample({ timeMs: nearest.time, value: nearest.value, canvasX: timeToX(nearest.time), canvasY: valueToY(nearest.value) });
            } else { setHoverSample(null); }
        } else { setHoverSample(null); }

        const effectiveMinResizeMs = Number(minLabelDurationMs) || 0;

        if (interactionStateRef.current.isResizing) {
            const baseX = resizeStartCanvasXRef.current;
            const newTimeUnclamped = (baseX != null)
                ? ((resizeState.edge === 'left' ? resizeState.originalStart : resizeState.originalEnd) + (x - baseX) * stableMsPerPx)
                : xToTime(x);
            const newTime = Math.max(0, Math.min(newTimeUnclamped, effectiveDurationMs));
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

        if (x >= MARGIN.left && x <= MARGIN.left + chartWidth && y >= MARGIN.top && y <= MARGIN.top + chartHeight) {
            if (e.ctrlKey || e.metaKey) {
                if (hoveredLabelId !== null) setHoveredLabelId(null);
                setResizeEdge(null);
            } else {
                const edgeInfo = findLabelEdgeAtTime(time);
                if (edgeInfo) { setResizeEdge(edgeInfo.edge); setHoveredLabelId(edgeInfo.label.annotationId); } else {
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

        if (interactionStateRef.current.isDragging) {
            const clamped = Math.max(0, Math.min(time, effectiveDurationMs));
            setDragState(prev => ({ ...prev, endTime: clamped }));
        } else if (interactionStateRef.current.isPanning) {
            const dx = x - panState.startX;
            const timeRange = viewport.endMs - viewport.startMs;
            const timeShift = -(dx / chartWidth) * timeRange;
            let newStart = panState.startViewport.startMs + timeShift;
            let newEnd = panState.startViewport.endMs + timeShift;
            if (newStart < 0) { newEnd = newEnd - newStart; newStart = 0; }
            if (newEnd > effectiveDurationMs) { newStart = newStart - (newEnd - effectiveDurationMs); newEnd = effectiveDurationMs; }
            onViewportChange({ startMs: newStart, endMs: newEnd });
        }
    };

    const handlePointerUp = async (e) => {
        stopAutoPan();
        try {
            if (e && e.pointerId != null) e.currentTarget.releasePointerCapture(e.pointerId);
        } catch (err) {}

        if (interactionStateRef.current.isResizing) {
            interactionStateRef.current.isResizing = false;
            const resizedLabel = labels.find(l => l.annotationId === resizeState.label.annotationId);
            if (resizedLabel && (resizedLabel.startTimeMs !== resizeState.originalStart || resizedLabel.endTimeMs !== resizeState.originalEnd)) {
                try {
                    const updated = await fetchUpdateAnnotation(resizedLabel.annotationId, {
                        channelId,
                        startTimeMs: resizedLabel.startTimeMs,
                        endTimeMs: resizedLabel.endTimeMs
                    });
                    if (updated) {
                        const nextLabels = labels.map(l => l.annotationId === resizedLabel.annotationId ?
                            {...l, startTimeMs: updated.startTimeMs, endTimeMs: updated.endTimeMs} :
                            l
                        );
                        setLabels(nextLabels);
                        dispatchAnnotationsUpdated(nextLabels);
                    } else {
                        throw new Error("Annotation update failed on the backend.");
                    }
                } catch(e) {
                    console.error('Failed to update annotation, rolling back UI.', e);
                    setLabels(prev => prev.map(l =>
                        l.annotationId === resizeState.label.annotationId ? {
                        ...l, startTimeMs: resizeState.originalStart, endTimeMs: resizeState.originalEnd} : l
                    ));
                }
            }
            setResizeState({ active: false, label: null, edge: null, originalStart: null, originalEnd: null });
            resizeStartCanvasXRef.current = null;
            return;
        }

        if (interactionStateRef.current.isDragging) {
            interactionStateRef.current.isDragging = false;
            let s = Math.min(dragState.startTime, dragState.endTime);
            let eTime = Math.max(dragState.startTime, dragState.endTime);
            if (eTime - s > 0) {
                try {
                    const created = await fetchCreateAnnotation({ channelId, startTime: s, endTime: eTime, name: 'Unknown', note: '' });
                    if (created) {
                        const newAnn = {
                            annotationId: created.annotationId || created.id,
                            startTimeMs: Number(created.startTimeMs),
                            endTimeMs: Number(created.endTimeMs),
                            name: created.labelName || 'Unknown',
                            labelName: created.labelName || 'Unknown',
                            note: created.note ?? '', state: 'persisted' };
                        const updatedLabels = [...labels, newAnn];
                        setLabels(updatedLabels);
                        dispatchAnnotationsUpdated(updatedLabels);

                        const labelX = timeToX(newAnn.startTimeMs);
                        const canvasRect = canvasRef.current.getBoundingClientRect();
                        setContextMenu({
                            visible: true,
                            x: canvasRect.left + labelX + 20,
                            y: canvasRect.top + MARGIN.top + 20,
                            type: 'persisted',
                            targetLabel: newAnn,
                            isNewlyCreated: true
                        });
                        setIsEditingPersisted(true);
                    }
                } catch (err) { console.error(err); }
            }
            setDragState({ active: false, startTime: null, endTime: null });
            dragStartCanvasXRef.current = null;
            dragStartTimeRef.current = null;
        }
        if (interactionStateRef.current.isPanning) {
            interactionStateRef.current.isPanning = false;
            setPanState({ active: false, startX: null, startViewport: null });
        }
    };

    const handlePointerLeave = () => {
        if (!interactionStateRef.current.isDragging && !interactionStateRef.current.isResizing && !interactionStateRef.current.isPanning) {
            setHoveredLabelId(null);
            setHoverSample(null);
        }
    };

    const minViewportSpanMs = useMemo(() => {
        const v = Number(minLabelDurationMs)
        return (Number.isFinite(v) && v > 0) ? v : 5
    }, [minLabelDurationMs])

    const handleWheel = (e) => {
        e.preventDefault();
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        if (x < MARGIN.left || x > MARGIN.left + chartWidth) return;
        const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
        const currentRange = renderViewport.endMs - renderViewport.startMs;
        let newRange = currentRange * zoomFactor;
        if (newRange < minViewportSpanMs) {
            if (zoomFactor < 1) newRange = minViewportSpanMs;
        }
        const mouseTime = xToTime(x);
        const mouseRatio = (mouseTime - renderViewport.startMs) / currentRange;
        let newStart = mouseTime - newRange * mouseRatio;
        let newEnd = mouseTime + newRange * (1 - mouseRatio);
        if (newStart < 0) {
            newEnd -= newStart;
            newStart = 0;
        }
        if (newEnd > effectiveDurationMs) {
            newStart -= (newEnd - effectiveDurationMs);
            newEnd = effectiveDurationMs;
        }
        if (chartWidth > 0) {
            msPerPixelRef.current = (newEnd - newStart) / chartWidth;
        }
        onViewportChange({
            startMs: Math.max(0, newStart),
            endMs: Math.min(effectiveDurationMs, newEnd)
        });
    };

    const handleContextMenu = async (e) => {
        e.preventDefault();
        await refreshLabelCatalog();
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const time = xToTime(x);
        const hits = labels.filter(l => time >= l.startTimeMs && time <= l.endTimeMs);
        const persisted = hits.find(l => !(((l.name || '').toLowerCase() === 'pending')));
        setContextMenu({visible: true, x: e.clientX, y: e.clientY, type: 'persisted', targetLabel: persisted, isNewlyCreated: false});
        setIsEditingPersisted(false);
    };

    const handleDoubleClick = async (e) => {
        e.preventDefault();
        await refreshLabelCatalog();
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (x < MARGIN.left || x > MARGIN.left + chartWidth || y < MARGIN.top || y > MARGIN.top + chartHeight) { return; }
        const time = xToTime(x);
        const hit = findLabelAtTime(time);
        if (hit) {
            setContextMenu({
                visible: true,
                x: e.clientX,
                y: e.clientY,
                type: 'persisted',
                targetLabel: hit,
                isNewlyCreated: false
            });
            setIsEditingPersisted(true);
        }
    };

    const handlePersistedEditChoose = async (option) => {
        const label = contextMenu.targetLabel;
        if(!label) return;
        try {
            const updated = await fetchUpdateAnnotation(label.annotationId, { labelName: option.value });
            if(updated) {
                setLabels(prev => {
                    const next = prev.map(l => l.annotationId === label.annotationId ? {
                        ...l, name: updated.labelName, labelName: updated.labelName} : l
                    );
                    dispatchAnnotationsUpdated(next);
                    return next;
                });
            }
        } finally {
            setContextMenu({visible: false, x:0, y:0, type:null, targetLabel:null, isNewlyCreated: false});
            setIsEditingPersisted(false);
        }
    };

    const handlePersistedDelete = async () => {
        const label = contextMenu.targetLabel;
        if(!label || (contextMenu.isNewlyCreated === false && !window.confirm(`Delete "${label.name}"?`))) {
            setContextMenu({
                visible: false,
                x:0,
                y:0,
                type:null,
                targetLabel:null,
                isNewlyCreated: false
            });
            return;
        }
        try {
            if(await fetchDeleteAnnotation(label.annotationId)) {
                setLabels(prev => {
                    const next = prev.filter(l => l.annotationId !== label.annotationId);
                    dispatchAnnotationsUpdated(next); return next; });
            }
        } finally {
            setContextMenu({
                visible: false,
                x:0, y:0,
                type:null,
                targetLabel:null,
                isNewlyCreated: false
            });
        }
    };

    const handleCancelContextMenu = (persist = true) => {
        if (!persist && contextMenu.isNewlyCreated) {
            handlePersistedDelete();
        } else {
            setContextMenu({
                visible: false,
                x: 0,
                y: 0,
                type: null,
                targetLabel: null,
                isNewlyCreated: false
            });
            setIsEditingPersisted(false);
        }
    };

    useEffect(() => {
        if(contextMenu.visible) {
            const h = (e) => {
                if(!document.getElementById('label-context-menu')?.contains(e.target)) handleCancelContextMenu();
            };
            document.addEventListener('mousedown', h);
            return () => document.removeEventListener('mousedown', h); }
    }, [contextMenu.visible, contextMenu.isNewlyCreated]);

    const normalizedExistingLabels = useMemo(() => {
        return (existingLabels || []).map(l => ({
            annotationId: l.annotationId,
            startTimeMs: Number(l.startTimeMs),
            endTimeMs: Number(l.endTimeMs),
            name: l.labelName || l.name || l.label?.name || 'Unknown',
            note: l.note ?? null,
            state: 'persisted'
        }));
    }, [existingLabels]);

    const normalizedExistingLabelsRef = useRef([]);
    useEffect(() => {
        normalizedExistingLabelsRef.current = normalizedExistingLabels;
    }, [normalizedExistingLabels]);

    const existingLabelsSig = useMemo(() => {
        return normalizedExistingLabels
            .map(l => `${l.annotationId}|${l.startTimeMs}|${l.endTimeMs}|${l.name}|${l.note ?? ''}`)
            .join('~');
    }, [normalizedExistingLabels]);

    const lastExistingLabelsSigRef = useRef(null);

    useEffect(() => {
        if (lastExistingLabelsSigRef.current === existingLabelsSig) return;
        lastExistingLabelsSigRef.current = existingLabelsSig;
        const normalized = normalizedExistingLabelsRef.current;
        setLabels(prev => {
            const next = [
                ...normalized,
                ...prev.filter(x => x.state === 'pending' || x.state === 'temporary')
            ];

            const prevSig = (prev || [])
                .filter(x => x.state === 'persisted')
                .map(l => `${l.annotationId}|${Number(l.startTimeMs)}|${Number(l.endTimeMs)}|${l.name}|${l.note ?? ''}`)
                .join('~');

            if (prevSig === existingLabelsSig) return prev;
            return next;
        });
    }, [existingLabelsSig]);

    useEffect(() => {
        const handleRemoteSelect = (e) => {
            const id = e?.detail?.id;
            if (id == null) return;
            setHoveredLabelId(id);
            const targetLabel = labels.find(l => (l.annotationId ?? l.id) === id);
            if (!targetLabel) return;
            const labelStart = targetLabel.startTimeMs;
            const labelEnd = targetLabel.endTimeMs;
            const currentStart = renderViewport.startMs;
            const currentEnd = renderViewport.endMs;
            if (labelStart < currentStart || labelEnd > currentEnd) {
                const range = currentEnd - currentStart;
                const center = (labelStart + labelEnd) / 2;
                let newStart = center - range / 2;
                let newEnd = center + range / 2;
                if (newStart < 0) {
                    newEnd -= newStart;
                    newStart = 0;
                }
                if (newEnd > effectiveDurationMs) {
                    newStart -= (newEnd - effectiveDurationMs);
                    newEnd = effectiveDurationMs;
                }
                onViewportChange({
                    startMs: Math.max(0, newStart),
                    endMs: Math.min(effectiveDurationMs, newEnd)
                });
            }
        };
        window.addEventListener('annotation-select', handleRemoteSelect);
        return () => window.removeEventListener('annotation-select', handleRemoteSelect);
    }, [labels, renderViewport, effectiveDurationMs, onViewportChange]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
            if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            const range = renderViewport.endMs - renderViewport.startMs;
            if (range <= 0) return;
            const step = range * 0.1;
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                let newStart = renderViewport.startMs;
                let newEnd = renderViewport.endMs;
                if (e.key === 'ArrowLeft') { newStart -= step; newEnd -= step; }
                if (e.key === 'ArrowRight') { newStart += step; newEnd += step; }
                if (newStart < 0) { newEnd -= newStart; newStart = 0; }
                if (newEnd > effectiveDurationMs) {
                    newStart -= (newEnd - effectiveDurationMs);
                    newEnd = effectiveDurationMs;
                }
                onViewportChange({ startMs: newStart, endMs: newEnd });
            }
            else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                const voltageRange = dataRange.max - dataRange.min;
                const voltageStep = voltageRange * 0.1;
                if (e.key === 'ArrowUp') {
                    setVerticalOffset(prev => prev + voltageStep);
                } else {
                    setVerticalOffset(prev => prev - voltageStep);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [renderViewport, effectiveDurationMs, onViewportChange, dataRange]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const wheelHandler = (e) => { e.preventDefault(); handleWheel(e); };
        canvas.addEventListener('wheel', wheelHandler, { passive: false });
        return () => { canvas.removeEventListener('wheel', wheelHandler); };
    }, [handleWheel]);

    useEffect(() => {
        if (contextMenu.visible) {
            const handleKeyDown = (e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    handleCancelContextMenu(true);
                }
            };
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [contextMenu.visible, contextMenu.isNewlyCreated]);

    const handlePlayLabelAudio = useCallback((label) => {
        if (!label || !samples || samples.length === 0) return;
        const chunk = samples.filter(s => s.time >= label.startTimeMs && s.time <= label.endTimeMs);
        if (chunk.length > 0) {
            makeSound(chunk, samplingRateHz);
        } else {
            console.warn("No signal data found for this label.");
        }
    }, [samples, samplingRateHz]);

    return (
        <div
            ref={containerRef}
            className="signal-chart-container"
            style={{
                cursor: resizeState.active ? 'ew-resize' : resizeEdge ? 'ew-resize' : dragState.active ? 'crosshair' : panState.active ? 'grabbing' : 'default'
            }}
        >
            <canvas
                ref={canvasRef}
                className="signal-chart-canvas"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerLeave}
                onContextMenu={handleContextMenu}
                onDoubleClick={handleDoubleClick}
            />
            <div className="chart-bottom-scrollbar"
                 ref={topScrollRef} onScroll={handleTopScroll}
                 style={{ left: `${MARGIN.left}px`, right: `${MARGIN.right}px`, height: 160 }}
            >
                <div ref={topInnerRef} style={{ height: 2 }} />
            </div>

            {hoverSample && (
                <div
                    className="hover-tooltip"
                    style={{
                        top: Math.max(MARGIN.top, Math.min(hoverSample.canvasY - 28, dimensions.height - 55)),
                        left: Math.min(Math.max(hoverSample.canvasX + 8, MARGIN.left), dimensions.width - 160)
                    }}
                >
                    <div>time: {hoverSample.timeMs.toFixed(3)} ms</div>
                    <div>volt: {typeof hoverSample.value === 'number' ? hoverSample.value.toFixed(1) : hoverSample.value} µV</div>
                </div>
            )}

            {contextMenu.visible && (
                <LabelContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    type={contextMenu.type}
                    allLabelOptions={allLabelOptions}
                    isEditingPersisted={contextMenu.type === 'persisted' ? isEditingPersisted : false}
                    onEditPersistedClick={() => setIsEditingPersisted(true)}
                    onDeletePersistedClick={handlePersistedDelete}
                    onBackPersistedClick={() => handleCancelContextMenu(false)}
                    onChoosePersistedLabel={handlePersistedEditChoose}
                    onPlayAudioClick={() => handlePlayLabelAudio(contextMenu.targetLabel)}
                />
            )}

            <NavControl
                onZoomXIn={handleZoomXIn}
                onZoomXOut={handleZoomXOut}
                onZoomYIn={handleZoomYIn}
                onZoomYOut={handleZoomYOut}
            />
        </div>
    );
}
