import Label from "../../../../persistence/dao/label.dao.js";
import Annotation from "../../../../persistence/dao/annotation.dao.js";
import Session from "../../../../persistence/dao/session.dao.js";
import asTransaction from "../../../../persistence/transaction/index.js";

export function persistLabel(channelId, startTime, endTime, labelName, labelNote = null) {
    return asTransaction(function (channelId, startTime, endTime, labelName) {
        let label = Label.findOneByName(labelName)
        if (label === null) {
            label = new Label(null, labelName)
            label = label.insert()
        }
        let annotation = new Annotation(
            null,
            channelId,
            label.labelId,
            startTime,
            endTime,
            labelNote
        )
        if (Annotation.isOverlapping(startTime, endTime)) {
            throw new Error('Annotation time range is overlapping with an existing annotation.')
        }
        annotation = annotation.insert()
        return {
            annotationId: annotation.annotationId,
            channelId: annotation.channelId,
            labelId: annotation.labelId,
            labelName: label.name,
            startTimeMs: annotation.startTimeMs,
            endTimeMs: annotation.endTimeMs,
            note: annotation.note
        }
    })(channelId, startTime, endTime, labelName)
}

export function exportLabels(sessionId) {
    const data = Session.getAllLabelsBySessionId(sessionId);
    return  data.flatMap(item => {
        const freqKhz = item.subsampled || item.samplingFrequency;
        const freqHz = (freqKhz || 0) * 1000;
        if (!freqHz || !item.samples || !item.samples.length) return [];
        const dtMs = 1000 / freqHz;
        if (!item.annotation) return [];
        const { startTimeMs, endTimeMs, labelName, note } = item.annotation;
        const startIdx = Math.max(0, Math.floor(startTimeMs / dtMs));
        const endIdx = Math.min(item.samples.length, Math.ceil(endTimeMs / dtMs));
        const samplesSlice = item.samples.slice(startIdx, endIdx);
        return [{
            labelName,
            samplesSlice,
            note
        }];
    });
}

export function updateLabel(labelId, updateFields) {
    return asTransaction(function (labelId, updateFields) {
        return Label.update(labelId, updateFields);
    })(labelId, updateFields);
}

export function deleteLabel(labelId) {
    return asTransaction(function (labelId) {
        return Label.delete(labelId);
    })(labelId);
}
