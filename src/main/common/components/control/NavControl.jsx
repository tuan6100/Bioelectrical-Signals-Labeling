import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faCaretUp,
    faCaretDown,
    faCaretLeft,
    faCaretRight,
    faArrowsUpDownLeftRight,
    faTimes
} from "@fortawesome/free-solid-svg-icons";
import './NavControll.css';

export function NavControl({ onZoomXIn, onZoomXOut, onZoomYIn, onZoomYOut }) {
    // Vị trí mặc định
    const [position, setPosition] = useState({ top: 20, right: 20 });
    const [isDragging, setIsDragging] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false); // State đóng/mở

    const dragStartRef = useRef({ x: 0, y: 0, initialTop: 0, initialRight: 0 });
    const isClickRef = useRef(true); // Biến để phân biệt giữa Click và Drag

    const handleMouseDown = (e) => {
        // Chỉ cho phép kéo khi nhấn vào nút trung tâm (main-toggle)
        if (!e.target.closest('.main-toggle')) return;

        e.preventDefault();
        setIsDragging(true);
        isClickRef.current = true; // Giả sử là click, nếu chuột di chuyển sẽ thành false

        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            initialTop: position.top,
            initialRight: position.right
        };
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging) return;

            const dx = e.clientX - dragStartRef.current.x;
            const dy = e.clientY - dragStartRef.current.y;

            // Nếu di chuyển quá 5px thì coi là đang Drag, không phải Click
            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                isClickRef.current = false;
            }

            setPosition({
                top: dragStartRef.current.initialTop + dy,
                right: dragStartRef.current.initialRight - dx
            });
        };

        const handleMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);
                // Nếu không di chuyển chuột (là click) thì toggle menu
                if (isClickRef.current) {
                    setIsExpanded(prev => !prev);
                }
            }
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    return (
        <div
            className={`nav-root ${isExpanded ? 'expanded' : ''} ${isDragging ? 'dragging' : ''}`}
            style={{ top: `${position.top}px`, right: `${position.right}px` }}
            onMouseDown={handleMouseDown}
        >
            <button className="nav-btn main-toggle" title="Drag to move / Click to expand">
                <FontAwesomeIcon icon={isExpanded ? faTimes : faArrowsUpDownLeftRight} />
            </button>
            <div className="satellite-container">
                <button className="nav-btn sat-btn up" onClick={onZoomYIn} title="Zoom Voltage In">
                    <FontAwesomeIcon icon={faCaretUp} />
                </button>
                <button className="nav-btn sat-btn right" onClick={onZoomXIn} title="Zoom Time In">
                    <FontAwesomeIcon icon={faCaretRight} />
                </button>
                <button className="nav-btn sat-btn down" onClick={onZoomYOut} title="Zoom Voltage Out">
                    <FontAwesomeIcon icon={faCaretDown} />
                </button>
                <button className="nav-btn sat-btn left" onClick={onZoomXOut} title="Zoom Time Out">
                    <FontAwesomeIcon icon={faCaretLeft} />
                </button>
            </div>
        </div>
    );
}