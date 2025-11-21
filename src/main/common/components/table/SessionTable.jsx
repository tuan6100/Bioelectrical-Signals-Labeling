import './SessionTable.css'

export default function SessionTable({ session, onClick }) {
    const {
        sessionId,
        measurementType,
        startTime,
        endTime,
        inputFileName,
        updatedAt,
        patient
    } = session;
    const patientId = patient?.id;
    const patientName = patient?.name;

    function formatDateRange(start, end) {
        if (!start && !end) return "-";
        return `${start} --> ${end}`
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
        <button onClick={onClick} className="session-item">
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