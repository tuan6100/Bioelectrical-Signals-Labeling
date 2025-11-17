import React from 'react';
import LabelTable from '../table/LabelTable.jsx';
import BottomControl from './control/BottomControl.jsx';
import './RightPanel.css';

const RightPanel = ({
   session,
   annotations,
   channelId,
   tableData,
   onDeleteRow,
   onAddLabel,
   onSave,
   isLabeled,
   isDoubleChecked,
   onToggleLabeled,
   onToggleDoubleChecked,
   onLabelChange
}) => {
    return (
        <div className="right-panel-root">
            <div className="right-panel-toolbar">
                <div className="toolbar-title">Label Tools</div>
                <div className="toolbar-actions">
                </div>
            </div>

            <div className="panel-box">
                {session ? (
                    <div className="patient-grid">
                        <div><strong>Tên bệnh nhân:</strong> {session.patientFirstName}</div>
                        <div><strong>Giới tính:</strong> {session.patientGender  === 'M' ? 'Nam': 'Nữ'}</div>
                        <div><strong>Bắt đầu:</strong> {session.sessionStartTime}</div>
                        <div><strong>Kết thúc:</strong> {session.sessionEndTime}</div>
                    </div>
                ) : <span className="muted">No session</span>}
            </div>

            <div className="right-panel-content">
                <div className="panel-box panel-table">
                    <LabelTable
                        data={(Array.isArray(annotations) && annotations.length > 0) ? annotations : tableData}
                        onDeleteRow={onDeleteRow}
                        onLabelChange={onLabelChange}
                        channelId={channelId}
                    />
                </div>

                <BottomControl
                    onAddLabel={onAddLabel}
                    onSave={onSave}
                    isLabeled={isLabeled}
                    isDoubleChecked={isDoubleChecked}
                    onToggleLabeled={onToggleLabeled}
                    onToggleDoubleChecked={onToggleDoubleChecked}
                />
            </div>
        </div>
    );
};

export default RightPanel;