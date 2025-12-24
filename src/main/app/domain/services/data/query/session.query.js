import Channel from "../../../../persistence/dao/channel.dao.js";
import Session from "../../../../persistence/dao/session.dao.js";

export function getSessionInfo(sessionId) {
    const sessionInfo =  Session.findAllRelatedById(sessionId)
    const defaultChannelId = Channel.findChannelIdBySessionIdAndChanelNumber(sessionId, 1)
    const defaultChannelSignal = defaultChannelId ? getChannelSignal(defaultChannelId) : null
    return {
        session: sessionInfo,
        defaultChannel: {
            channelId: defaultChannelId,
            name: 'Averaged Data',
            signal: defaultChannelSignal
        }
    }
}

export function getChannelSignal(channelId) {
    if (channelId == null) {
        throw new Error('Channel ID must be provided')
    }
    const rows = Channel.findSamplesById(channelId)
    if (!rows || rows.length === 0) return null
    const first = rows[0]
    const raw = first.raw_samples_uv
    let samplesArr = []
    try {
        if (typeof raw === 'string') {
            const cleaned = raw.trim().replace(/^\uFEFF/, "")
            let parsed = JSON.parse(cleaned)
            if (typeof parsed === 'string') {
                parsed = JSON.parse(parsed)
            }
            samplesArr = Array.isArray(parsed) ? parsed : []
        } else if (Array.isArray(raw)) {
            samplesArr = raw
        }
    } catch (e) {
        throw new Error(`Failed to parse channel samples for channelId=${channelId}: ${e.message}`)
    }

    const freqKHz = first.subsampled_khz ?? first.sampling_frequency_khz
    let freqHz = (freqKHz ?? 0) * 1000
    let durationMs = first.duration_ms
    if ((!freqHz || freqHz <= 0) && durationMs && samplesArr.length > 1) {
        const dt = durationMs / samplesArr.length
        freqHz = 1000 / dt
    }
    if (!durationMs && freqHz && samplesArr.length > 0) {
        durationMs = (samplesArr.length / freqHz) * 1000
    }

    const dtMs = freqHz ? 1000 / freqHz : (durationMs && samplesArr.length ? durationMs / samplesArr.length : 1)
    const timeSeries = samplesArr.map((value, index) => ({
        time: +(index * dtMs).toFixed(3),
        value
    }))
    const seen = new Set()
    let annotations = rows.reduce((acc, r) => {
        if (!r.annotation_id) return acc
        if (seen.has(r.annotation_id)) return acc
        seen.add(r.annotation_id)
        acc.push({
            annotationId: r.annotation_id,
            startTimeMs: r.start_time_ms,
            endTimeMs: r.end_time_ms,
            note: r.note ?? null,
            label: r.label_id ? { labelId: r.label_id, name: r.label_name } : null
        })
        return acc
    }, [])
    const overlaps = findOverlappingAnnotations(annotations)
    return {
        samplingRateHz: freqHz || null,
        durationMs: durationMs,
        samples: timeSeries,
        annotations,
        overlaps
    }
}

function findOverlappingAnnotations(annotations) {
    const overlaps = []
    const sorted = [...annotations].sort(
        (a, b) => a.startTimeMs - b.startTimeMs
    )
    for (let i = 0; i < sorted.length; i++) {
        const a = sorted[i]
        for (let j = i + 1; j < sorted.length; j++) {
            const b = sorted[j]
            if (b.startTimeMs >= a.endTimeMs) break
            if (a.startTimeMs < b.endTimeMs && a.endTimeMs > b.startTimeMs) {
                overlaps.push({
                    first: a.annotationId,
                    second: b.annotationId
                })
            }
        }
    }
    return overlaps
}

export function getAllSessions() {
    const rows =  Session.findAll()
    return rows.map(r => ({
        sessionId: r.session_id,
        patient: {
            id: r.patient_id,
            name: r.patient_name
        },
        measurementType: r.measurement_type,
        startTime: r.start_time,
        endTime: r.end_time,
        status: r.status,
        inputFileName: r.input_file_name,
        updatedAt: new Date(r.updated_at).toLocaleString('en-US', {timeZone: 'Asia/Ho_Chi_Minh'})
    }))
}

export function getSessionsByPage(page, size) {
    const pageNumber = Math.max(1, Number(page) || 1)
    const pageSize = Math.max(1, Number(size) || 10)
    const rows =  Session.findAllWithPagination(pageNumber, pageSize)
    const total = Session.countAll()
    if (!rows || rows.length === 0) {
        return {
            contents: [],
            page: {
                size: pageSize,
                number: pageNumber,
                totalElements: total,
                totalPages: Math.ceil(total / pageSize)
            }
        }
    }
    const contents = rows.map(r => ({
        sessionId: r.session_id,
        patient: {
            id: r.patient_id,
            name: r.patient_name,
            gender: r.patient_gender
        },
        measurementType: r.measurement_type,
        startTime: r.start_time,
        endTime: r.end_time,
        status: r.status,
        inputFileName: r.input_file_name,
        updatedAt: new Date(r.updated_at).toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })
    }))
    return {
        contents,
        page: {
            size: pageSize,
            number: pageNumber,
            totalElements: total,
            totalPages: Math.ceil(total / pageSize)
        }
    }
}

export function getSessionsByPatientId(patientId) {
    const rows =  Session.findByPatientId(patientId)
    return rows.map(s => ({
        sessionId: s.sessionId,
        patientId: s.patientId,
        measurementType: s.measurementType,
        startTime: s.startTime,
        endTime: s.endTime,
        inputFileName: s.inputFileName,
        updatedAt: s.updatedAt
    }))
}

export function getInputFileName(sessionId) {
    const session = Session.findOneById(sessionId)
    if (!session) {
        throw new Error(`Session with ID ${sessionId} not found`)
    }
    return session.inputFileName
}