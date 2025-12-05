import { useState, useEffect } from 'react';
import './SessionTable.css';

export default function SessionTable({ session: initialSession, onClick }) {
    const [session, setSession] = useState(initialSession);

    useEffect(() => {
        if (window.biosignalApi?.on?.sessionStatusUpdated) {
            const unsubscribe = window.biosignalApi.on.sessionStatusUpdated(updatedSession => {
                if (updatedSession.sessionId === session.sessionId) {
                    setSession(prev => ({
                        ...prev,
                        status: updatedSession.status,
                        updatedAt: updatedSession.updatedAt
                    }));
                }
            });
            return () => unsubscribe();
        }
    }, [session.sessionId]);

    const {
        sessionId,
        measurementType,
        startTime,
        endTime,
        inputFileName,
        updatedAt,
        patient,
        status
    } = session;
    const patientId = patient?.id;
    const patientName = patient?.name;

    function formatDateRange(start, end) {
        if (!start && !end) return "-";
        return `${start} → ${end}`
    }

    function formatRelative(dateStr) {
        if (!dateStr) return "-";
        try {
            const d = new Date(dateStr);
            const diff = Date.now() - d.getTime();
            const mins = Math.round(diff / 60000);
            if (mins < 1) return "just now";
            if (mins < 60) return `${mins} min ago`;
            const hours = Math.round(mins / 60);
            if (hours < 24) return `${hours} hr ago`;
            const days = Math.round(hours / 24);
            return `${days} day${days > 1 ? "s" : ""} ago`;
        } catch {
            return dateStr;
        }
    }

    return (
        <button onClick={onClick} className={`session-item session-status-${status?.toLowerCase()}`}>
            <div className="session-item-row-top">
                <span className="session-item-title">Session #{sessionId}</span>
                <span className="session-item-badge">{measurementType || "Unknown"}</span>
            </div>
            <div className="session-item-row">
                <span className="session-item-label">Patient:</span>
                <span className="session-item-value">{patientName ? `${patientName} (#${patientId})` : (patientId ?? "-")}</span>
            </div>
            <div className="session-item-row">
                <span className="session-item-label">File:</span>
                <span className="session-item-value" title={inputFileName || ""}>
                    {inputFileName || "-"}
                </span>
            </div>
            <div className="session-item-row">
                <span className="session-item-label">Time:</span>
                <span className="session-item-value">
                    {formatDateRange(startTime, endTime)}
                </span>
            </div>
            <div className="session-item-updated">
                Updated {formatRelative(updatedAt)}
            </div>
        </button>
    );
}
