import { BrowserWindow } from "electron"
import asTransaction from "../../../../persistence/transaction/index.js"
import Label from "../../../../persistence/dao/label.dao.js"
import Annotation from "../../../../persistence/dao/annotation.dao.js"
import Channel from "../../../../persistence/dao/channel.dao.js"
import Session from "../../../../persistence/dao/session.dao.js"
import { confirmOverlap } from "../../../utils/overlapping-warning.util.js"
import {findNearestTimePoint} from "../../../utils/algorithm.util.js"

export function createAnnotation(channelId, startTime, endTime, labelName, labelNote = null) {
    console.log('Creating:')
    return asTransaction(function (channelId, startTime, endTime, labelName) {
        let label = Label.findOneByName(labelName)
        if (label === null) {
            label = new Label(null, labelName)
            label = label.insert()
        }
        const channel = Channel.findOneById(channelId, false)
        const subsampledKhz = channel.subsampledKhz
        const durationMs = channel.durationMs
        let annotation = new Annotation(
            null,
            channelId,
            label.labelId,
            startTime,
            endTime,
            labelNote,
        )
        checkTimeValidity(startTime, endTime, channelId, durationMs)
        if (annotation.isOverlapping()) {
            if (!confirmOverlap()) {
                throw new OverlapError('Operation cancelled by user.')
            }
        }
        const timeSeries = generateTimeSeries(subsampledKhz, durationMs)
        const normalizedStart = findNearestTimePoint(startTime, timeSeries)
        const normalizedEnd = findNearestTimePoint(endTime, timeSeries)
        annotation.startTimeMs = normalizedStart
        annotation.endTimeMs = normalizedEnd
        annotation = annotation.insert()
        const sessionId = channel.sessionId
        if (sessionId) {
            Session.touch(sessionId)
            sendSessionUpdate(sessionId)
        }
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

export function updateAnnotation(annotationId, updates) {
    console.log('Updating:')
    return asTransaction(function (annotationId, updates) {
        const annotation = Annotation.findOneById(annotationId)
        if (!annotation) throw new Error(`Annotation ${annotationId} not found`)
        if (updates.labelName) {
            let label = Label.findOneByName(updates.labelName);
            if (!label) {
                label = new Label(null, updates.labelName).insert();
            }
            updates.labelId = label.labelId;
            delete updates.labelName;
        }

        const wasOverlapping = annotation.isOverlappingWithOthers()
        if (updates.startTimeMs !== undefined || updates.endTimeMs !== undefined) {
            const channelId = annotation.channelId
            const newStart = updates.startTimeMs ?? annotation.startTimeMs
            const newEnd = updates.endTimeMs ?? annotation.endTimeMs
            const channel = Channel.findOneById(channelId, false)
            const subsampledKhz = channel.subsampledKhz
            const durationMs = channel.durationMs
            checkTimeValidity(newStart, newEnd, channelId, durationMs)
            const timeSeries = generateTimeSeries(subsampledKhz, durationMs)
            const normalizedStart = findNearestTimePoint(newStart, timeSeries)
            const normalizedEnd = findNearestTimePoint(newEnd, timeSeries)
            updates.startTimeMs = normalizedStart
            updates.endTimeMs = normalizedEnd
            const tempAnnotation = new Annotation(
                annotationId, channelId, annotation.labelId,
                normalizedStart, normalizedEnd, annotation.note
            )
            const isNowOverlapping = tempAnnotation.isOverlappingWithOthers()
            if (!wasOverlapping && isNowOverlapping) {
                if (!confirmOverlap()) {
                    throw new OverlapError('Operation cancelled by user.')
                }
            }
        }
        const updated = Annotation.update(annotationId, updates)
        if (!updated) {
            throw new Error('Failed to update annotation, no changes were made or annotation not found.')
        }
        const sessionId = Channel.findSessionIdByChannelId(updated.channelId)
        if (sessionId) {
            Session.touch(sessionId)
            sendSessionUpdate(sessionId)
        }
        const label = Label.findOneById(updated.labelId)
        return {
            annotationId: updated.annotationId,
            channelId: updated.channelId,
            labelId: updated.labelId,
            labelName: label ? label.name : 'Unknown',
            startTimeMs: updated.startTimeMs,
            endTimeMs: updated.endTimeMs,
            note: updated.note,
            timeline: new Date(updated.updatedAt ?? updated.labeledAt)
        }
    })(annotationId, updates)
}

function generateTimeSeries(subsampledKhz, durationMs) {
    const samplingRateHz = subsampledKhz * 1000
    const intervalMs = 1000 / samplingRateHz
    const timeSeries = []
    let currentTime = 0
    while (currentTime <= durationMs) {
        timeSeries.push(parseFloat(currentTime.toFixed(3)))
        currentTime += intervalMs
    }
    return timeSeries
}

export function deleteAnnotation(annotationId) {
    return asTransaction(function (annotationId) {
        const ann = Annotation.findOneById(annotationId)
        const deleted = Annotation.delete(annotationId)
        if (deleted && ann) {
            const sessionId = Channel.findSessionIdByChannelId(ann.channelId)
            if (sessionId) {
                Session.touch(sessionId)
                sendSessionUpdate(sessionId)
            }
        }
        return deleted
    })(annotationId)
}

function sendSessionUpdate(sessionId) {
    const session = Session.findOneById(sessionId)
    if (session) {
        BrowserWindow.getAllWindows().forEach(win => {
            win.webContents.send('session:status-updated', {
                sessionId: session.sessionId,
                status: session.status,
                updatedAt: session.updatedAt
            })
        })
    }
}

function checkTimeValidity(startTime, endTime, channelId, duration) {
    console.log(`New startTime: ${startTime}, endTime: ${endTime} for channel ${channelId}`)
    const parsedStartTime = Number(startTime)
    const parsedEndTime = Number(endTime)
    if (isNaN(parsedStartTime) || isNaN(parsedEndTime)) {
        throw new Error(`Annotation times must be numbers.`)
    }
    if (!Number.isFinite(parsedStartTime) || !Number.isFinite(parsedEndTime)) {
        throw new Error(`Annotation times must be finite numbers.`)
    }
    if (parsedStartTime < 0 || parsedEndTime < 0) {
        throw new Error(`Annotation time cannot be negative.`)
    }
    if (parsedEndTime <= parsedStartTime) {
        throw new Error(`Annotation end time must be greater than start time.`)
    }
    if (parsedEndTime > duration) {
        throw new Error(`Annotation end time exceeds channel duration.`)
    }
    return true
}
export class OverlapError extends Error {
    constructor(message) {
        super(message)
    }
}
