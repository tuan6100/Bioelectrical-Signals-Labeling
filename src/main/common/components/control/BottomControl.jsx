import { useState, useEffect } from 'react'
import './BottomControl.css'
import {
    fetchUpdateSessionStatus,
    fetchEnableDoubleCheck,
    fetchSetChannelDoubleChecked, fetchDisableDoubleCheck
} from "../../api/index.js"

export default function BottomControl({ session, channelId, channelDoubleChecked }) {
    const { sessionId } = session
    const [currentStatus, setCurrentStatus] = useState(session.sessionStatus)
    const [isCompleted, setIsCompleted] = useState(false)
    const [isChannelChecked, setIsChannelChecked] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)

    const isDoctorMode = currentStatus === 'WAIT_FOR_DOUBLE_CHECK' || currentStatus === 'COMPLETED'
    const isStudentWaiting = currentStatus === 'REQUEST_DOUBLE_CHECK'

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
        setIsCompleted(currentStatus === 'COMPLETED')
    }, [currentStatus])

    useEffect(() => {
        setIsChannelChecked(!!channelDoubleChecked)
    }, [channelDoubleChecked, channelId])

    const onToggleCompleted = async (checked) => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            const newStatus = checked ? 'COMPLETED' : (isDoctorMode ? 'WAIT_FOR_DOUBLE_CHECK' : 'IN_PROGRESS')
            await fetchUpdateSessionStatus(sessionId, newStatus)
            setIsCompleted(checked)
            setCurrentStatus(newStatus)
        } catch (error) {
            setIsCompleted(!checked)
            console.error(error)
        } finally {
            setIsProcessing(false);
        }
    }

    const onToggleDoubleCheck = async (checked) => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            if (isDoctorMode) {
                await fetchSetChannelDoubleChecked(sessionId, channelId, checked)
                setIsChannelChecked(checked)
                if (!checked && currentStatus === 'COMPLETED') {
                    const revertStatus = 'WAIT_FOR_DOUBLE_CHECK'
                    await fetchUpdateSessionStatus(sessionId, revertStatus)
                    setCurrentStatus(revertStatus)
                    setIsCompleted(false)
                }
            } else if (!isStudentWaiting && checked) {
                await fetchEnableDoubleCheck(channelId)
            } else if (isStudentWaiting && !checked) {
                await fetchDisableDoubleCheck(channelId)
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsProcessing(false);
        }
    }

    let doubleCheckLabel = "Enable double check"
    if (isDoctorMode) doubleCheckLabel = "Mark as double-checked"
    if (isStudentWaiting) doubleCheckLabel = "Waiting for double check"

    return (
        <div className="bottom-controls">
            <div className="toggle">
                <label>Mark as completed</label>
                <input
                    type="checkbox"
                    checked={isCompleted}
                    onChange={(e) => onToggleCompleted(e.target.checked)}
                    disabled={isProcessing || (isDoctorMode && !isChannelChecked)}
                />
            </div>
            <div className="toggle">
                <label>{doubleCheckLabel}</label>
                <input
                    type="checkbox"
                    checked={isDoctorMode ? isChannelChecked : isStudentWaiting}
                    onChange={(e) => onToggleDoubleCheck(e.target.checked)}
                    disabled={isProcessing}
                    style={{ cursor: isProcessing ? 'wait' : 'pointer' }}
                />
            </div>
        </div>
    )
}