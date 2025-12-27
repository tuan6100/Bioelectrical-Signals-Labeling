import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRotateRight } from '@fortawesome/free-solid-svg-icons';
import { useEffect, useState } from 'react';
import './SearchToolbar.css';
import {useDebounce} from "../hooks/useDebounce.js";

export default function SearchToolbar({
     query,
     onQueryChange,
     onRefresh,
     loading
}) {
    const [localQuery, setLocalQuery] = useState(query);

    const debouncedQuery = useDebounce(localQuery, 300);

    // Emit search khi debounce xong
    useEffect(() => {
        onQueryChange(debouncedQuery);
    }, [debouncedQuery]);

    return (
        <div className="dashboard-sessions-header">
            <div className="search-toolbar">
                <input
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
