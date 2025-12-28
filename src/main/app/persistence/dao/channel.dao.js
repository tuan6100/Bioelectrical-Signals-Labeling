import {db as sqliteDb} from "../connection/sqlite.connection.js";

export default class Channel {
    constructor(
        channelId,
        sessionId,
        channelNumber,
        rawSamplesUv,
        samplingFrequencyKhz,
        subsampledKhz ,
        durationMs,
        doubleChecked
    ) {
        this.channelId = channelId
        this.sessionId = sessionId
        this.channelNumber = channelNumber
        this.rawSamplesUv = rawSamplesUv
        this.samplingFrequencyKhz = samplingFrequencyKhz
        this.subsampledKhz = subsampledKhz
        this.durationMs = durationMs
        this.doubleChecked = doubleChecked
    }

    static db = sqliteDb

    static useDb(dbInstance) {
        Channel.db = dbInstance
    }

    insert() {
        const stmt = Channel.db.prepare(`
        INSERT INTO channels ( channel_id,
            session_id, channel_number, raw_samples_uv,
            sampling_frequency_khz, subsampled_khz, duration_ms
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
        const resultingChanges = stmt.run(
            this.channelId,
            this.sessionId,
            this.channelNumber,
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
                channel_id, session_id, channel_number, raw_samples_uv,
                sampling_frequency_khz, subsampled_khz, duration_ms
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
            for (const channel of channelList) {
                const resultingChanges = stmt.run(
                    channel.channelId,
                    channel.sessionId,
                    channel.channelNumber,
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

    static findOneById(channelId, includesRawSamples = false) {
        const query = includesRawSamples ? `
            SELECT 
                channel_id, session_id, channel_number,
                raw_samples_uv,
                sampling_frequency_khz, subsampled_khz, duration_ms
            FROM channels 
            WHERE channel_id = ?
        ` : `
            SELECT 
                channel_id, session_id, channel_number,
                sampling_frequency_khz, subsampled_khz, duration_ms
            FROM channels 
            WHERE channel_id = ?
        `
        const stmt = Channel.db.prepare(query)
        const row = stmt.get(channelId)
        if (!row) return null
        return new Channel(
            channelId,
            row.session_id,
            row.channel_number,
            includesRawSamples ? row.raw_samples_uv : null,
            row.sampling_frequency_khz,
            row.subsampled_khz,
            row.duration_ms
        )
    }
    static findChannelIdBySessionIdAndChanelNumber(sessionId, channelNumber) {
        const stmt = Channel.db.prepare(`
            SELECT channel_id
            FROM channels
            WHERE session_id = ? AND channel_number = ?
        `)
        const row = stmt.get(sessionId, channelNumber)
        return row ? row.channel_id : null
    }

    static findBySessionId(sessionId) {
        const stmt  = Channel.db.prepare(`
            SELECT 
                channel_id, session_id, channel_number,
                sampling_frequency_khz, subsampled_khz, duration_ms, double_checked
            FROM channels 
            WHERE session_id = ?
            ORDER BY channel_number
        `)
        const rows = stmt.all(sessionId)
        return rows.map(row => {
            const channel = new Channel(
                row.channel_id,
                row.session_id,
                row.channel_number,
                row.sampling_frequency_khz,
                row.subsampled_khz,
                row.duration_ms,
                row.double_checked
            )
            channel.channelId = row.channel_id
            return channel
        })
    }

    static findSamplesById(channelId) {
        const stmt = Channel.db.prepare(`
            SELECT
                c.raw_samples_uv,
                c.sampling_frequency_khz,
                c.subsampled_khz,
                c.duration_ms,
                a.annotation_id, a.start_time_ms, a.end_time_ms, a.note, a.needs_revision,
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

    static updateDoubleChecked(channelId, checkedValue) {
        const stmt = Channel.db.prepare(`
            UPDATE channels 
            SET double_checked = ?
            WHERE channel_id = ?
        `)
        const info = stmt.run(checkedValue, channelId)
        return info.changes > 0
    }

    static countPendingDoubleCheck(sessionId) {
        const stmt = Channel.db.prepare(`
            SELECT COUNT(*) as count
            FROM channels 
            WHERE session_id = ? AND (double_checked = 0) 
        `)
        const row = stmt.get(sessionId)
        return row ? row.count : 0
    }
}
