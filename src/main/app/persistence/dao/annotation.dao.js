import db from "../connection/sqlite.connection.js";

export default class Annotation {
    constructor(
        annotationId,
        channelId,
        labelId,
        startTimeMs,
        endTimeMs,
        note
    ) {
        this.annotationId = annotationId
        this.channelId = channelId
        this.labelId = labelId
        this.startTimeMs = startTimeMs
        this.endTimeMs = endTimeMs
        this.note = note
        this.labeledAt = new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })
        this.updatedAt = null
    }

    insert() {
    const stmt = db.prepare(`
        INSERT INTO annotations (
            annotation_id, channel_id, label_id, start_time_ms, end_time_ms, note, labeled_at, updated_at
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const info = stmt.run(
        this.annotationId,
        this.channelId,
        this.labelId,
        this.startTimeMs,
        this.endTimeMs,
        this.note,
        this.labeledAt,
        this.updatedAt
    )
        this.annotationId = info.lastInsertRowid
    return this
}

    findOneById(annotationId) {
    const stmt = db.prepare(`
        SELECT 
            annotation_id, channel_id, label_id, start_time_ms, end_time_ms, note
        FROM annotations 
        WHERE annotation_id = ?
    `)
    const row = stmt.get(annotationId)
    if (!row) return null
    return new Annotation(
        row.annotation_id,
        row.channel_id,
        row.label_id,
        row.start_time_ms,
        row.end_time_ms,
        row.note
    )
}

    findAll() {
    const stmt = db.prepare(`
        SELECT 
            annotation_id, channel_id, label_id, start_time_ms, end_time_ms, note
        FROM annotations 
        ORDER BY start_time_ms
    `)
    const rows = stmt.all()
    return rows.map(row => new Annotation(
        row.annotation_id,
        row.channel_id,
        row.label_id,
        row.start_time_ms,
        row.end_time_ms,
        row.note
    ))
}

    findBySessionId(channelId) {
    const stmt = db.prepare(`
        SELECT 
            annotation_id, channel_id, label_id, start_time_ms, end_time_ms, note
        FROM annotations 
        WHERE channel_id = ?
        ORDER BY start_time_ms
    `)
    const rows = stmt.all(channelId)
    return rows.map(row => new Annotation(
        row.annotation_id,
        row.channel_id,
        row.label_id,
        row.start_time_ms,
        row.end_time_ms,
        row.note
    ))
}

    findByLabelId(labelId) {
    const stmt = db.prepare(`
        SELECT 
            annotation_id, channel_id, label_id, start_time_ms, end_time_ms, note
        FROM annotations 
        WHERE label_id = ?
        ORDER BY start_time_ms
    `)
    const rows = stmt.all(labelId)
    return rows.map(row => new Annotation(
        row.annotation_id,
        row.channel_id,
        row.label_id,
        row.start_time_ms,
        row.end_time_ms,
        row.note
    ))
}

    findByTimeRange(channelId, startMs, endMs) {
    const stmt = db.prepare(`
        SELECT 
            annotation_id, channel_id, label_id, start_time_ms, end_time_ms, note
        FROM annotations 
        WHERE channel_id = ?
        AND start_time_ms <= ?
        AND end_time_ms >= ?
        ORDER BY start_time_ms
    `)
    const rows = stmt.all(channelId, endMs, startMs)
    return rows.map(row => new Annotation(
        row.annotation_id,
        row.channel_id,
        row.label_id,
        row.start_time_ms,
        row.end_time_ms,
        row.note
    ))
}

    static update(annotationId, updateFields) {
    const fields = Object.keys(updateFields)
    if (fields.length === 0) return null
    const fieldMap = {
        channelId: 'channel_id',
        labelId: 'label_id',
        startTimeMs: 'start_time_ms',
        endTimeMs: 'end_time_ms',
        note: 'note'
    }
    const setClause = fields.map(field => {
        const dbField = fieldMap[field] || field
        return `${dbField} = ?`
    }).join(', ')
    const values = fields.map(field => updateFields[field])
    const stmt = db.prepare(`
        UPDATE annotations 
        SET ${setClause}
        WHERE annotation_id = ?
    `)
    const info = stmt.run(...values, annotationId)
    return info.changes > 0 ? this.findOneById(annotationId) : null
}
    static delete(annotationId) {
    const stmt = db.prepare(`
        DELETE FROM annotations 
        WHERE annotation_id = ?
    `)
    const info = stmt.run(annotationId)
    return info.changes > 0
}

    static deleteBySessionId(channelId) {
    const stmt = db.prepare(`
        DELETE FROM annotations 
        WHERE channel_id = ?
    `)
    const info = stmt.run(channelId)
    return info.changes
}

    static deleteByLabelId(labelId) {
        const stmt = db.prepare(`
            DELETE FROM annotations 
            WHERE label_id = ?
        `)
        const info = stmt.run(labelId)
        return info.changes
    }

    static isOverlapping(channelId, newStartMs, newEndMs) {
    const stmt = db.prepare(`
        SELECT COUNT(*) AS count
        FROM annotations 
        WHERE channel_id = ?
        AND end_time_ms > ?
        AND start_time_ms < ?
    `)
    const row = stmt.get(channelId, newStartMs, newEndMs)
    return row.count > 0
    }
}

