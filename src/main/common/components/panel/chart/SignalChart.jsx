import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import {fetchCreateLabel, fetchGetAllLabels} from "../../../api/index.js";
import CreatableSelect from "react-select/creatable";

export default function SignalChartWithLabels({
                                                  samples,
                                                  samplingRateHz,
                                                  durationMs,
                                                  viewport,
                                                  onViewportChange,
                                                  channelId
                                              }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
    const [dragState, setDragState] = useState({ active: false, startTime: null, endTime: null });
    const [panState, setPanState] = useState({ active: false, startX: null, startViewport: null });
    const [labels, setLabels] = useState([]);
    const [allLabelOptions, setAllLabelOptions] = useState([]);
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, pendingLabel: null });
    const [isCreatingNewLabel, setIsCreatingNewLabel] = useState(false);

    // Margins for axes
    const MARGIN = { top: 20, right: 20, bottom: 50, left: 60 };

    // ===== Load all labels from server =====
    useEffect(() => {
        fetchGetAllLabels().then(ls => {
            console.log(JSON.stringify(ls))
            const options = ls
                .filter(l => l.name && l.name.trim() && l.name.toLowerCase() !== 'pending')
                .map(l => ({
                    value: l.name.trim(),
                    label: l.name.trim()
                }));

            // Loại bỏ duplicate
            const uniqueOptions = options.filter((opt, idx, arr) =>
                arr.findIndex(o => o.value.toLowerCase() === opt.value.toLowerCase()) === idx
            );

            // Đảm bảo Unknown luôn có trong danh sách
            if (!uniqueOptions.some(o => o.value.toLowerCase() === 'unknown')) {
                uniqueOptions.unshift({ value: 'Unknown', label: 'Unknown' });
            }

            setAllLabelOptions(uniqueOptions);
        });
    }, []);

    // ===== Calculate effective duration - ƯU TIÊN durationMs =====
    const effectiveDurationMs = useMemo(() => {
        if (durationMs != null) return durationMs;
        if (!samples || samples.length === 0) return 1000;
        return samples[samples.length - 1].time;
    }, [durationMs, samples]);

    // ===== Find data range =====
    const dataRange = useMemo(() => {
        if (!samples || samples.length === 0) return { min: -1, max: 1 };
        const values = samples.map(s => s.value).filter(v => typeof v === 'number');
        const min = Math.min(...values);
        const max = Math.max(...values);
        const padding = (max - min) * 0.1 || 1;
        return { min: min - padding, max: max + padding };
    }, [samples]);

    // ===== Resize observer =====
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

    // ===== Coordinate transformations =====
    const chartWidth = dimensions.width - MARGIN.left - MARGIN.right;
    const chartHeight = dimensions.height - MARGIN.top - MARGIN.bottom;

    // Giới hạn viewport.endMs không vượt quá effectiveDurationMs
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

    // ===== Draw chart =====
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        canvas.width = dimensions.width * dpr;
        canvas.height = dimensions.height * dpr;
        canvas.style.width = `${dimensions.width}px`;
        canvas.style.height = `${dimensions.height}px`;
        ctx.scale(dpr, dpr);

        // Clear
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, dimensions.width, dimensions.height);

        // Draw labels (background boxes)
        labels.forEach(label => {
            const lname = (label.name || '').toLowerCase();
            const isUnknown = lname === 'unknown';
            const isPending = lname === 'pending';

            if (label.endTimeMs >= clampedViewport.startMs && label.startTimeMs <= clampedViewport.endMs) {
                const x1 = Math.max(timeToX(label.startTimeMs), MARGIN.left);
                const x2 = Math.min(timeToX(label.endTimeMs), MARGIN.left + chartWidth);

                // Fill
                if (isPending) {
                    ctx.fillStyle = 'rgba(50,50,50,0.4)';
                    ctx.strokeStyle = 'rgba(0,0,0,0.9)';
                } else if (isUnknown) {
                    ctx.fillStyle = 'rgba(0,100,255,0.3)';
                    ctx.strokeStyle = 'rgba(0,80,200,0.9)';
                } else {
                    ctx.fillStyle = 'rgba(255,50,50,0.3)';
                    ctx.strokeStyle = 'rgba(200,0,0,0.9)';
                }

                ctx.fillRect(x1, MARGIN.top, x2 - x1, chartHeight);
                ctx.lineWidth = 2;
                ctx.strokeRect(x1, MARGIN.top, x2 - x1, chartHeight);

                // Label text
                ctx.fillStyle = ctx.strokeStyle;
                ctx.font = 'bold 12px sans-serif';
                ctx.fillText(label.name, x1 + 5, MARGIN.top + 15);
            }
        });

        // Draw pending selection - chỉ viền đứt nét nhẹ
        if (dragState.active) {
            const s = Math.min(dragState.startTime, dragState.endTime);
            const e = Math.max(dragState.startTime, dragState.endTime);
            const x1 = timeToX(s);
            const x2 = timeToX(e);

            // Chỉ viền đứt nét, không fill
            ctx.strokeStyle = 'rgba(100,100,100,0.6)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(x1, MARGIN.top, x2 - x1, chartHeight);
            ctx.setLineDash([]);
        }

        // Draw grid
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;

        // Vertical grid lines (time)
        const timeStep = (clampedViewport.endMs - clampedViewport.startMs) / 10;
        for (let i = 0; i <= 10; i++) {
            const t = clampedViewport.startMs + i * timeStep;
            const x = timeToX(t);
            ctx.beginPath();
            ctx.moveTo(x, MARGIN.top);
            ctx.lineTo(x, MARGIN.top + chartHeight);
            ctx.stroke();
        }

        // Horizontal grid lines (amplitude)
        const valueStep = (dataRange.max - dataRange.min) / 10;
        for (let i = 0; i <= 10; i++) {
            const v = dataRange.min + i * valueStep;
            const y = valueToY(v);
            ctx.beginPath();
            ctx.moveTo(MARGIN.left, y);
            ctx.lineTo(MARGIN.left + chartWidth, y);
            ctx.stroke();
        }

        // Draw signal
        if (samples && samples.length > 0) {
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.beginPath();

            let started = false;
            samples.forEach(s => {
                if (s.time >= clampedViewport.startMs && s.time <= clampedViewport.endMs) {
                    const x = timeToX(s.time);
                    const y = valueToY(s.value);

                    if (!started) {
                        ctx.moveTo(x, y);
                        started = true;
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
            });

            ctx.stroke();
        }

        // Draw axes
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(MARGIN.left, MARGIN.top);
        ctx.lineTo(MARGIN.left, MARGIN.top + chartHeight);
        ctx.lineTo(MARGIN.left + chartWidth, MARGIN.top + chartHeight);
        ctx.stroke();

        // Draw axis labels
        ctx.fillStyle = '#000';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';

        // X-axis labels
        for (let i = 0; i <= 10; i++) {
            const t = clampedViewport.startMs + i * timeStep;
            const x = timeToX(t);
            ctx.fillText(t.toFixed(0), x, MARGIN.top + chartHeight + 20);
        }

        // X-axis title
        ctx.font = '12px sans-serif';
        ctx.fillText(
            `Time (ms)${samplingRateHz ? ` @ ${samplingRateHz} Hz` : ''}`,
            MARGIN.left + chartWidth / 2,
            dimensions.height - 10
        );

        // Y-axis labels
        ctx.textAlign = 'right';
        ctx.font = '11px sans-serif';
        for (let i = 0; i <= 10; i++) {
            const v = dataRange.min + i * valueStep;
            const y = valueToY(v);
            ctx.fillText(v.toFixed(2), MARGIN.left - 10, y + 4);
        }

        // Y-axis title
        ctx.save();
        ctx.translate(15, MARGIN.top + chartHeight / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Amplitude', 0, 0);
        ctx.restore();

    }, [dimensions, samples, clampedViewport, dataRange, labels, dragState, timeToX, valueToY, chartWidth, chartHeight, samplingRateHz]);

    // ===== Mouse handlers =====
    const handleMouseDown = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Check if inside chart area
        if (x < MARGIN.left || x > MARGIN.left + chartWidth ||
            y < MARGIN.top || y > MARGIN.top + chartHeight) {
            return;
        }

        if (e.ctrlKey || e.metaKey) {
            // Pan mode
            setPanState({
                active: true,
                startX: x,
                startViewport: { ...viewport }
            });
        } else {
            // Label selection mode
            const time = xToTime(x);
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

        if (dragState.active) {
            const time = xToTime(x);
            setDragState(prev => ({ ...prev, endTime: time }));
        } else if (panState.active) {
            const dx = x - panState.startX;
            const timeRange = viewport.endMs - viewport.startMs;
            const timeShift = -(dx / chartWidth) * timeRange;

            let newStart = panState.startViewport.startMs + timeShift;
            let newEnd = panState.startViewport.endMs + timeShift;

            // Clamp to bounds
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

    const handleMouseUp = () => {
        if (dragState.active) {
            const s = Math.min(dragState.startTime, dragState.endTime);
            const e = Math.max(dragState.startTime, dragState.endTime);

            if (e - s > 10) {
                setLabels(prev => [...prev, {
                    annotationId: Date.now(),
                    name: 'Pending',
                    startTimeMs: s,
                    endTimeMs: e
                }]);
            }

            setDragState({ active: false, startTime: null, endTime: null });
        }

        if (panState.active) {
            setPanState({ active: false, startX: null, startViewport: null });
        }
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

        // Clamp
        if (newStart < 0) {
            newEnd = newEnd - newStart;
            newStart = 0;
        }
        if (newEnd > effectiveDurationMs) {
            newStart = newStart - (newEnd - effectiveDurationMs);
            newEnd = effectiveDurationMs;
        }

        onViewportChange({ startMs: Math.max(0, newStart), endMs: Math.min(effectiveDurationMs, newEnd) });
    };

    const handleContextMenu = (e) => {
        e.preventDefault();

        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const time = xToTime(x);

        const hit = labels.find(l => time >= l.startTimeMs && time <= l.endTimeMs);
        if (hit) {
            setContextMenu({
                visible: true,
                x: e.clientX,
                y: e.clientY,
                pendingLabel: hit
            });
        }
    };

    const handleSelectLabel = async (option) => {
        const label = contextMenu.pendingLabel;
        if (!label) return;

        const newName = option.value;
        let savedLabel = label;

        if (newName !== 'Pending') {
            const labelDto = {
                channelId,
                startTime: label.startTimeMs,
                endTime: label.endTimeMs,
                name: newName
            };
            savedLabel = await fetchCreateLabel(labelDto);
        }

        setLabels(prev => prev.map(l =>
            l.annotationId === label.annotationId
                ? { ...l, name: newName, ...savedLabel }
                : l
        ));
        setContextMenu({ visible: false, x: 0, y: 0, pendingLabel: null });
    };

    const handleCreateLabelOption = async (inputValue) => {
        if (!inputValue || typeof inputValue !== 'string' || inputValue.trim() === '') {
            return;
        }

        const trimmed = inputValue.trim();
        const newOption = { value: trimmed, label: trimmed };

        // Thêm vào danh sách nếu chưa có
        setAllLabelOptions(prev => {
            const exists = prev.some(o => o.value.toLowerCase() === trimmed.toLowerCase());
            if (exists) return prev;
            return [...prev, newOption];
        });

        await handleSelectLabel(newOption);
    };

    const handleCancelContextMenu = () => {
        setContextMenu({ visible: false, x: 0, y: 0, pendingLabel: null });
        setIsCreatingNewLabel(false);
    };

    useEffect(() => {
        if (contextMenu.visible) {
            const handleClick = (e) => {
                // Không đóng nếu click vào context menu
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

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                cursor: dragState.active ? 'crosshair' : (panState.active ? 'grabbing' : 'default')
            }}
        >
            <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                onContextMenu={handleContextMenu}
                style={{ display: 'block' }}
            />

            {contextMenu.visible && (
                <div
                    id="label-context-menu"
                    style={{
                        position: 'fixed',
                        top: contextMenu.y,
                        left: contextMenu.x,
                        zIndex: 1000,
                        backgroundColor: 'white',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                        borderRadius: 6,
                        padding: '12px',
                        minWidth: '200px'
                    }}
                    onMouseDown={e => e.stopPropagation()}
                >
                    {!isCreatingNewLabel ? (
                        <div>
                            <div style={{
                                fontSize: '12px',
                                fontWeight: 'bold',
                                marginBottom: '8px',
                                color: '#666'
                            }}>
                                Select Label:
                            </div>
                            <div style={{
                                maxHeight: '200px',
                                overflowY: 'auto',
                                marginBottom: '8px'
                            }}>
                                {allLabelOptions.map(opt => (
                                    <div
                                        key={opt.value}
                                        onClick={() => handleSelectLabel(opt)}
                                        style={{
                                            padding: '8px 12px',
                                            cursor: 'pointer',
                                            borderRadius: 4,
                                            transition: 'background-color 0.2s',
                                            fontSize: '14px'
                                        }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f0f0'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                    >
                                        {opt.label}
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={() => setIsCreatingNewLabel(true)}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    border: '1px dashed #999',
                                    borderRadius: 4,
                                    backgroundColor: 'transparent',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    color: '#666',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.backgroundColor = '#f8f8f8';
                                    e.target.style.borderColor = '#666';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.backgroundColor = 'transparent';
                                    e.target.style.borderColor = '#999';
                                }}
                            >
                                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>+</span>
                                <span>Add New Label</span>
                            </button>
                        </div>
                    ) : (
                        <div>
                            <div style={{
                                fontSize: '12px',
                                fontWeight: 'bold',
                                marginBottom: '8px',
                                color: '#666'
                            }}>
                                New Label Name:
                            </div>
                            <input
                                type="text"
                                autoFocus
                                placeholder="Enter label name..."
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const value = e.target.value;
                                        if (value.trim()) {
                                            handleCreateLabelOption(value);
                                        }
                                    } else if (e.key === 'Escape') {
                                        setIsCreatingNewLabel(false);
                                    }
                                }}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    border: '1px solid #ddd',
                                    borderRadius: 4,
                                    fontSize: '14px',
                                    marginBottom: '8px',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#4a90e2'}
                                onBlur={(e) => e.target.style.borderColor = '#ddd'}
                            />
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={(e) => {
                                        const input = e.target.parentElement.parentElement.querySelector('input');
                                        if (input && input.value.trim()) {
                                            handleCreateLabelOption(input.value);
                                        }
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '6px',
                                        border: 'none',
                                        borderRadius: 4,
                                        backgroundColor: '#4a90e2',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontSize: '13px'
                                    }}
                                >
                                    Create
                                </button>
                                <button
                                    onClick={() => setIsCreatingNewLabel(false)}
                                    style={{
                                        flex: 1,
                                        padding: '6px',
                                        border: '1px solid #ddd',
                                        borderRadius: 4,
                                        backgroundColor: 'white',
                                        cursor: 'pointer',
                                        fontSize: '13px'
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}