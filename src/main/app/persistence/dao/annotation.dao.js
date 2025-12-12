import {db as sqliteDb} from "../connection/sqlite.connection.js";

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
        this.labeledAt = new Date().toISOString()
        this.updatedAt = null
    }

    static db = sqliteDb

    static useDb(dbInstance) {
        Annotation.db = dbInstance
    }

    insert() {
    const stmt = Annotation.db.prepare(`
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

    static findOneById(annotationId) {
        const stmt = Annotation.db.prepare(`
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

    static findAll() {
        const stmt = Annotation.db.prepare(`
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
            row.end_timeMs,
            row.note
        ))
}

    static findByChannelId(channelId) {
        const stmt = Annotation.db.prepare(`
        SELECT 
            a.annotation_id, a.start_time_ms, a.end_time_ms, a.note,
            l.label_id, l.name AS label_name
        FROM annotations a
        INNER JOIN labels l ON a.label_id = l.label_id
        WHERE channel_id = ?
        ORDER BY start_time_ms
    `)
        return stmt.all(channelId)

}

    static findByLabelId(labelId) {
        const stmt = Annotation.db.prepare(`
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
            row.end_timeMs,
            row.note
        ))
    }

    static findByTimeRange(channelId, startMs, endMs) {
        const stmt = Annotation.db.prepare(`
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
        const fields = Object.keys(updateFields);
        if (fields.length === 0) return null;

        const fieldMap = {
            channelId: 'channel_id',
            labelId: 'label_id',
            startTimeMs: 'start_time_ms',
            endTimeMs: 'end_time_ms',
            note: 'note'
        };

        const validFields = fields.filter(f => fieldMap[f]);
        if (validFields.length === 0) return null;

        const assignments = validFields.map(f => `${fieldMap[f]} = ?`).join(', ');
        const updatedAt = new Date().toISOString();
        const finalSetClause = `${assignments}, updated_at = ?`;

        const values = validFields.map(f => updateFields[f]);
        values.push(updatedAt, annotationId);

        const stmt = Annotation.db.prepare(`
            UPDATE annotations
            SET ${finalSetClause}
            WHERE annotation_id = ?
        `);

        const info = stmt.run(...values);
        return info.changes > 0 ? this.findOneById(annotationId) : null;
    }
    static delete(annotationId) {
        const stmt = Annotation.db.prepare(`
        DELETE FROM annotations 
        WHERE annotation_id = ?
    `)
        const info = stmt.run(annotationId)
        return info.changes > 0
    }

    static deleteBySessionId(channelId) {
        const stmt = Annotation.db.prepare(`
        DELETE FROM annotations 
        WHERE channel_id = ?
    `)
        const info = stmt.run(channelId)
        return info.changes
    }

    static deleteByLabelId(labelId) {
        const stmt = Annotation.db.prepare(`
            DELETE FROM annotations 
            WHERE label_id = ?
        `)
        const info = stmt.run(labelId)
        return info.changes
    }

    isOverlapping() {
        const stmt = Annotation.db.prepare(`
            SELECT annotation_id, start_time_ms, end_time_ms
            FROM annotations
            WHERE channel_id = ?
            AND end_time_ms > ?
            AND start_time_ms < ?
        `)
        const rows = stmt.all(this.channelId, this.startTimeMs, this.endTimeMs)
        return rows.length > 0
    }

    isOverlappingWithOthers() {
        const stmt = Annotation.db.prepare(`
            SELECT annotation_id
            FROM annotations
            WHERE channel_id = ?
            AND annotation_id != ?
            AND end_time_ms > ?
            AND start_time_ms < ?
        `);
        const rows = stmt.all(this.channelId , this.annotationId, this.startTimeMs, this.endTimeMs);
        return rows.length > 0;
    }
}
