import { useMemo } from 'react';

export function useSessionFilter(sessions, query) {
    return useMemo(() => {
        const raw = query.trim();
        let filteredSessions = sessions;

        if (raw) {
            const parts = raw.match(/("[^"]*"|'[^']*'|\S+)/g) || [];
            const tokens = [];
            
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                const m = part.match(/^(\w+)([=-])(.*)$/);
                if (m) {
                    let key = m[1].toLowerCase();
                    const op = m[2];
                    let value = m[3] || '';
                    if (op === '=') {
                        while (i + 1 < parts.length && !parts[i + 1].match(/^(\w+)([=-])/)) {
                            if (parts[i + 1] === ',') break;
                            value += (value ? ' ' : '') + parts[++i];
                        }
                    }
                    value = value.replace(/^("|')(.*)\1$/, '$2');
                    value = value.replace(/[\s,]+$/, '');
                    tokens.push({ key, op, value });
                }
            }

            const fieldExtractors = {
                sessionid: s => (s.sessionId != null ? String(s.sessionId) : ''),
                patientid: s => (
                    s.patient?.id != null ? String(s.patient.id) :
                    s.patientId != null ? String(s.patientId) :
                    s.patient_id != null ? String(s.patient_id) : ''
                ),
                patientname: s => {
                    const direct = s.patient?.name || s.patientName || s.patient_name || '';
                    const fn = s.patient?.firstName || s.patientFirstName || s.patient_first_name || '';
                    const ln = s.patient?.lastName || s.patientLastName || s.patient_last_name || '';
                    const combined = [fn, ln].filter(Boolean).join(' ').trim();
                    return (direct || combined).trim();
                },
                measurementtype: s => (s.measurementType || s.sessionMeasurementType || s.measurement_type || ''),
                filename: s => (s.inputFileName || s.sourceFileName || s.fileName || s.source_file_name || ''),
                status: s => (s.status || '').toLowerCase(),
            };

            const useStructured = tokens.length > 0 && tokens.every(t => fieldExtractors[t.key]);
            
            if (useStructured) {
                filteredSessions = sessions.filter(s => {
                    for (const t of tokens) {
                        const rawFieldVal = fieldExtractors[t.key](s);
                        const normField = rawFieldVal.replace(/\s+/g, ' ').trim().toLowerCase();
                        const normValue = t.value.replace(/\s+/g, ' ').trim().toLowerCase();
                        if (t.op === '=') {
                            if (t.key === 'patientname' || t.key === 'status') {
                                if (!normField.includes(normValue)) return false;
                            } else {
                                if (normField !== normValue) return false;
                            }
                        } else {
                            if (!normField.includes(normValue)) return false;
                        }
                    }
                    return true;
                });
            } else {
                const q = raw.toLowerCase();
                filteredSessions = sessions.filter(s => {
                    const patientId = s.patient?.id;
                    const patientName = s.patient?.name || '';
                    return (
                        String(s.sessionId).includes(q) ||
                        (patientId != null && String(patientId).includes(q)) ||
                        patientName.toLowerCase().includes(q) ||
                        (s.measurementType || '').toLowerCase().includes(q) ||
                        (s.inputFileName || '').toLowerCase().includes(q) ||
                        (s.status || '').toLowerCase().includes(q)
                    );
                });
            }
        }

        return filteredSessions;
    }, [sessions, query]);
}