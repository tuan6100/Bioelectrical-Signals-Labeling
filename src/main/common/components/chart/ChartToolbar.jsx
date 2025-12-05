import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faHome,
    faArrowLeft,
    faArrowRight,
    faArrowsAlt,
    faSearch,
    faSlidersH,
    faChartLine,
    faSave
} from '@fortawesome/free-solid-svg-icons';
import {fetchExportAllLabelInChannel} from "../../api/index.js";
import('./ChartToolbar.css')

export default function ChartToolbar({sessionId, channelId}) {

    const handleSave = async () => {
        await fetchExportAllLabelInChannel(sessionId, channelId, 'xlsx')
    }

    return (
        <div className="chart-bottom-toolbar">
            <button><FontAwesomeIcon icon={faHome} /></button>
            <button><FontAwesomeIcon icon={faArrowLeft} /></button>
            <button><FontAwesomeIcon icon={faArrowRight} /></button>
            <button><FontAwesomeIcon icon={faArrowsAlt} /></button>
            <button><FontAwesomeIcon icon={faSearch} /></button>
            <button><FontAwesomeIcon icon={faSlidersH} /></button>
            <button><FontAwesomeIcon icon={faChartLine} /></button>
            <button>
                <FontAwesomeIcon
                    icon={faSave}
                    onClick={() => handleSave()}
                />
            </button>
        </div>
    );
}
