import { useState, useEffect } from 'react';
import './BottomControl.css'
import {fetchUpdateSessionStatus} from "../../api/index.js";

export default function BottomControl({ session }) {
    const { sessionId, sessionStatus } = session;
    const [isLabeled, setIsLabeled] = useState(false);
    const [isDoubleChecked, setIsDoubleChecked] = useState(false);

    useEffect(() => {
        setIsLabeled(sessionStatus === 'COMPLETED');
    }, [sessionStatus]);

    const onToggleLabeled = async (checked) => {
        const newStatus = checked ? 'COMPLETED' : 'IN_PROGRESS';
        await fetchUpdateSessionStatus(sessionId, newStatus);
        setIsLabeled(checked);
    };

    const onToggleDoubleChecked = async (checked) => {
        setIsDoubleChecked(checked);
    };

    return (
        <div className="bottom-controls">
            <div className="toggle">
                <label>Mark as completed</label>
                <input
                    type="checkbox"
                    checked={isLabeled}
                    onChange={(e) => onToggleLabeled(e.target.checked)}
                />
                <label>Mark as double-checked</label>
                <input
                    type="checkbox"
                    checked={isDoubleChecked}
                    onChange={(e) => onToggleDoubleChecked(e.target.checked)}
                />
            </div>
        </div>
    );
};
