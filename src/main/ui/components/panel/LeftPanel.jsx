import React from 'react';
import {fetchExportAllLabelInChannel} from '../../api/index.js';
import { useSignalViewport } from '../../hooks/useSignalViewport.js';
import './LeftPanel.css';
import SignalChart from "../chart/SignalChart.jsx";

export default function LeftPanel({
    sessionId,
    channelId,
    channels,
    defaultSignal,
    onChannelSelected,
    loading,
    labels: propLabels
}) {
    const { viewport, updateViewport, resetViewport } = useSignalViewport(defaultSignal?.durationMs);

    const handleExport = async () => {
        if (!sessionId) return;
        try {
            await fetchExportAllLabelInChannel(sessionId, channelId, 'xlsx')
        } catch (e) {
            console.error(e);
            alert('Export failed: ' + e.message);
        }
    };

    const handleChannelChange = (event) => {
        const newChannelId = Number(event.target.value);
        if (!newChannelId || newChannelId === channelId) return;
        onChannelSelected(newChannelId);
    };

    return (
        <div className="left-panel">
            <div className="left-panel-toolbar">
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
                                        {ch.channelNumber}
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
                {loading || !defaultSignal ? (
                    <div className="table-placeholder">
                        <div className="table-spinner" />
                        <div>Loading signal...</div>
                    </div>
                ) : (
                    <SignalChart
                        samples={defaultSignal.samples || []}
                        existingLabels={propLabels}
                        samplingRateHz={defaultSignal.samplingRateHz}
                        durationMs={defaultSignal.durationMs}
                        viewport={viewport}
                        onViewportChange={updateViewport}
                        channelId={channelId}
                    />
                )}
            </div>
        </div>
    );
};