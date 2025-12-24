    import { useState, useEffect } from 'react'
import './BottomControl.css'
import {
    fetchUpdateSessionStatus,
    fetchEnableDoubleCheck,
    fetchSetChannelDoubleChecked
} from "../../api/index.js"

export default function BottomControl({ session, channelId, channelDoubleChecked }) {
    const { sessionId, sessionStatus } = session
    const [isCompleted, setIsCompleted] = useState(false)
    const [isChannelChecked, setIsChannelChecked] = useState(false)

    const isDoctorMode = sessionStatus === 'WAIT_FOR_DOUBLE_CHECK'
    const isStudentWaiting = sessionStatus === 'REQUEST_DOUBLE_CHECK'

    useEffect(() => {
        setIsCompleted(sessionStatus === 'COMPLETED')
    }, [sessionStatus])

    useEffect(() => {
        setIsChannelChecked(!!channelDoubleChecked)
    }, [channelDoubleChecked, channelId])

    const onToggleCompleted = async (checked) => {
        try {
            const newStatus = checked ? 'COMPLETED' : 'IN_PROGRESS'
            await fetchUpdateSessionStatus(sessionId, newStatus)
            setIsCompleted(checked)
        } catch (error) {
            console.error("Failed to update status:", error)
            alert(error.message || "Cannot complete session yet.")
            setIsCompleted(!checked)
        }
    }

    const handleDoubleCheckAction = async (checked) => {
        try {
            if (isDoctorMode) {
                await fetchSetChannelDoubleChecked(sessionId, channelId, checked)
                setIsChannelChecked(checked)
            } else if (!isStudentWaiting && checked) {
                await fetchEnableDoubleCheck(sessionId)
            } else if (isStudentWaiting && !checked) {
                await fetchUpdateSessionStatus(sessionId, 'IN_PROGRESS')
            }
        } catch (err) {
            console.error(err)
            setIsChannelChecked(prev => prev)
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
                    disabled={isStudentWaiting}
                />
            </div>
            <div className="toggle">
                <label>{doubleCheckLabel}</label>
                <input
                    type="checkbox"
                    checked={isDoctorMode ? isChannelChecked : isStudentWaiting}
                    onChange={(e) => handleDoubleCheckAction(e.target.checked)}
                />
            </div>
        </div>
    )
}