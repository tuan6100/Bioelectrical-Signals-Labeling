import Label from "../../../../persistence/dao/label.dao.js";
import Annotation from "../../../../persistence/dao/annotation.dao.js";
import Session from "../../../../persistence/dao/session.dao.js";

export function getAllLabels() {
    return Label.findAll().filter(l => l.name.toLowerCase() !== 'pending')
}

export function getAllAnnotationsByChannel(channelId) {
    const rows = Annotation.findByChannelId(channelId)
    return rows.map(r => ({
        annotationId: r.annotation_id,
        startTime: r.start_time_ms,
        endTime: r.end_time_ms,
        note: r.note,
        label: {
            id: r.label_id,
            name: r.label_name
        }
    }))
}

export function exportLabels(sessionId) {
    const data = Session.findAllLabelsBySessionId(sessionId)
    return  data.flatMap(item => {
        const freqKhz = item.subsampled || item.samplingFrequency
        const freqHz = (freqKhz || 0) * 1000
        if (!freqHz || !item.samples || !item.samples.length) return []
        const dtMs = 1000 / freqHz
        if (!item.annotation) return []
        const { startTimeMs, endTimeMs, labelName, note } = item.annotation
        const startIdx = Math.max(0, Math.floor(startTimeMs / dtMs))
        const endIdx = Math.min(item.samples.length, Math.ceil(endTimeMs / dtMs))
        const samplesSlice = item.samples.slice(startIdx, endIdx)
        return [{
            labelName,
            samplesSlice,
            note
        }]
    })
}
