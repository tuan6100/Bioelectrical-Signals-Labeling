import Session from "../../../../persistence/dao/session.dao.js";
import Channel from "../../../../persistence/dao/channel.dao.js";

export function getSessionInfo(sessionId) {
    const sessionInfo =  Session.findAllRelatedById(sessionId)
    const defaultChannelId = Channel.findByDataKindAndSweepIndex(sessionId, 'average', null)
    const defaultChannelSamples = defaultChannelId ? getChannelSamples(defaultChannelId) : null
    return {
        session: sessionInfo,
        defaultChannel: {
            channelId: defaultChannelId,
            name: 'Averaged Data',
            samples: defaultChannelSamples
        }
    }
}

export function getChannelSamples(channelId) {
    if (channelId == null) {
        throw new Error('Channel ID must be provided')
    }
    const record = Channel.findSamplesById(channelId)
    if (!record) return null

    const raw = record.raw_samples
    let samples = []
    try {
        const cleaned = raw.trim().replace(/^\uFEFF/, "")
        let arr = typeof cleaned === "string" ? JSON.parse(cleaned) : cleaned
        if (typeof arr === "string") {
            arr = JSON.parse(arr)
        }
        samples =  Array.isArray(arr) ? arr : []
    } catch (e) {
        throw e
    }
    const freqKHz = record.subsampled_khz ?? record.sampling_frequency_khz
    let freqHz = (freqKHz ?? 0) * 1000
    let durationMs = record.sweep_duration_ms ?? record.trace_duration_ms
    if ((!freqHz || freqHz <= 0) && durationMs && samples.length > 1) {
        const dt = durationMs / samples.length
        freqHz = 1000 / dt
    }
    if (!durationMs && freqHz && samples.length > 0) {
        durationMs = (samples.length / freqHz) * 1000
    }
    const dtMs = freqHz ? 1000 / freqHz : (durationMs && samples.length ? durationMs / samples.length : 1)
    const timeSeries = samples.map((value, index) => ({
        time: +(index * dtMs).toFixed(3),
        value
    }))

    const annotations = record.annotation_id ? {
        annotationId: record.annotation_id,
        startTimeMs: record.start_time_ms,
        endTimeMs: record.end_time_ms,
        note: record.note,
        label: record.label_id ? {
            labelId: record.label_id,
            name: record.label_name,
            type: record.label_type
        } : null
    } : null

    return {
        samplingRateHz: freqHz || null,
        durationMs: durationMs || (timeSeries.length ? timeSeries[timeSeries.length - 1].time : null),
        samples: timeSeries,
        annotations
    }
}