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

    // Xác định Mode dựa trên State hiện tại (được đồng bộ từ Backend)
    const isDoctorMode = ['WAIT_FOR_DOUBLE_CHECK', 'DOCTOR_COMPLETED'].includes(currentStatus)
    const isStudentWaiting = currentStatus === 'REQUEST_DOUBLE_CHECK'

    // 1. Đồng bộ State khi Props thay đổi (ví dụ khi mở session khác)
    useEffect(() => {
        setCurrentStatus(session.sessionStatus)
    }, [session.sessionStatus])

    // 2. Lắng nghe sự kiện từ Backend để cập nhật State
    // ĐÂY LÀ NGUỒN SỰ THẬT DUY NHẤT (Single Source of Truth)
    useEffect(() => {
        if (window.biosignalApi?.on?.sessionStatusUpdated) {
            const unsubscribe = window.biosignalApi.on.sessionStatusUpdated((updatedSession) => {
                if (updatedSession.sessionId === sessionId) {
                    console.log("Event received: Status updated to", updatedSession.status);
                    setCurrentStatus(updatedSession.status);

                    // Khi nhận được tín hiệu từ Backend, tắt loading
                    setIsProcessing(false);
                }
            });
            return () => unsubscribe();
        }
    }, [sessionId]);

    // 3. Cập nhật UI (checkbox) dựa trên currentStatus mới nhận được
    useEffect(() => {
        const completed = ['STUDENT_COMPLETED', 'DOCTOR_COMPLETED'].includes(currentStatus)
        setIsCompleted(completed)

        if (currentStatus === 'DOCTOR_COMPLETED') {
            setIsChannelChecked(true)
        } else {
            setIsChannelChecked(!!channelDoubleChecked)
        }
    }, [currentStatus, channelDoubleChecked, channelId])

    const onToggleCompleted = async (checked) => {
        if (isProcessing) return;
        setIsProcessing(true);

        // --- XOÁ OPTIMISTIC UPDATE ---
        // Không set setIsCompleted(checked) ở đây.
        // Chờ backend trả về event mới cập nhật UI.

        try {
            let newStatus;
            if (checked) {
                newStatus = isDoctorMode ? 'DOCTOR_COMPLETED' : 'STUDENT_COMPLETED';
            } else {
                if (currentStatus === 'DOCTOR_COMPLETED') {
                    newStatus = 'WAIT_FOR_DOUBLE_CHECK';
                } else {
                    newStatus = 'IN_PROGRESS';
                }
            }
            // Gửi request lên Backend
            await fetchUpdateSessionStatus(sessionId, newStatus)

            // --- XOÁ MANUAL STATE UPDATE ---
            // Không gọi setCurrentStatus(newStatus) ở đây.
            // Để useEffect lắng nghe socket tự xử lý.

        } catch (error) {
            console.error("Update status failed:", error);
            // Nếu lỗi, tắt processing để user bấm lại được
            setIsProcessing(false);
        }
        // Lưu ý: Không để setIsProcessing(false) trong finally
        // Vì ta muốn giữ trạng thái loading cho đến khi nhận được event từ backend (ở useEffect số 2)
        // hoặc timeout (nếu cần thiết, nhưng đơn giản thì để ở catch là đủ an toàn cho UX cơ bản)
    }

    const onToggleDoubleCheck = async (checked) => {
        if (isProcessing) return;
        setIsProcessing(true);

        // --- XOÁ OPTIMISTIC UPDATE ---
        // Không set isChannelChecked(checked) ngay lập tức

        try {
            if (isDoctorMode) {
                // Với Doctor mode, checkbox này liên quan đến channel_db
                // Cần cập nhật state local sau khi gọi API thành công vì nó không đổi status session ngay
                await fetchSetChannelDoubleChecked(sessionId, channelId, checked)
                setIsChannelChecked(checked)

                // Nếu API gọi thành công thì tắt loading ngay (vì không phải lúc nào cũng có event session update cho channel)
                setIsProcessing(false);
            } else {
                // Với Student mode, hành động này sẽ thay đổi Status Session
                // Nên ta gửi request và chờ Event trả về
                if (!isStudentWaiting && checked) {
                    await fetchEnableDoubleCheck(channelId)
                } else if (isStudentWaiting && !checked) {
                    await fetchDisableDoubleCheck(channelId)
                }
                // Không tắt processing ở đây, chờ Event ở useEffect tắt
            }
        } catch (err) {
            console.error(err);
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
                    disabled={isProcessing}
                    style={{ cursor: isProcessing ? 'wait' : 'pointer' }}
                />
            </div>
            <div className="toggle">
                <label>{doubleCheckLabel}</label>
                <input
                    type="checkbox"
                    // Logic hiển thị:
                    // 1. Doctor Completed -> Luôn checked
                    // 2. Doctor Mode -> Theo biến state isChannelChecked
                    // 3. Student Mode -> Theo biến isStudentWaiting (dựa trên status)
                    checked={currentStatus === 'DOCTOR_COMPLETED' ? true : (isDoctorMode ? isChannelChecked : isStudentWaiting)}
                    onChange={(e) => onToggleDoubleCheck(e.target.checked)}

                    // Logic disable:
                    // Đang loading HOẶC (Đã completed VÀ không phải Doctor Mode đang muốn gỡ check)
                    // (Lưu ý: Logic disable của bạn có thể tuỳ chỉnh, ở đây giữ nguyên logic cũ là Completed thì khoá)
                    disabled={isProcessing || isCompleted}
                    style={{ cursor: (isProcessing || isCompleted) ? 'default' : 'pointer' }}
                />
            </div>
        </div>
    )
}