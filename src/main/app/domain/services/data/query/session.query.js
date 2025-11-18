import Session from "../../../../persistence/dao/session.dao.js";
import Channel from "../../../../persistence/dao/channel.dao.js";

export function getSessionInfo(sessionId) {
    const sessionInfo =  Session.findAllRelatedById(sessionId)
    const defaultChannelId = Channel.findByDataKindAndSweepIndex(sessionId, 'average', null)
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
            // Handle double-encoded JSON strings
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
    let durationMs = first.sweep_duration_ms ?? first.trace_duration_ms
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
    const annotations = rows.reduce((acc, r) => {
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

    return {
        samplingRateHz: freqHz || null,
        durationMs: durationMs || (timeSeries.length ? timeSeries[timeSeries.length - 1].time : null),
        samples: timeSeries,
        annotations
    }
}

export function getSessionPage(page, size) {
    return Session.findAllWithPagination(page, size)
}