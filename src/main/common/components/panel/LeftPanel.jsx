import React, { useEffect, useState } from 'react';
import {
    fetchChannelSamples,
    fetchCreateLabel,
    fetchExportLabel
} from '../../api/index.js';
import { useSignalViewport } from '../../hooks/useSignalViewport.js';
import './LeftPanel.css';
import SignalChart from "./chart/SignalChart.jsx";

export default function LeftPanel ({
    session,
    sessionId,
    channels,
    channelId,
    defaultSignal,
    onChannelSelected,
    onBack
}) {
    const [loading, setLoading] = useState(false);
    const [samples, setSamples] = useState([]);
    const [samplingRate, setSamplingRate] = useState(null);
    const [durationMs, setDurationMs] = useState(null);
    const [labels, setLabels] = useState([]);
    const [selectionForModal, setSelectionForModal] = useState(null);

    const { viewport, updateViewport, resetViewport } = useSignalViewport(durationMs);

    // Initialize from default signal when it changes
    useEffect(() => {
        if (!defaultSignal) {
            setSamples([]);
            setSamplingRate(null);
            setDurationMs(null);
            setLabels([]);
            return;
        }
        const sig = defaultSignal;
        setSamples(sig.samples || []);
        setSamplingRate(sig.samplingRateHz || null);
        setDurationMs(
            sig.durationMs || (sig.samples?.length ? sig.samples[sig.samples.length - 1].time : null)
        );
        const ann = sig.annotations
            ? Array.isArray(sig.annotations)
                ? sig.annotations
                : [sig.annotations]
            : [];
        setLabels(
            ann.map(a => ({
                annotationId: a.annotationId,
                startTimeMs: a.startTimeMs,
                endTimeMs: a.endTimeMs,
                labelName: a.label?.name || a.labelName || 'Unknown',
                note: a.note || null,
                label: a.label || null
            }))
        );
        resetViewport();
    }, [defaultSignal, resetViewport]);

    const handleConfirmLabel = async ({ name, note }) => {
        if (!channelId || !selectionForModal) {
            setSelectionForModal(null);
            return;
        }
        try {
            const res = await fetchCreateLabel({
                channelId,
                startTime: selectionForModal.startMs,
                endTime: selectionForModal.endMs,
                name,
                note
            });
            setLabels(prev => [
                ...prev,
                {
                    annotationId: res.annotationId,
                    startTimeMs: res.startTimeMs,
                    endTimeMs: res.endTimeMs,
                    labelName: res.labelName,
                    note: res.note || null
                }
            ]);
        } catch (e) {
            console.error('Create label failed', e);
            alert('Failed to create label: ' + (e.message || e));
        } finally {
            setSelectionForModal(null);
        }
    };

    const handleExport = async () => {
        if (!sessionId) return;
        try {
            await fetchExportLabel(sessionId);
        } catch (e) {
            console.error(e);
            alert('Export failed: ' + e.message);
        }
    };

    const handleChannelChange = async (event) => {
        const newChannelId = Number(event.target.value);
        if (!newChannelId || newChannelId === channelId) return;
        setLoading(true);
        try {
            const sig = await fetchChannelSamples(newChannelId);
            onChannelSelected(newChannelId);
            if (sig) {
                setSamples(sig.samples || []);
                setSamplingRate(sig.samplingRateHz || null);
                setDurationMs(
                    sig.durationMs || (sig.samples?.length ? sig.samples[sig.samples.length - 1].time : null)
                );
                const ann = sig.annotations
                    ? Array.isArray(sig.annotations)
                        ? sig.annotations
                        : [sig.annotations]
                    : [];
                setLabels(
                    ann.map(a => ({
                        annotationId: a.annotationId,
                        startTimeMs: a.startTimeMs,
                        endTimeMs: a.endTimeMs,
                        labelName: a.label?.name || a.labelName || 'Unknown',
                        note: a.note || null,
                        label: a.label || null
                    }))
                );
                resetViewport();
            } else {
                setSamples([]);
                setLabels([]);
            }
        } catch (e) {
            console.error('Failed to load channel:', e);
            alert('Failed to load channel: ' + (e.message || e));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="left-panel">
            <div className="left-panel-toolbar">
                <button className="back-btn" onClick={onBack}>Back</button>
                <div className="toolbar-group">
                    {channels.length > 0 && (
                        <div className="channel-selector">
                            <label htmlFor="channel-select">Channel:</label>
                            <select
                                id="channel-select"
                                value={channelId || ''}
                                onChange={handleChannelChange}
                                disabled={loading || channels.length === 0}
                            >
                                {channels.map(ch => (
                                    <option key={ch.channelId} value={ch.channelId}>
                                        #{ch.channelNumber} {ch.dataKind}
                                        {ch.sweepIndex !== null ? ` (Sweep ${ch.sweepIndex})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    <button onClick={resetViewport}>Reset Zoom</button>
                    <button onClick={handleExport}>Export Labels</button>
                </div>
            </div>

            <div className="chart-wrapper">
                <SignalChart
                    samples={samples}
                    existingLabels={labels}
                    samplingRateHz={samplingRate}
                    durationMs={durationMs}
                    viewport={viewport}
                    onViewportChange={updateViewport}
                    channelId={channelId}
                />
            </div>
        </div>
    );
};