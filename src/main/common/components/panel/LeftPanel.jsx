import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchExportLabel } from '../../api/index.js';
import { useSignalViewport } from '../../hooks/useSignalViewport.js';
import './LeftPanel.css';
import SignalChart from "../chart/SignalChart.jsx";
import ChartToolbar from '../chart/ChartToolbar.jsx';

export default function LeftPanel({
   sessionId,
   channels,
   channelId,
   defaultSignal,
   onChannelSelected,
   loading,
   labels: propLabels
}) {
    const navigate = useNavigate();
    const [samples, setSamples] = useState([]);
    const [samplingRate, setSamplingRate] = useState(null);
    const [durationMs, setDurationMs] = useState(null);
    const [labels, setLabels] = useState(propLabels || []);

    const { viewport, updateViewport, resetViewport } = useSignalViewport(durationMs);

    useEffect(() => {
        setLabels(propLabels || []);
    }, [propLabels]);

    useEffect(() => {
        if (!defaultSignal) {
            setSamples([]);
            setSamplingRate(null);
            setDurationMs(null);
            setLabels([]);
            return;
        }
        const sig = defaultSignal;
        console.log(sig)
        setSamples(sig.samples || []);
        setSamplingRate(sig.samplingRateHz || null);
        setDurationMs(sig.durationMs);
        resetViewport();
    }, [defaultSignal, resetViewport]);


    const handleExport = async () => {
        if (!sessionId) return;
        try {
            await fetchExportLabel(sessionId);
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
                <button className="back-btn" onClick={() => navigate('/')}>Back</button>
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
                <ChartToolbar />
            </div>
        </div>
    );
};