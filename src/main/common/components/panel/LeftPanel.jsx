import React, { useEffect, useState } from 'react';
import {
    fetchSessionDashboard,
    fetchCreateLabel,
    fetchExportLabel
} from '../../api/index.js';
import LabelModal from '../label/LabelModal.jsx';
import { useSignalViewport } from '../../hooks/useSignalViewport.js';
import LabelView from '../table/LabelView.jsx';
import './LeftPanel.css';
import SignalChart from "./chart/SignalChart.jsx";

export default function LeftPanel ({ sessionId, onBack }) {
    const [loading, setLoading] = useState(false);
    const [session, setSession] = useState(null);
    const [channelId, setChannelId] = useState(null);
    const [samples, setSamples] = useState([]);
    const [samplingRate, setSamplingRate] = useState(null);
    const [durationMs, setDurationMs] = useState(null);
    const [labels, setLabels] = useState([]);
    const [selectionForModal, setSelectionForModal] = useState(null);

    const { viewport, updateViewport, resetViewport } = useSignalViewport(durationMs);

    useEffect(() => {
        if (!sessionId) return;
        setLoading(true);
        fetchSessionDashboard(sessionId)
            .then(data => {
                setSession(data.session);
                const sig = data.defaultChannel?.signal;
                const cid = data.defaultChannel?.channelId || null;
                setChannelId(cid);
                if (sig) {
                    setSamples(sig.samples || []);
                    setSamplingRate(sig.samplingRateHz || null);
                    setDurationMs(
                        sig.durationMs ||
                        (sig.samples?.length ? sig.samples[sig.samples.length - 1].time : null)
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
                            labelName: a.label?.name || null,
                            note: a.note || null,
                            label: a.label || null
                        }))
                    );
                } else {
                    setSamples([]);
                    setLabels([]);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [sessionId]);

    const handleNewSelection = ({ startMs, endMs }) => {
        setSelectionForModal({ startMs, endMs });
    };

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
            alert('Labels export triggered.');
        } catch (e) {
            console.error(e);
            alert('Export failed: ' + e.message);
        }
    };

    return (
        <div className="left-panel">
            <div className="left-panel-toolbar">
                <button className="back-btn" onClick={onBack}>Back</button>
                <div className="toolbar-group">
                    <button onClick={resetViewport}>Reset Zoom</button>
                    <button onClick={handleExport}>Export Labels</button>
                </div>
            </div>

            <div className="patient-info-box">
                {session ? (
                    <div className="patient-grid">
                        <div><strong>Patient ID:</strong> {session.patientId}</div>
                        <div><strong>Name:</strong> {session.patientFirstName}</div>
                        <div><strong>Gender:</strong> {session.patientGender}</div>
                        <div><strong>Start:</strong> {session.sessionStartTime}</div>
                        <div><strong>End:</strong> {session.sessionEndTime}</div>
                        <div><strong>Channel:</strong> {channelId ?? 'N/A'}</div>
                        <div><strong>Rate(Hz):</strong> {samplingRate ?? 'N/A'}</div>
                        <div><strong>Duration(ms):</strong> {durationMs ?? 'N/A'}</div>
                    </div>
                ) : loading ? <span>Loading...</span> : <span>No session</span>}
            </div>

            <div className="chart-wrapper">
                <SignalChart
                    samples={samples}
                    // labels={labels}
                    samplingRateHz={samplingRate}
                    durationMs={durationMs}
                    viewport={viewport}
                    onViewportChange={updateViewport}
                    channelId={channelId}
                />
            </div>

            <div className="labels-dashboard">
                <h3>Labels</h3>
                <LabelView labels={labels} />
            </div>

            <LabelModal
                selection={selectionForModal}
                onCancel={() => setSelectionForModal(null)}
                onConfirm={handleConfirmLabel}
            />
        </div>
    );
};