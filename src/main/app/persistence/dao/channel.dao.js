import {db as sqliteDb} from "../connection/sqlite.connection.js";

export default class Channel {
    constructor(
        channelId,
        sessionId,
        channelNumber,
        dataKind,
        rawSamplesUv,
        samplingFrequencyKhz,
        subsampledKhz ,
        durationMs ,
    ) {
        this.channelId = channelId
        this.sessionId = sessionId
        this.channelNumber = channelNumber
        this.dataKind = dataKind
        this.rawSamplesUv = rawSamplesUv
        this.samplingFrequencyKhz = samplingFrequencyKhz
        this.subsampledKhz = subsampledKhz
        this.durationMs = durationMs

    }

    static db = sqliteDb

    static useDb(dbInstance) {
        Channel.db = dbInstance
    }

    insert() {
        const stmt = Channel.db.prepare(`
        INSERT INTO channels ( channel_id,
            session_id, channel_number, data_kind, raw_samples_uv,
            sampling_frequency_khz, subsampled_khz, duration_ms
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
        const resultingChanges = stmt.run(
            this.channelId,
            this.sessionId,
            this.channelNumber,
            this.dataKind,
            JSON.stringify(this.rawSamplesUv),
            this.samplingFrequencyKhz,
            this.subsampledKhz,
            this.durationMs
        )
        this.channelId = resultingChanges.lastInsertRowid
        return this
    }

    static insertBatch(channels) {
        const insertMany = Channel.db.transaction((channelList) => {
            const stmt = Channel.db.prepare(`
            INSERT INTO channels (
                channel_id, session_id, channel_number, data_kind, raw_samples_uv,
                sampling_frequency_khz, subsampled_khz, duration_ms
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)
            for (const channel of channelList) {
                const resultingChanges = stmt.run(
                    channel.channelId,
                    channel.sessionId,
                    channel.channelNumber,
                    channel.dataKind,
                    JSON.stringify(channel.rawSamplesUv),
                    channel.samplingFrequencyKhz,
                    channel.subsampledKhz,
                    channel.durationMs
                )
                channel.channelId = resultingChanges.lastInsertRowid
            }
        })
        insertMany(channels)
    }

    static findOneById(channelId) {
        const stmt = Channel.db.prepare(`
            SELECT 
                channel_id, session_id, channel_number, data_kind,
                sampling_frequency_khz, subsampled_khz, duration_ms
            FROM channels 
            WHERE channel_id = ?
        `)
        const row = stmt.get(channelId)
        if (!row) return null
        return new Channel(
            row.session_id,
            row.channel_number,
            row.data_kind,
            row.sampling_frequency_khz,
            row.subsampled_khz,
            row.duration_ms
        )
    }
    static findOneDurationById(channelId) {
        const stmt = Channel.db.prepare(`
            SELECT duration_ms
            FROM channels
            WHERE channel_id = ?
        `)
        const row = stmt.get(channelId)
        if (!row) return null
        return row.duration_ms
    }

    static findAll() {
        const stmt  = Channel.db.prepare(`
            SELECT 
                channel_id, session_id, channel_number, data_kind,
                sampling_frequency_khz, subsampled_khz, duration_ms
            FROM channels 
            ORDER BY channel_number
        `)
        const rows = stmt.all()
        return rows.map(row => {
            const channel = new Channel(
                row.session_id,
                row.channel_number,
                row.data_kind,
                row.sampling_frequency_khz,
                row.subsampled_khz,
                row.duration_ms,
            )
            channel.channelId = row.channel_id
            return channel
        })
    }

    static findByDataKind(sessionId, dataKind) {
        const query =
            `SELECT channel_id
             FROM channels
             WHERE session_id = ? AND LOWER(data_kind) = ?
             ORDER BY channel_number
             `
        const stmt  = Channel.db.prepare(query)
        const result = stmt.get(sessionId, `${dataKind.toLowerCase()}`)
        return result ? result.channel_id : null
    }

    static findSamplesById(channelId) {
        const stmt = Channel.db.prepare(`
            SELECT
                c.raw_samples_uv,
                c.sampling_frequency_khz,
                c.subsampled_khz,
                c.duration_ms,
                a.annotation_id, a.start_time_ms, a.end_time_ms, a.note, a.labeled_at, a.updated_at,
                l.label_id, l.name AS label_name
            FROM channels c
            LEFT JOIN annotations a ON c.channel_id = a.channel_id
            LEFT JOIN labels l ON a.label_id = l.label_id
            WHERE c.channel_id = ?
        `)
        const result = stmt.all(channelId)
        return result || null
    }

    static update(channelId, updateFields) {
        const fields = Object.keys(updateFields)
        if (fields.length === 0) return null
        const fieldMap = {
            sessionId: 'session_id',
            channelNumber: 'channel_number',
            dataKind: 'data_kind',
            samplingFrequencyKhz: 'sampling_frequency_khz',
            subsampledKhz: 'subsampled_khz',
            sweepDurationMs: 'duration_ms',
        }
        const setClause = fields.map(field => {
            const dbField = fieldMap[field] || field
            return `${dbField} = ?`
        }).join(', ')
        const values = fields.map(field => updateFields[field])
        const stmt = Channel.db.prepare(`
            UPDATE channels 
            SET ${setClause}
            WHERE channel_id = ?
        `)
        const info = stmt.run(...values, channelId)
        return info.changes > 0 ? this.findOneById(channelId) : null
    }

    static delete(channelId) {
        const stmt = Channel.db.prepare(`
            DELETE FROM channels 
            WHERE channel_id = ?
        `)
        const info = stmt.run(channelId)
        return info.changes > 0
    }

    static deleteBySessionId(sessionId) {
        const stmt = Channel.db.prepare(`
            DELETE FROM channels 
            WHERE session_id = ?
        `)
        const info = stmt.run(sessionId)
        return info.changes
    }

    static findSessionIdByChannelId(channelId) {
        const stmt = Channel.db.prepare(`SELECT session_id FROM channels WHERE channel_id = ?`)
        const row = stmt.get(channelId)
        return row ? row.session_id : null
    }
}
