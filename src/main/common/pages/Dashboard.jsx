import React, { useState } from "react";
import LeftPanel from "../components/panel/LeftPanel.jsx";
import RightPanel from "../components/panel/RightPanel.jsx";
import './Dashboard.css';

export default function Dashboard({ sessionId }) {
    const [startPosition, setStartPosition] = useState(1);
    const [tableData, setTableData] = useState([
        {
            id: 1,
            startSecond: 'Từ giây 116.8',
            endSecond: 'Đến giây 118.6',
            label1: '',
            label2: '',
            label3: '',
            label4: '',
            label5: ''
        }
    ]);
    const [isLabeled, setIsLabeled] = useState(false);
    const [isDoubleChecked, setIsDoubleChecked] = useState(false);
    const [isWorkspaceExpanded, setIsWorkspaceExpanded] = useState(false);

    const handleBack = () => console.log('Quay trở lại');
    const handleSetup = () => console.log('Setup từ vị trí:', startPosition);
    const handleUpload = () => console.log('Upload CSV');
    const handleDownload = () => console.log('Download data');

    const handleDeleteRow = (id) =>
        setTableData(tableData.filter(row => row.id !== id));

    const handleAddLabel = () => {
        const newLabel = {
            id: Date.now(),
            startSecond: '',
            endSecond: '',
            label1: '',
            label2: '',
            label3: '',
            label4: '',
            label5: ''
        };
        setTableData([...tableData, newLabel]);
    };

    const handleSave = () => console.log('Lưu kết quả:', tableData);

    const handleLabelChange = (rowId, labelField, value) => {
        setTableData(tableData.map(row =>
            row.id === rowId ? { ...row, [labelField]: value } : row
        ));
    };

    return (
        <div className={`dashboard-root ${isWorkspaceExpanded ? 'expanded' : ''}`}>
            <div className="workspace-header">
                <h1>EMG Labeling Preview</h1>
                <button
                    className="toggle-workspace-btn"
                    onClick={() => setIsWorkspaceExpanded(exp => !exp)}
                >
                    {isWorkspaceExpanded ? 'Show Right Panel' : 'Expand Workspace'}
                </button>
            </div>
            <div className="dashboard-panels">
                <div className={`panel-left ${isWorkspaceExpanded ? 'full-width' : ''}`}>
                    <LeftPanel sessionId={sessionId} onBack={handleBack} />
                </div>
                {!isWorkspaceExpanded && (
                    <div className="panel-right">
                        <RightPanel
                            startPosition={startPosition}
                            onStartPositionChange={setStartPosition}
                            onSetup={handleSetup}
                            onUpload={handleUpload}
                            onDownload={handleDownload}
                            tableData={tableData}
                            onDeleteRow={handleDeleteRow}
                            onAddLabel={handleAddLabel}
                            onSave={handleSave}
                            isLabeled={isLabeled}
                            isDoubleChecked={isDoubleChecked}
                            onToggleLabeled={setIsLabeled}
                            onToggleDoubleChecked={setIsDoubleChecked}
                            onLabelChange={handleLabelChange}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}