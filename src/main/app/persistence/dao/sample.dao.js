import db from "../connection/sqlite.connection.js";

export default function Sample(
    sampleId,
    channelId,
    valueMv,
    timeOffsetMs
) {
    this.sampleId = sampleId
    this.channelId = channelId
    this.valueMv = valueMv
    this.timeOffsetMs = timeOffsetMs
}

Sample.prototype.insert = function (sample) {
    const query = db.prepare(`
        INSERT INTO samples (channel_id, value_mv, time_offset_ms) 
        VALUES (?, ?, ?)
    `)
    const info = query.run(sample.channelId, sample.valueMv, sample.timeOffsetMs)
    sample.sampleId = info.lastInsertRowid
    return sample
}

Sample.prototype.insertBatch = function (samples) {
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
Sample.prototype.findOneById = function (sampleId) {
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

Sample.prototype.findByChannelId = function (channelId, limit = null, offset = 0) {
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
        ? query.all(channelId, limit, offset)
        : query.all(channelId)

    return rows.map(row => new Sample(
        row.sample_id,
        row.channel_id,
        row.value_mv,
        row.time_offset_ms
    ))
}

Sample.prototype.findByChannelAndTimeRange = function (channelId, startMs, endMs) {
    const query = db.prepare(`
        SELECT 
            sample_id, channel_id, value_mv, time_offset_ms
        FROM samples 
        WHERE channel_id = ?
        AND time_offset_ms >= ?
        AND time_offset_ms <= ?
        ORDER BY time_offset_ms
    `)
    const rows = query.all(channelId, startMs, endMs)
    return rows.map(row => new Sample(
        row.sample_id,
        row.channel_id,
        row.value_mv,
        row.time_offset_ms
    ))
}

Sample.prototype.countByChannelId = function (channelId) {
    const query = db.prepare(`
        SELECT COUNT(*) as count
        FROM samples 
        WHERE channel_id = ?
    `)
    const row = query.get(channelId)
    return row.count
}

Sample.prototype.update = function (sampleId, updateFields) {
    const fields = Object.keys(updateFields)
    if (fields.length === 0) return null
    const fieldMap = {
        channelId: 'channel_id',
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

Sample.prototype.delete = function (sampleId) {
    const query = db.prepare(`
        DELETE FROM samples 
        WHERE sample_id = ?
    `)
    const info = query.run(sampleId)
    return info.changes > 0
}

Sample.prototype.deleteByChannelId = function (channelId) {
    const query = db.prepare(`
        DELETE FROM samples 
        WHERE channel_id = ?
    `)
    const info = query.run(channelId)
    return info.changes
}

Sample.prototype.deleteByTimeRange = function (channelId, startMs, endMs) {
    const query = db.prepare(`
        DELETE FROM samples 
        WHERE channel_id = ?
        AND time_offset_ms >= ?
        AND time_offset_ms <= ?
    `)
    const info = query.run(channelId, startMs, endMs)
    return info.changes
}

