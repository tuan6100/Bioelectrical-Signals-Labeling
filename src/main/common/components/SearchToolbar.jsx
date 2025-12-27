import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRotateRight } from "@fortawesome/free-solid-svg-icons";

export default function SearchToolbar({ query, onQueryChange, onRefresh, loading }) {
    return (
        <div className="dashboard-sessions-header" style={{ 
            flexShrink: 0, 
            marginBottom: '15px' 
        }}>
            <div className="start-page-search-wrap start-page-search-wrap--with-action" 
                 style={{ flexShrink: 0, marginBottom: 0 }}>
                <input
                    className="start-page-search-input start-page-search-input--with-action"
                    type="text"
                    placeholder="Search (e.g. status=NEW, patientname=Nguyen Van A, ...)"
                    value={query}
                    onChange={(e) => onQueryChange(e.target.value)}
                />
                <button
                    className="icon-btn start-page-search-action"
                    title="Refresh List"
                    onClick={(e) => {
                        e.preventDefault();
                        onRefresh();
                    }}
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