import db from "../connection/sqlite.connection.js";

export default class Channel {
    constructor(
        sessionId,
        channelNumber,
        dataKind,
        sweepIndex,
        raw_samples,
        samplingFrequency,
        subsampled ,
        sweepDurationMs ,
        traceDurationMs ,
        algorithm
    ) {
        this.channelId = 0
        this.sessionId = sessionId
        this.channelNumber = channelNumber
        this.dataKind = dataKind
        this.sweepIndex = sweepIndex
        this.rawSamples = raw_samples
        this.samplingFrequency = samplingFrequency
        this.subsampled = subsampled
        this.sweepDurationMs = sweepDurationMs
        this.traceDurationMs = traceDurationMs
        this.algorithm = algorithm
    }

    insert() {
        const query = db.prepare(`
            INSERT INTO channels (
                session_id, channel_number, data_kind, sweep_index, raw_samples,
                sampling_frequency_khz, subsampled_khz, sweep_duration_ms,
                trace_duration_ms, algorithm
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        const resultingChanges = query.run(
            this.sessionId,
            this.channelNumber,
            this.dataKind,
            this.sweepIndex,
            JSON.stringify(this.rawSamples),
            this.samplingFrequency,
            this.subsampled,
            this.sweepDurationMs,
            this.traceDurationMs,
            this.algorithm
        )
        this.channelId = resultingChanges.lastInsertRowid
        return this
    }

    static insertBatch(channels) {
        const insertMany = db.transaction((channelList) => {
            const stmt = db.prepare(`
                INSERT INTO channels (
                    session_id, channel_number, data_kind, sweep_index, raw_samples,
                    sampling_frequency_khz, subsampled_khz, sweep_duration_ms,
                    trace_duration_ms, algorithm
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `)
            for (const channel of channelList) {
                const resultingChanges = stmt.run(
                    channel.sessionId,
                    channel.channelNumber,
                    channel.dataKind,
                    channel.sweepIndex,
                    JSON.stringify(channel.rawSamples),
                    channel.samplingFrequency,
                    channel.subsampled,
                    channel.sweepDurationMs,
                    channel.traceDurationMs,
                    channel.algorithm
                )
                channel.channelId = resultingChanges.lastInsertRowid
            }
        })
        insertMany(channels)
    }


    static findOneById(channelId) {
        const stmt = db.prepare(`
            SELECT 
                channel_id, session_id, channel_number, data_kind, sweep_index,
                sampling_frequency_khz, subsampled_khz, sweep_duration_ms,
                trace_duration_ms, algorithm
            FROM channels 
            WHERE channel_id = ?
        `)
        const row = stmt.get(channelId)
        if (!row) return null
        return new Channel(
            row.session_id,
            row.channel_number,
            row.data_kind,
            row.sweep_index,
            row.sampling_frequency_khz,
            row.subsampled_khz,
            row.sweep_duration_ms,
            row.trace_duration_ms,
            row.algorithm
        )
    }

    static findAll() {
        const stmt  = db.prepare(`
            SELECT 
                channel_id, session_id, channel_number, data_kind, sweep_index,
                sampling_frequency_khz, subsampled_khz, sweep_duration_ms,
                trace_duration_ms, algorithm
            FROM channels 
            ORDER BY channel_number, sweep_index
        `)
        const rows = stmt.all()
        return rows.map(row => {
            const channel = new Channel(
                row.session_id,
                row.channel_number,
                row.data_kind,
                row.sweep_index,
                row.sampling_frequency_khz,
                row.subsampled_khz,
                row.sweep_duration_ms,
                row.trace_duration_ms,
                row.algorithm
            )
            channel.channelId = row.channel_id
            return channel
        })
    }

    static findBySessionId(sessionId) {
        const stmt  = db.prepare(`
            SELECT 
                channel_id, session_id, channel_number, data_kind, sweep_index,
                sampling_frequency_khz, subsampled_khz, sweep_duration_ms,
                trace_duration_ms, algorithm
            FROM channels 
            WHERE session_id = ?
            ORDER BY channel_number, sweep_index
        `)
        const rows = stmt.all(sessionId)
        return rows.map(row => {
            const channel = new Channel(
                row.session_id,
                row.channel_number,
                row.data_kind,
                row.sweep_index,
                row.sampling_frequency_khz,
                row.subsampled_khz,
                row.sweep_duration_ms,
                row.trace_duration_ms,
                row.algorithm
            )
            channel.channelId = row.channel_id
            return channel
        })
    }

    static findByDataKindAndSweepIndex(sessionId, dataKind, sweepIndex) {
        const query = sweepIndex === null?
            `SELECT channel_id
             FROM channels
             WHERE session_id = ? AND LOWER(data_kind) LIKE ?
             ORDER BY channel_number, sweep_index
             ` :
            `SELECT channel_id
             FROM channels
             WHERE session_id = ? AND LOWER(data_kind) LIKE ? AND sweep_index = ?
             ORDER BY channel_number, sweep_index
             `
        const stmt  = db.prepare(query)
        const result = stmt.get(sessionId, `%${dataKind.toLowerCase()}%`)
        return result ? result.channel_id : null
    }

    static findSamplesById(channelId) {
        const query = db.prepare(`
            SELECT 
                c.raw_samples, 
                c.sampling_frequency_khz, 
                c.subsampled_khz, 
                c.sweep_duration_ms,
                c.trace_duration_ms,
                a.annotation_id, a.start_time_ms, a.end_time_ms, a.note,
                l.label_id, l.name AS label_name, l.type AS label_type
            FROM channels AS c
            LEFT JOIN annotations AS a ON c.channel_id = a.channel_id
            LEFT JOIN labels AS l ON a.label_id = l.label_id
            WHERE c.channel_id = ?
        `)
        const result = query.get(channelId)
        return result || null
    }

    static update(channelId, updateFields) {
        const fields = Object.keys(updateFields)
        if (fields.length === 0) return null
        const fieldMap = {
            sessionId: 'session_id',
            channelNumber: 'channel_number',
            dataKind: 'data_kind',
            sweepIndex: 'sweep_index',
            samplingFrequency: 'sampling_frequency_khz',
            subsampled: 'subsampled_khz',
            sweepDurationMs: 'sweep_duration_ms',
            traceDurationMs: 'trace_duration_ms',
            algorithm: 'algorithm'
        }
        const setClause = fields.map(field => {
            const dbField = fieldMap[field] || field
            return `${dbField} = ?`
        }).join(', ')
        const values = fields.map(field => updateFields[field])
        const query = db.prepare(`
            UPDATE channels 
            SET ${setClause}
            WHERE channel_id = ?
        `)
        const info = query.run(...values, channelId)
        return info.changes > 0 ? this.findOneById(channelId) : null
    }

    static delete(channelId) {
        const query = db.prepare(`
            DELETE FROM channels 
            WHERE channel_id = ?
        `)
        const info = query.run(channelId)
        return info.changes > 0
    }

    static deleteBySessionId(sessionId) {
        const query = db.prepare(`
            DELETE FROM channels 
            WHERE session_id = ?
        `)
        const info = query.run(sessionId)
        return info.changes
    }
}

