import SessionRow from './SessionRow';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSort, faSortUp, faSortDown } from '@fortawesome/free-solid-svg-icons';

export default function SessionsTable({ sessions, onOpenSession, onDelete, sortConfig, onSort }) {
    const getSortIcon = (key) => {
        if (!sortConfig || sortConfig.key !== key) {
            return faSort;
        }
        return sortConfig.direction === 'asc' ? faSortUp : faSortDown;
    };

    const handleSort = (key) => {
        if (onSort) {
            onSort(key);
        }
    };

    return (
        <div style={{
            flex: 1,
            overflowY: 'auto',
            border: '1px solid #eee',
            borderRadius: '4px'
        }}>
            <table className="sessions-table" style={{
                width: '100%',
                borderCollapse: 'collapse'
            }}>
                <thead style={{
                    position: 'sticky',
                    top: 0,
                    backgroundColor: '#f8f9fa',
                    zIndex: 1,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}>
                <tr>
                    <th style={{ padding: '12px', textAlign: 'center', width: '60px' }}>No</th>
                    <th style={{ padding: '12px', textAlign: 'center', cursor: 'pointer', minWidth: '150px' }} onClick={() => handleSort('patientName')}>
                        Patient Name <FontAwesomeIcon icon={getSortIcon('patientName')} style={{ marginLeft: '5px', fontSize: '0.8em' }} />
                    </th>
                    <th style={{ padding: '12px', textAlign: 'center', cursor: 'pointer', minWidth: '120px' }} onClick={() => handleSort('patientId')}>
                        Patient ID <FontAwesomeIcon icon={getSortIcon('patientId')} style={{ marginLeft: '5px', fontSize: '0.8em' }} />
                    </th>
                    <th style={{ padding: '12px', textAlign: 'center', cursor: 'pointer', minWidth: '150px' }} onClick={() => handleSort('startTime')}>
                        Start Time <FontAwesomeIcon icon={getSortIcon('startTime')} style={{ marginLeft: '5px', fontSize: '0.8em' }} />
                    </th>
                    <th style={{ padding: '12px', textAlign: 'center', cursor: 'pointer', minWidth: '180px' }} onClick={() => handleSort('fileName')}>
                        File Name <FontAwesomeIcon icon={getSortIcon('fileName')} style={{ marginLeft: '5px', fontSize: '0.8em' }} />
                    </th>
                    <th style={{ padding: '12px', textAlign: 'center', cursor: 'pointer', minWidth: '150px' }} onClick={() => handleSort('doubleChecked')}>
                        Double-checked <FontAwesomeIcon icon={getSortIcon('doubleChecked')} style={{ marginLeft: '5px', fontSize: '0.8em' }} />
                    </th>
                    <th style={{ padding: '12px', textAlign: 'center', cursor: 'pointer', minWidth: '140px' }} onClick={() => handleSort('status')}>
                        Status <FontAwesomeIcon icon={getSortIcon('status')} style={{ marginLeft: '5px', fontSize: '0.8em' }} />
                    </th>
                    <th style={{ padding: '12px', textAlign: 'center', width: '100px' }}>Actions</th>
                </tr>
                </thead>
                <tbody>
                {sessions.map((session, idx) => (
                    <SessionRow
                        key={session.sessionId}
                        session={session}
                        index={idx}
                        onOpenSession={onOpenSession}
                        onDelete={onDelete}
                    />
                ))}
                </tbody>
            </table>
        </div>
    );
}