import db from "../connection/sqlite.connection.js";

export default class Sample {
    constructor(
        channelId,
        valueMv,
        timeOffsetMs
    ) {
        this.sampleId = 0
        this.channelId = channelId
        this.valueMv = valueMv
        this.timeOffsetMs = timeOffsetMs
    }

    insert() {
        const query = db.prepare(`
        INSERT INTO samples (channel_id, value_mv, time_offset_ms) 
        VALUES (?, ?, ?)
    `)
        const info = query.run(this.channelId, this.valueMv, this.timeOffsetMs)
        this.sampleId = info.lastInsertRowid
        return this
}

    static insertBatch(samples) {
        const query = db.prepare(`
        INSERT INTO samples (channel_id, value_mv, time_offset_ms) 
        VALUES (?, ?, ?)
    `)
        const insertMany = db.transaction((samples) => {
            for (const sample of samples) {
                query.run(sample.channelId, sample.valueMv, sample.timeOffsetMs)
            }
        })
        insertMany(samples)
        return samples.length
}

    // READ - Find by ID
    static findOneById(sampleId) {
    const query = db.prepare(`
        SELECT 
            sample_id, channel_id, value_mv, time_offset_ms
        FROM samples 
        WHERE sample_id = ?
    `)
    const row = query.get(sampleId)
    if (!row) return null

    return new Sample(
        row.sample_id,
        row.channel_id,
        row.value_mv,
        row.time_offset_ms
    )
}

    static findByChannelId(sessionId, limit = null, offset = 0) {
        let sql = `
        SELECT 
            sample_id, channel_id, value_mv, time_offset_ms
        FROM samples 
        WHERE channel_id = ?
        ORDER BY time_offset_ms
    `

        if (limit !== null) {
            sql += ` LIMIT ? OFFSET ?`
        }

        const query = db.prepare(sql)
        const rows = limit !== null
            ? query.all(sessionId, limit, offset)
            : query.all(sessionId)

        return rows.map(row => new Sample(
            row.sample_id,
            row.channel_id,
            row.value_mv,
            row.time_offset_ms
        ))
}

    static findByChannelAndTimeRange(sessionId, startMs, endMs) {
        const query = db.prepare(`
        SELECT 
            sample_id, channel_id, value_mv, time_offset_ms
        FROM samples 
        WHERE channel_id = ?
        AND time_offset_ms >= ?
        AND time_offset_ms <= ?
        ORDER BY time_offset_ms
    `)
        const rows = query.all(sessionId, startMs, endMs)
        return rows.map(row => new Sample(
            row.sample_id,
            row.channel_id,
            row.value_mv,
            row.time_offset_ms
        ))
}

    static countByChannelId(sessionId) {
        const query = db.prepare(`
        SELECT COUNT(*) as count
        FROM samples 
        WHERE channel_id = ?
    `)
        const row = query.get(sessionId)
        return row.count
}

    static update(sampleId, updateFields) {
        const fields = Object.keys(updateFields)
        if (fields.length === 0) return null
        const fieldMap = {
            sessionId: 'channel_id',
            valueMv: 'value_mv',
            timeOffsetMs: 'time_offset_ms'
        }
        const setClause = fields.map(field => {
            const dbField = fieldMap[field] || field
            return `${dbField} = ?`
        }).join(', ')
        const values = fields.map(field => updateFields[field])
        const query = db.prepare(`
        UPDATE samples 
        SET ${setClause}
        WHERE sample_id = ?
    `)
        const info = query.run(...values, sampleId)
        return info.changes > 0 ? this.findOneById(sampleId) : null
}

    static delete(sampleId) {
        const query = db.prepare(`
        DELETE FROM samples 
        WHERE sample_id = ?
    `)
        const info = query.run(sampleId)
        return info.changes > 0
}

    static deleteByChannelId(sessionId) {
        const query = db.prepare(`
        DELETE FROM samples 
        WHERE channel_id = ?
    `)
        const info = query.run(sessionId)
        return info.changes
}

    static deleteByTimeRange(sessionId, startMs, endMs) {
        const query = db.prepare(`
            DELETE FROM samples 
            WHERE channel_id = ?
            AND time_offset_ms >= ?
            AND time_offset_ms <= ?
        `)
        const info = query.run(sessionId, startMs, endMs)
        return info.changes
    }
}

