export default function StatusBadge({ status }) {
    const statusRaw = (status || '').toUpperCase();

    const statusObj = {
        'NEW': 'New',
        'IN_PROGRESS': 'In Progress',
        'REQUEST_DOUBLE_CHECK': 'Request Double Check',
        'WAIT_FOR_DOUBLE_CHECK': 'Wait for Double Check',
        'STUDENT_COMPLETED': 'Completed',
        'DOCTOR_COMPLETED': 'Completed'
    };

    const statusLabel = statusObj[statusRaw] || statusRaw || '-';

    return (
        <span className={`badge status-${statusRaw.toLowerCase()}`}>
            {statusLabel}
        </span>
    );
}