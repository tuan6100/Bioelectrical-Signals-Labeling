import React, {useEffect} from 'react';
import LabelTable from '../table/LabelTable.jsx';
import BottomControl from '../control/BottomControl.jsx';
import './RightPanel.css';
import TopControl from "../control/TopControl.jsx";

export default function RightPanel({
   session,
   annotations,
   channelId
}) {

    return (
        <div className="right-panel-root">
            {session ? (
                <>
                    <TopControl
                        sessionId={session.sessionId}
                    />

                    <div className="panel-box">
                        <div className="patient-grid">
                            <div><strong>Patient name:</strong> {session.patientFirstName}</div>
                            <div><strong>Gender:</strong> {session.patientGender === 'M' ? 'Male' : 'Female'}</div>
                            <div><strong>Start time:</strong> {session.sessionStartTime}</div>
                            <div><strong>End time:</strong> {session.sessionEndTime}</div>
                        </div>
                    </div>

                    <div className="right-panel-content">
                        <div className="panel-box panel-table">
                            <LabelTable
                                channelId={channelId}
                                annotations={annotations}
                            />
                        </div>
                        <BottomControl
                            session={session}
                        />
                    </div>
                </>
            ) : (
                <div className="no-session-placeholder">
                    <span className="muted">No session selected</span>
                </div>
            )}
        </div>
    );
}