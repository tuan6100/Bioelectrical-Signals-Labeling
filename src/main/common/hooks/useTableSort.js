import { useState, useMemo } from 'react';

export function useTableSort(data, initialKey = null, initialDirection = 'asc') {
    const [sortConfig, setSortConfig] = useState(
        initialKey ? { key: initialKey, direction: initialDirection } : null
    );

    const sortedData = useMemo(() => {
        if (!sortConfig) return data;

        const sorted = [...data].sort((a, b) => {
            let aValue, bValue;

            switch (sortConfig.key) {
                case 'patientName':
                    aValue = (a.patient?.name || a.patientName || '').toLowerCase();
                    bValue = (b.patient?.name || b.patientName || '').toLowerCase();
                    break;
                case 'patientId':
                    aValue = a.patient?.id || a.patientId || 0;
                    bValue = b.patient?.id || b.patientId || 0;
                    break;
                case 'startTime':
                    aValue = a.startTime || '';
                    bValue = b.startTime || '';
                    break;
                case 'fileName':
                    aValue = (a.inputFileName || '').toLowerCase();
                    bValue = (b.inputFileName || '').toLowerCase();
                    break;
                case 'doubleChecked':
                    aValue = a.isDoubleChecked ? 1 : 0;
                    bValue = b.isDoubleChecked ? 1 : 0;
                    break;
                case 'status':
                    aValue = (a.status || '').toLowerCase();
                    bValue = (b.status || '').toLowerCase();
                    break;
                default:
                    return 0;
            }

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });

        return sorted;
    }, [data, sortConfig]);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    return {
        sortedData,
        sortConfig,
        handleSort
    };
}