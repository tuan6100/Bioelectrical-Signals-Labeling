import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRotateRight } from '@fortawesome/free-solid-svg-icons';
import { useEffect, useState, useRef } from 'react';
import './SearchToolbar.css';
import {useDebounce} from "../hooks/useDebounce.js";

export default function SearchToolbar({
                                          query,
                                          onQueryChange,
                                          onRefresh,
                                          loading
                                      }) {
    const [localQuery, setLocalQuery] = useState(query);
    const inputRef = useRef(null);
    const wasFocused = useRef(false);

    const debouncedQuery = useDebounce(localQuery, 300);

    // Lưu trạng thái focus trước khi re-render
    useEffect(() => {
        const input = inputRef.current;
        if (!input) return;

        const handleFocus = () => { wasFocused.current = true; };
        const handleBlur = () => { wasFocused.current = false; };

        input.addEventListener('focus', handleFocus);
        input.addEventListener('blur', handleBlur);

        return () => {
            input.removeEventListener('focus', handleFocus);
            input.removeEventListener('blur', handleBlur);
        };
    }, []);

    // Restore focus sau re-render nếu cần
    useEffect(() => {
        if (wasFocused.current && inputRef.current && document.activeElement !== inputRef.current) {
            // Delay nhỏ để đảm bảo DOM đã render xong
            requestAnimationFrame(() => {
                inputRef.current?.focus();
            });
        }
    });

    // Emit search khi debounce xong
    useEffect(() => {
        onQueryChange(debouncedQuery);
    }, [debouncedQuery, onQueryChange]);

    return (
        <div className="dashboard-sessions-header">
            <div className="search-toolbar">
                <input
                    ref={inputRef}
                    className="search-toolbar__input"
                    type="text"
                    placeholder="Search (e.g. status=NEW, patientname=Nguyen Van A, ...)"
                    value={localQuery}
                    onChange={(e) => setLocalQuery(e.target.value)}
                />

                <button
                    className="icon-btn search-toolbar__refresh-btn"
                    title="Refresh List"
                    onClick={onRefresh}
                    disabled={loading}
                >
                    <FontAwesomeIcon
                        icon={faArrowRotateRight}
                        spin={loading}
                        size="lg"
                    />
                </button>
            </div>
        </div>
    );
}