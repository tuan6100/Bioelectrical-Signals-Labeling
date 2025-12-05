import Label from "../../../../persistence/dao/label.dao.js";
import Annotation from "../../../../persistence/dao/annotation.dao.js";

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