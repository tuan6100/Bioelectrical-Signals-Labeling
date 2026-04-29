import { useState, useEffect } from 'react'
import './BottomControl.css'
import {
    fetchUpdateSessionStatus,
    fetchEnableDoubleCheck,
    fetchSetChannelDoubleChecked, fetchDisableDoubleCheck
} from "../../api/index.js"

export default function BottomControl({ session, channelId, channelDoubleChecked, hasPendingRevisions }) {
    const { sessionId } = session
    const [currentStatus, setCurrentStatus] = useState(session.sessionStatus)
    const [isCompleted, setIsCompleted] = useState(false)
    const [isChannelChecked, setIsChannelChecked] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)

    const [viewMode] = useState(() => {
        if (['WAIT_FOR_DOUBLE_CHECK', 'DOCTOR_COMPLETED'].includes(session.sessionStatus)) {
            return 'DOCTOR';
        }
        return 'STUDENT';
    });
    const isDoctorView = viewMode === 'DOCTOR';
    const isRevisionState = currentStatus === 'NEEDS_REVISION';
    const isStudentWaiting = currentStatus === 'REQUEST_DOUBLE_CHECK';

    useEffect(() => {
        setCurrentStatus(session.sessionStatus)
    }, [session.sessionStatus])

    useEffect(() => {
        if (window.biosignalApi?.on?.sessionStatusUpdated) {
            const unsubscribe = window.biosignalApi.on.sessionStatusUpdated((updatedSession) => {
                if (updatedSession.sessionId === sessionId) {
                    console.log("Event received: Status updated to", updatedSession.status);
                    setCurrentStatus(updatedSession.status);
                    setIsProcessing(false);
                }
            });
            return () => unsubscribe();
        }
    }, [sessionId]);

    useEffect(() => {
        const completed = ['STUDENT_COMPLETED', 'DOCTOR_COMPLETED'].includes(currentStatus)
        setIsCompleted(completed)

        if (currentStatus === 'DOCTOR_COMPLETED') {
            setIsChannelChecked(true)
        } else {
            setIsChannelChecked(!!channelDoubleChecked)
        }
    }, [currentStatus, channelDoubleChecked, channelId])

    const onToggleTopButton = async (checked) => {
        if (isProcessing) return;
        setIsProcessing(true);

        try {
            let newStatus;

            if (isDoctorView) {
                if (checked) {
                    newStatus = 'NEEDS_REVISION';
                } else {
                    newStatus = 'WAIT_FOR_DOUBLE_CHECK';
                }
            } else {
                if (isRevisionState) {
                    newStatus = checked ? 'REQUEST_DOUBLE_CHECK' : 'NEEDS_REVISION';
                } else {
                    newStatus = checked ? 'STUDENT_COMPLETED' : 'IN_PROGRESS';
                }
            }

            await fetchUpdateSessionStatus(sessionId, newStatus)
        } catch (error) {
            console.error("Update status failed:", error);
            setIsProcessing(false);
        }
    }

    const onToggleDoubleCheck = async (checked) => {
        if (isProcessing) return;
        setIsProcessing(true);

        try {
            if (isDoctorView) {
                await fetchSetChannelDoubleChecked(sessionId, channelId, checked)
                setIsChannelChecked(checked)
                setIsProcessing(false);
            } else {
                if (!isStudentWaiting && checked) {
                    await fetchEnableDoubleCheck(channelId)
                } else if (isStudentWaiting && !checked) {
                    await fetchDisableDoubleCheck(channelId)
                }
            }
        } catch (err) {
            console.error(err);
            setIsProcessing(false);
        }
    }

    let topButtonLabel = "Mark as completed"
    let isTopButtonChecked = isCompleted
    let isTopButtonDisabled = isProcessing || isStudentWaiting

    let doubleCheckLabel = "Enable double check"
    let isDoubleCheckChecked = isStudentWaiting
    let isDoubleCheckDisabled = isProcessing || isCompleted
    if (isDoctorView) {
        topButtonLabel = "Request Revision"
        isTopButtonChecked = isRevisionState;
        doubleCheckLabel = "Mark as double-checked"
        isDoubleCheckChecked = isChannelChecked
        isDoubleCheckDisabled = isProcessing
    }

    else {
        if (isRevisionState) {
            topButtonLabel = "Mark as revised"
            isTopButtonChecked = false
            if (hasPendingRevisions) {
                isTopButtonDisabled = true;
            }
            doubleCheckLabel = "Double check enabled"
            isDoubleCheckChecked = true
            isDoubleCheckDisabled = true
        } else if (isStudentWaiting) {
            doubleCheckLabel = "Waiting for double check"
        }
    }

    return (
        <div className="bottom-controls">
            <div className="toggle">
                <label>{topButtonLabel}</label>
                <input
                    type="checkbox"
                    checked={isTopButtonChecked}
                    onChange={(e) => onToggleTopButton(e.target.checked)}
                    disabled={isTopButtonDisabled}
                    style={{ cursor: isTopButtonDisabled ? 'not-allowed' : 'pointer' }}
                    title={isTopButtonDisabled && hasPendingRevisions ? "Please resolve all revision requests first" : ""}
                />
            </div>
            <div className="toggle">
                <label>{doubleCheckLabel}</label>
                <input
                    type="checkbox"
                    checked={isDoubleCheckChecked}
                    onChange={(e) => onToggleDoubleCheck(e.target.checked)}
                    disabled={isDoubleCheckDisabled}
                    style={{ cursor: isDoubleCheckDisabled ? 'default' : 'pointer' }}
                />
            </div>
        </div>
    )
}