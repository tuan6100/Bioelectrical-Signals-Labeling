import React, { useEffect, useState } from 'react';
import {fetchExportAllLabelInChannel} from '../../api/index.js';
import { useSignalViewport } from '../../hooks/useSignalViewport.js';
import './LeftPanel.css';
import SignalChart from "../chart/SignalChart.jsx";

// LeftPanel.jsx
export default function LeftPanel({
    sessionId,
    channelId,
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
            {/* ... Toolbar giữ nguyên ... */}
            <div className="chart-wrapper">
                {loading || !defaultSignal ? (
                    <div className="table-placeholder">
                        <div className="table-spinner" />
                        <div>Loading signal...</div>
                    </div>
                ) : (
                    <SignalChart
                        samples={defaultSignal.samples || []} // Dùng trực tiếp
                        existingLabels={propLabels}          // Dùng trực tiếp
                        samplingRateHz={defaultSignal.samplingRateHz} // Dùng trực tiếp
                        durationMs={defaultSignal.durationMs}        // Dùng trực tiếp
                        viewport={viewport}
                        onViewportChange={updateViewport}
                        channelId={channelId}
                    />
                )}
            </div>
        </div>
    );
};