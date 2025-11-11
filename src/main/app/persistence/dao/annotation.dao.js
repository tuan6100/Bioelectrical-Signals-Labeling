import db from "../connection/sqlite.connection.js";

export default class Annotation {
    constructor(
        annotationId,
        sessionId,
        labelId,
        startTimeMs,
        endTimeMs,
        note
    ) {
        this.annotationId = annotationId
        this.sessionId = sessionId
        this.labelId = labelId
        this.startTimeMs = startTimeMs
        this.endTimeMs = endTimeMs
        this.note = note
    }

    insert(annotation) {
    const query = db.prepare(`
        INSERT INTO annotations (
            session_id, label_id, start_time_ms, end_time_ms, note
        ) 
        VALUES (?, ?, ?, ?, ?)
    `)
    const info = query.run(
        annotation.sessionId,
        annotation.labelId,
        annotation.startTimeMs,
        annotation.endTimeMs,
        annotation.note
    )
    annotation.annotationId = info.lastInsertRowid
    return annotation
}

    findOneById(annotationId) {
    const query = db.prepare(`
        SELECT 
            annotation_id, session_id, label_id, start_time_ms, end_time_ms, note
        FROM annotations 
        WHERE annotation_id = ?
    `)
    const row = query.get(annotationId)
    if (!row) return null
    return new Annotation(
        row.annotation_id,
        row.session_id,
        row.label_id,
        row.start_time_ms,
        row.end_time_ms,
        row.note
    )
}

    findAll() {
    const query = db.prepare(`
        SELECT 
            annotation_id, session_id, label_id, start_time_ms, end_time_ms, note
        FROM annotations 
        ORDER BY start_time_ms
    `)
    const rows = query.all()
    return rows.map(row => new Annotation(
        row.annotation_id,
        row.session_id,
        row.label_id,
        row.start_time_ms,
        row.end_time_ms,
        row.note
    ))
}

    findBySessionId(sessionId) {
    const query = db.prepare(`
        SELECT 
            annotation_id, session_id, label_id, start_time_ms, end_time_ms, note
        FROM annotations 
        WHERE session_id = ?
        ORDER BY start_time_ms
    `)
    const rows = query.all(sessionId)
    return rows.map(row => new Annotation(
        row.annotation_id,
        row.session_id,
        row.label_id,
        row.start_time_ms,
        row.end_time_ms,
        row.note
    ))
}

    findByLabelId(labelId) {
    const query = db.prepare(`
        SELECT 
            annotation_id, session_id, label_id, start_time_ms, end_time_ms, note
        FROM annotations 
        WHERE label_id = ?
        ORDER BY start_time_ms
    `)
    const rows = query.all(labelId)
    return rows.map(row => new Annotation(
        row.annotation_id,
        row.session_id,
        row.label_id,
        row.start_time_ms,
        row.end_time_ms,
        row.note
    ))
}

    findByTimeRange(sessionId, startMs, endMs) {
    const query = db.prepare(`
        SELECT 
            annotation_id, session_id, label_id, start_time_ms, end_time_ms, note
        FROM annotations 
        WHERE session_id = ?
        AND start_time_ms <= ?
        AND end_time_ms >= ?
        ORDER BY start_time_ms
    `)
    const rows = query.all(sessionId, endMs, startMs)
    return rows.map(row => new Annotation(
        row.annotation_id,
        row.session_id,
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
        sessionId: 'session_id',
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
    const query = db.prepare(`
        UPDATE annotations 
        SET ${setClause}
        WHERE annotation_id = ?
    `)
    const info = query.run(...values, annotationId)
    return info.changes > 0 ? this.findOneById(annotationId) : null
}
    static delete(annotationId) {
    const query = db.prepare(`
        DELETE FROM annotations 
        WHERE annotation_id = ?
    `)
    const info = query.run(annotationId)
    return info.changes > 0
}

    static deleteBySessionId(sessionId) {
    const query = db.prepare(`
        DELETE FROM annotations 
        WHERE session_id = ?
    `)
    const info = query.run(sessionId)
    return info.changes
}

    static deleteByLabelId(labelId) {
        const query = db.prepare(`
            DELETE FROM annotations 
            WHERE label_id = ?
        `)
        const info = query.run(labelId)
        return info.changes
    }
}

