import SessionRow from './SessionRow';

export default function SessionsTable({ sessions, onOpenSession, onDelete }) {
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
                        <th style={{ padding: '12px', textAlign: 'center' }}>No</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>Patient Name</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>Patient ID</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>Start Time</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>File Name</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>Checked</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>Double-checked</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>Status</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
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