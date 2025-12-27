export default function ActionToolbar({ onImportRaw, onImportReviewed, onOpenFolder }) {
    return (
        <div className="dashboard-toolbar" style={{ 
            display: 'flex', 
            gap: '10px', 
            marginBottom: '15px', 
            justifyContent: 'flex-end'
        }}>
            <button
                className="primary-btn"
                onClick={onImportRaw}
            >
                Import Raw Data
            </button>

            <button
                className="primary-btn"
                onClick={onImportReviewed}
            >
                Import Reviewed Data
            </button>

            <button
                className="secondary-btn"
                onClick={onOpenFolder}
            >
                Open Folder
            </button>
        </div>
    );
}