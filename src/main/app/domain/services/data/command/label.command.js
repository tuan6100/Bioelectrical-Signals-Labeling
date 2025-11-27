import asTransaction from "../../../../persistence/transaction/index.js";
import Label from "../../../../persistence/dao/label.dao.js";
import Annotation from "../../../../persistence/dao/annotation.dao.js";
import Channel from "../../../../persistence/dao/channel.dao.js";
import Session from "../../../../persistence/dao/session.dao.js";


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
            labelNote,
        )
        checkTimeValidity(startTime, endTime, channelId)
        if (annotation.isOverlapping()) {
            throw new Error('Annotation time range is overlapping with an existing annotation.')
        }
        annotation = annotation.insert()
        const sessionId = Channel.findSessionIdByChannelId(channelId)
        if (sessionId) Session.touch(sessionId)
        return {
            annotationId: annotation.annotationId,
            channelId: annotation.channelId,
            labelId: annotation.labelId,
            labelName: label.name,
            startTimeMs: annotation.startTimeMs,
            endTimeMs: annotation.endTimeMs,
            note: annotation.note,
            timeline: new Date(annotation.labeledAt).toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })
        }
    })(channelId, startTime, endTime, labelName)
}

export function exportLabels(sessionId) {
    const data = Session.getAllLabelsBySessionId(sessionId)
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

export function updateLabel(labelId, updateFields) {
    return asTransaction(function (labelId, updateFields) {
        const updated = Label.update(labelId, updateFields)
        if (updated) {
            //TODO: touching all sessions that have annotations with this label would be expensive; skipped
        }
        return updated
    })(labelId, updateFields)
}

export function deleteLabel(labelId) {
    return asTransaction(function (labelId) {
        return Label.delete(labelId)
    })(labelId)
}

export function updateAnnotation(annotationId, updates) {
    return asTransaction(function (annotationId, updates) {
        const annotation = Annotation.findOneById(annotationId)
        if (!annotation) {
            throw new Error(`Annotation ${annotationId} not found`)
        }
        if (updates.labelName) {
            let label = Label.findOneByName(updates.labelName)
            if (!label) {
                label = new Label(null, updates.labelName)
                label = label.insert()
            }
            updates.labelId = label.labelId
            delete updates.labelName
        }
        if (updates.startTimeMs !== undefined || updates.endTimeMs !== undefined) {
            const channelId = updates.channelId ?? annotation.channelId
            const newStart = updates.startTimeMs ?? annotation.startTimeMs
            const newEnd = updates.endTimeMs ?? annotation.endTimeMs
            checkTimeValidity(newStart, newEnd, channelId)
            if (!Annotation.canResize(annotationId, channelId, newStart, newEnd)) {
                throw new Error('Annotation time range is overlapping with an existing annotation.')
            }
        }
        const updated = Annotation.update(annotationId, updates)
        if (!updated) {
            throw new Error('Failed to update annotation')
        }
        const sessionId = Channel.findSessionIdByChannelId(updated.channelId)
        if (sessionId) Session.touch(sessionId)
        const label = Label.findOneById(updated.labelId)
        return {
            annotationId: updated.annotationId,
            channelId: updated.channelId,
            labelId: updated.labelId,
            labelName: label ? label.name : 'Unknown',
            startTimeMs: updated.startTimeMs,
            endTimeMs: updated.endTimeMs,
            note: updated.note,
            timeline: new Date(updated.updatedAt?? updated.labeledAt)
        }
    })(annotationId, updates)
}

export function deleteAnnotation(annotationId) {
    return asTransaction(function (annotationId) {
        const ann = Annotation.findOneById(annotationId)
        const deleted = Annotation.delete(annotationId)
        if (deleted && ann) {
            const sessionId = Channel.findSessionIdByChannelId(ann.channelId)
            if (sessionId) Session.touch(sessionId)
        }
        return deleted
    })(annotationId)
}

function checkTimeValidity(startTime, endTime, channelId) {
    if (startTime < 0 || endTime < 0) {
        throw new Error('Annotation time cannot be negative.')
    }
    if (endTime <= startTime) {
        throw new Error('Annotation end time must be greater than start time.')
    }
    const channelDuration = Channel.findOneDurationById(channelId)
    if (endTime > channelDuration) {
        throw new Error('Annotation end time exceeds channel duration.')
    }
    return true
}
