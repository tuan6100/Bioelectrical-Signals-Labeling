import StatusBadge from './StatusBadge';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";

export default function SessionRow({ session, index, onOpenSession, onDelete }) {
    const no = index + 1;
    const statusRaw = (session.status || '').toUpperCase();
    const patientId = session.patient?.id ?? session.patientId ?? '-';
    const patientName = session.patient?.name ?? session.patientName ?? '-';
    const isChecked = ['STUDENT_COMPLETED', 'DOCTOR_COMPLETED'].includes(statusRaw);
    const isDoubleChecked = session.isDoubleChecked || false;

    const handleDelete = (e) => {
        e.stopPropagation();
        onDelete(session.sessionId);
    };

    return (
        <tr
            key={session.sessionId}
            className={`session-row session-status-${(session.status || '').toLowerCase()}`}
            onClick={() => onOpenSession(session.sessionId)}
            style={{ cursor: 'pointer', borderBottom: '1px solid #eee' }}
        >
            <td style={{ padding: '10px' }}>{no}</td>
            <td style={{ padding: '10px' }}>{patientName}</td>
            <td style={{ padding: '10px' }}>{patientId}</td>
            <td style={{ padding: '10px' }}>{session.startTime || '-'}</td>
            <td style={{ padding: '10px' }}>{session.inputFileName || '-'}</td>
            <td style={{ padding: '10px', textAlign: 'center' }}>
                {isChecked ? '✓' : ''}
            </td>
            <td style={{ padding: '10px', textAlign: 'center' }}>
                {isDoubleChecked ? '✓' : ''}
            </td>
            <td style={{ padding: '10px' }}>
                <StatusBadge status={session.status} />
            </td>
            <td style={{ padding: '10px', textAlign: 'center' }}>
                <button
                    onClick={handleDelete}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#dc3545',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        padding: '5px 10px',
                        transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.color = '#a02622'}
                    onMouseLeave={(e) => e.target.style.color = '#dc3545'}
                    title="Delete session"
                >
                    <FontAwesomeIcon icon={faTrash} />
                </button>
            </td>
        </tr>
    );
}