import db from "../connection/sqlite.connection.js";

export default function Channel(
    channelId,
    sessionId,
    channelIndex,
    name,
    measurementTypeId
) {
    this.channelId = channelId
    this.sessionId = sessionId
    this.channelIndex = channelIndex
    this.name = name
    this.measurementTypeId = measurementTypeId
}

Channel.prototype.insert = function (channel) {
    const query = db.prepare(`
        INSERT INTO channels (
            session_id, channel_index, name, measurement_type_id
        ) 
        VALUES (?, ?, ?, ?)
    `)
    const info = query.run(
        channel.sessionId,
        channel.channelIndex,
        channel.name,
        channel.measurementTypeId
    )
    channel.channelId = info.lastInsertRowid
    return channel
}

Channel.prototype.findOneById = function (channelId) {
    const query = db.prepare(`
        SELECT 
            channel_id, session_id, channel_index, name, measurement_type_id
        FROM channels 
        WHERE channel_id = ?
    `)
    const row = query.get(channelId)
    if (!row) return null
    return new Channel(
        row.channel_id,
        row.session_id,
        row.channel_index,
        row.name,
        row.measurement_type_id
    )
}

Channel.prototype.findAll = function () {
    const query = db.prepare(`
        SELECT 
            channel_id, session_id, channel_index, name, measurement_type_id
        FROM channels 
        ORDER BY session_id, channel_index
    `)
    const rows = query.all()

    return rows.map(row => new Channel(
        row.channel_id,
        row.session_id,
        row.channel_index,
        row.name,
        row.measurement_type_id
    ))
}

Channel.prototype.findBySessionId = function (sessionId) {
    const query = db.prepare(`
        SELECT 
            channel_id, session_id, channel_index, name, measurement_type_id
        FROM channels 
        WHERE session_id = ?
        ORDER BY channel_index
    `)
    const rows = query.all(sessionId)
    return rows.map(row => new Channel(
        row.channel_id,
        row.session_id,
        row.channel_index,
        row.name,
        row.measurement_type_id
    ))
}

Channel.prototype.update = function (channelId, updateFields) {
    const fields = Object.keys(updateFields)
    if (fields.length === 0) return null
    const fieldMap = {
        sessionId: 'session_id',
        channelIndex: 'channel_index',
        name: 'name',
        measurementTypeId: 'measurement_type_id'
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

Channel.prototype.delete = function (channelId) {
    const query = db.prepare(`
        DELETE FROM channels 
        WHERE channel_id = ?
    `)
    const info = query.run(channelId)
    return info.changes > 0
}

Channel.prototype.deleteBySessionId = function (sessionId) {
    const query = db.prepare(`
        DELETE FROM channels 
        WHERE session_id = ?
    `)
    const info = query.run(sessionId)

    return info.changes
}