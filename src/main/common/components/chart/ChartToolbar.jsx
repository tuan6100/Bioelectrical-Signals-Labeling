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

export default function ChartToolbar() {
    return (
        <div className="chart-bottom-toolbar">
            <button><FontAwesomeIcon icon={faHome} /></button>
            <button><FontAwesomeIcon icon={faArrowLeft} /></button>
            <button><FontAwesomeIcon icon={faArrowRight} /></button>
            <button><FontAwesomeIcon icon={faArrowsAlt} /></button>
            <button><FontAwesomeIcon icon={faSearch} /></button>
            <button><FontAwesomeIcon icon={faSlidersH} /></button>
            <button><FontAwesomeIcon icon={faChartLine} /></button>
            <button><FontAwesomeIcon icon={faSave} /></button>
        </div>
    );
}
