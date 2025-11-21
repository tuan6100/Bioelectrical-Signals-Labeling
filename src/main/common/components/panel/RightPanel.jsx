import React from 'react';
import LabelTable from '../table/LabelTable.jsx';
import BottomControl from '../control/BottomControl.jsx';
import './RightPanel.css';
import TopControl from "../control/TopControl.jsx";

const RightPanel = ({
   session,
   annotations,
   channelId,
   tableData,
   isLabeled,
   isDoubleChecked,
   onToggleLabeled,
   onToggleDoubleChecked,
}) => {

    return (
        <div className="right-panel-root">
            <TopControl />

            <div className="panel-box">
                {session ? (
                    <div className="patient-grid">
                        <div><strong>Patient name:</strong> {session.patientFirstName}</div>
                        <div><strong>Gender:</strong> {session.patientGender  === 'M' ? 'Male': 'Female'}</div>
                        <div><strong>Start time:</strong> {session.sessionStartTime}</div>
                        <div><strong>End time:</strong> {session.sessionEndTime}</div>
                    </div>
                ) : <span className="muted">No session</span>}
            </div>

            <div className="right-panel-content">
                <div className="panel-box panel-table">
                    <LabelTable
                        data={(Array.isArray(annotations) && annotations.length > 0) ? annotations : tableData}
                        channelId={channelId}
                    />
                </div>

                <BottomControl
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