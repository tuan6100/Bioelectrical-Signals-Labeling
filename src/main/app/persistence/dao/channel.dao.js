import db from "../connection/sqlite.connection.js";

export default class Channel {
    constructor(
        sessionId,
        channelNumber,
        dataKind,
        sweepIndex = null,
        samplingFrequency = null,
        subsampled = null,
        sweepDurationMs = null,
        traceDurationMs = null,
        algorithm = null
    ) {
        this.channelId = 0
        this.sessionId = sessionId
        this.channelNumber = channelNumber
        this.dataKind = dataKind
        this.sweepIndex = sweepIndex
        this.samplingFrequency = samplingFrequency
        this.subsampled = subsampled
        this.sweepDurationMs = sweepDurationMs
        this.traceDurationMs = traceDurationMs
        this.algorithm = algorithm
    }

    insert() {
        const query = db.prepare(`
            INSERT INTO channels (
                session_id, channel_number, data_kind, sweep_index,
                sampling_frequency, subsampled, sweep_duration_ms,
                trace_duration_ms, algorithm
            ) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        const resultingChanges = query.run(
            this.sessionId,
            this.channelNumber,
            this.dataKind,
            this.sweepIndex,
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
                    session_id, channel_number, data_kind, sweep_index,
                    sampling_frequency, subsampled, sweep_duration_ms,
                    trace_duration_ms, algorithm
                ) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `)
            for (const channel of channelList) {
                const resultingChanges =  stmt.run(
                    channel.sessionId,
                    channel.channelNumber,
                    channel.dataKind,
                    channel.sweepIndex,
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
        const query = db.prepare(`
            SELECT 
                channel_id, session_id, channel_number, data_kind, sweep_index,
                sampling_frequency, subsampled, sweep_duration_ms,
                trace_duration_ms, algorithm
            FROM channels 
            WHERE channel_id = ?
        `)
        const row = query.get(channelId)
        if (!row) return null
        return new Channel(
            row.session_id,
            row.channel_number,
            row.data_kind,
            row.sweep_index,
            row.sampling_frequency,
            row.subsampled,
            row.sweep_duration_ms,
            row.trace_duration_ms,
            row.algorithm
        )
    }

    static findAll() {
        const query = db.prepare(`
            SELECT 
                channel_id, session_id, channel_number, data_kind, sweep_index,
                sampling_frequency, subsampled, sweep_duration_ms,
                trace_duration_ms, algorithm
            FROM channels 
            ORDER BY channel_number, sweep_index
        `)
        const rows = query.all()
        return rows.map(row => {
            const channel = new Channel(
                row.session_id,
                row.channel_number,
                row.data_kind,
                row.sweep_index,
                row.sampling_frequency,
                row.subsampled,
                row.sweep_duration_ms,
                row.trace_duration_ms,
                row.algorithm
            )
            channel.channelId = row.channel_id
            return channel
        })
    }

    static findBySessionId(sessionId) {
        const query = db.prepare(`
            SELECT 
                channel_id, session_id, channel_number, data_kind, sweep_index,
                sampling_frequency, subsampled, sweep_duration_ms,
                trace_duration_ms, algorithm
            FROM channels 
            WHERE session_id = ?
            ORDER BY channel_number, sweep_index
        `)
        const rows = query.all(sessionId)
        return rows.map(row => {
            const channel = new Channel(
                row.session_id,
                row.channel_number,
                row.data_kind,
                row.sweep_index,
                row.sampling_frequency,
                row.subsampled,
                row.sweep_duration_ms,
                row.trace_duration_ms,
                row.algorithm
            )
            channel.channelId = row.channel_id
            return channel
        })
    }

    static findByDataKind(sessionId, dataKind) {
        const query = db.prepare(`
            SELECT 
                channel_id, session_id, channel_number, data_kind, sweep_index,
                sampling_frequency, subsampled, sweep_duration_ms,
                trace_duration_ms, algorithm
            FROM channels 
            WHERE session_id = ? AND data_kind = ?
            ORDER BY channel_number, sweep_index
        `)
        const rows = query.all(sessionId, dataKind)
        return rows.map(row => {
            const channel = new Channel(
                row.session_id,
                row.channel_number,
                row.data_kind,
                row.sweep_index,
                row.sampling_frequency,
                row.subsampled,
                row.sweep_duration_ms,
                row.trace_duration_ms,
                row.algorithm
            )
            channel.channelId = row.channel_id
            return channel
        })
    }

    static update(channelId, updateFields) {
        const fields = Object.keys(updateFields)
        if (fields.length === 0) return null
        const fieldMap = {
            sessionId: 'session_id',
            channelNumber: 'channel_number',
            dataKind: 'data_kind',
            sweepIndex: 'sweep_index',
            samplingFrequency: 'sampling_frequency',
            subsampled: 'subsampled',
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

