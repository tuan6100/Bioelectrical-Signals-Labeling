import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import 'chartjs-plugin-annotation';
import zoomPlugin from 'chartjs-plugin-zoom';

export default function SignalChart({
                                        samples,
                                        labels,
                                        samplingRateHz,
                                        durationMs,
                                        viewport,
                                        onViewportChange,
                                        onCreateSelection,
                                    }) {
    const chartRef = useRef(null);
    const [dragState, setDragState] = useState({
        active: false,
        startTime: null,
        endTime: null
    });

    // ===== Data points =====
    const points = useMemo(() => {
        if (!samples || samples.length === 0) return [];
        return samples
            .filter(s => typeof s.time === "number" && typeof s.value === "number")
            .map(s => ({ x: s.time, y: s.value }));
    }, [samples]);

    const effectiveDurationMs = useMemo(() => {
        if (durationMs != null) return durationMs;
        if (!samples || samples.length === 0) return null;
        return samples[samples.length - 1].time;
    }, [durationMs, samples]);

    // ===== Label annotations =====
    const labelAnnotations = useMemo(() => {
        if (!labels || labels.length === 0) return {};
        const map = {};
        labels.forEach((l, idx) => {
            const name = (l.labelName || l.label?.name || 'Label');
            const isUnknown = name.toLowerCase() === 'unknown';
            const fill = isUnknown ? 'rgba(0,110,255,0.25)' : 'rgba(255,0,0,0.25)';
            const stroke = isUnknown ? 'rgba(0,90,220,0.9)' : 'rgba(180,0,0,0.9)';

            map[`label-${l.annotationId || idx}`] = {
                type: 'box',
                xMin: l.startTimeMs,
                xMax: l.endTimeMs,
                yMin: () => chartRef.current?.chart?.scales.y.min,
                yMax: () => chartRef.current?.chart?.scales.y.max,
                backgroundColor: fill,
                borderColor: stroke,
                borderWidth: 2,
                label: {
                    display: true,
                    content: name,
                    position: 'start',
                    color: stroke,
                    font: { size: 11 }
                }
            };
        });
        return map;
    }, [labels]);

    // ===== Pending drag selection =====
    const pendingAnnotation = useMemo(() => {
        if (!dragState.active) return {};
        const s = Math.min(dragState.startTime, dragState.endTime);
        const e = Math.max(dragState.startTime, dragState.endTime);
        return {
            pending: {
                type: 'box',
                xMin: s,
                xMax: e,
                yMin: () => chartRef.current?.chart?.scales.y.min,
                yMax: () => chartRef.current?.chart?.scales.y.max,
                backgroundColor: 'rgba(0,0,0,0.12)',
                borderColor: '#000',
                borderWidth: 2
            }
        };
    }, [dragState]);

    // ===== Chart data =====
    const data = useMemo(() => ({
        datasets: [{
            label: 'EMG',
            data: points,
            parsing: false,
            borderColor: '#1c4fb4',
            borderWidth: 1,
            pointRadius: 0,
            tension: 0,
            spanGaps: false,
            decimation: { enabled: true, algorithm: 'lttb' }
        }]
    }), [points]);

    // ===== Chart options =====
    const options = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        animation: false,

        scales: {
            x: {
                type: 'linear',
                title: { display: true, text: `Time (ms)${samplingRateHz ? ` @ ${samplingRateHz} Hz` : ''}` },
                min: viewport.startMs,
                max: effectiveDurationMs ? Math.min(viewport.endMs, effectiveDurationMs) : viewport.endMs,
                grid: { color: '#ddd' }
            },
            y: {
                type: 'linear',
                title: { display: true, text: 'Amplitude (µV)' },
                grid: { color: '#ddd' }
            }
        },

        plugins: {
            legend: { display: false },
            tooltip: { intersect: false, mode: 'index' },
            annotation: { annotations: { ...labelAnnotations, ...pendingAnnotation } },
            zoom: {
                pan: {
                    enabled: true,
                    mode: 'x',
                    onPanComplete: ({ chart }) => {
                        const { min, max } = chart.scales.x;
                        onViewportChange({ startMs: min, endMs: max });
                    }
                },
                zoom: {
                    wheel: { enabled: true },
                    pinch: { enabled: true },
                    mode: 'x'
                },
                limits: { x: { min: 0, max: effectiveDurationMs } }
            }
        }
    }), [
        viewport,
        labelAnnotations,
        pendingAnnotation,
        effectiveDurationMs,
        onViewportChange,
        samplingRateHz
    ]);

    // ===== Keep viewport synced only if different =====
    useEffect(() => {
        const chart = chartRef.current?.chart;
        if (!chart) return;

        const min = chart.scales.x.min;
        const max = chart.scales.x.max;

        // Chỉ áp dụng khi viewport khác với scale hiện tại
        if (viewport.startMs !== min || viewport.endMs !== max) {
            chart.options.scales.x.min = viewport.startMs;
            chart.options.scales.x.max = viewport.endMs;
            chart.update('none');
        }
    }, [viewport, effectiveDurationMs]);

    // ===== Drag selection =====
    const handleMouseDown = (e) => {
        const chart = chartRef.current?.chart;
        if (!chart) return;
        if (e.shiftKey || e.nativeEvent.button === 1) return;
        const t = chart.scales.x.getValueForPixel(e.nativeEvent.offsetX);
        setDragState({ active: true, startTime: t, endTime: t });
    };

    const handleMouseMove = (e) => {
        if (!dragState.active) return;
        const chart = chartRef.current?.chart;
        if (!chart) return;
        const t = chart.scales.x.getValueForPixel(e.nativeEvent.offsetX);
        setDragState(ds => ({ ...ds, endTime: t }));
    };

    const finishDrag = () => {
        if (dragState.active) {
            const s = Math.min(dragState.startTime, dragState.endTime);
            const e = Math.max(dragState.startTime, dragState.endTime);
            if (e - s >= 5) onCreateSelection({ startMs: s, endMs: e });
        }
        setDragState({ active: false, startTime: null, endTime: null });
    };

    return (
        <div
            className="chartjs-wrapper"
            style={{ width: '100%', height: '100%', position: 'relative' }}
            onMouseLeave={() => { if (dragState.active) finishDrag(); }}
        >
            <Line
                ref={chartRef}
                data={data}
                options={options}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={finishDrag}
            />

            <div
                className="chart-help"
                style={{
                    position: 'absolute',
                    bottom: 4,
                    left: 8,
                    fontSize: 11,
                    background: 'rgba(255,255,255,0.7)',
                    padding: '2px 6px',
                    borderRadius: 3
                }}
            >
                Drag to select. Shift/Middle drag to pan. Wheel to zoom.
            </div>
        </div>
    );
}
