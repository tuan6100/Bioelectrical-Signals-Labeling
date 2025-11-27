import {db as sqliteDb} from "../connection/sqlite.connection.js";

export default class Session {
    constructor(
        sessionId,
        patientId,
        measurementType,
        startTime,
        endTime,
        status,
        inputFileName,
        contentHash,
        updatedAt
    ) {
        this.sessionId = sessionId
        this.patientId = patientId
        this.measurementType = measurementType
        this.startTime = startTime
        this.endTime = endTime
        this.status = status
        this.inputFileName = inputFileName
        this.contentHash = contentHash
        this.updatedAt = updatedAt
    }

    static db = sqliteDb

    static useDb(dbInstance) {
        Session.db = dbInstance
    }



    insert() {
        const now = this.updatedAt?? new Date().toISOString()
        const stmt = Session.db.prepare(`
            INSERT INTO sessions (
                session_id, patient_id, measurement_type, start_time, end_time, status, input_file_name, content_hash, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const resultingChanges = stmt.run(
            this.sessionId,
            this.patientId,
            this.measurementType,
            this.startTime,
            this.endTime,
            this.status,
            this.inputFileName,
            this.contentHash,
            now
        );
        if (!this.sessionId) {
            this.sessionId = resultingChanges.lastInsertRowid
        }
        this.updatedAt = now
        return this;
    }

    static touch(sessionId) {
        const now = new Date().toISOString()
        Session.db.prepare(`UPDATE sessions SET updated_at = ? WHERE session_id = ?`).run(now, sessionId)
    }

    static countAll() {
        const row = Session.db.prepare(`SELECT COUNT(*) AS total FROM sessions`).get()
        return row ? row.total : 0
    }

    static findOneById(sessionId) {
        const stmt = Session.db.prepare(`
            SELECT 
                session_id, patient_id, measurement_type, start_time, end_time, status, input_file_name, content_hash, updated_at
            FROM sessions 
            WHERE session_id = ?
        `)
        const row = stmt.get(sessionId)
        if (!row) return null
        return new Session(
            row.session_id,
            row.patient_id,
            row.measurement_type,
            row.start_time,
            row.end_time,
            row.status,
            row.input_file_name,
            row.content_hash,
            row.updated_at
        )
    }

    static findAll() {
        const stmt = Session.db.prepare(`
            SELECT 
                session_id, patient_id, measurement_type, start_time, end_time, status, input_file_name, content_hash, updated_at
            FROM sessions
            ORDER BY datetime(updated_at) DESC
        `)
        const rows = stmt.all()
        return rows.map(row => new Session(
            row.session_id,
            row.patient_id,
            row.measurement_type,
            row.start_time,
            row.end_time,
            row.input_file_name,
            row.content_hash,
            row.updated_at
        ))
    }

    static findAllWithPagination(page, size) {
        const limit = size
        const offset = (page - 1) * size
        const stmt = Session.db.prepare(`
            SELECT s.session_id, s.patient_id, s.measurement_type, s.start_time, s.end_time, s.status, s.input_file_name, s.updated_at,
                   a.first_name AS patient_name, a.gender AS patient_gender
            FROM sessions s
            INNER JOIN patients a ON s.patient_id = a.patient_id
            ORDER BY datetime(s.updated_at) DESC
            LIMIT ? OFFSET ?
        `)
        return stmt.all(limit, offset)
    }

    static findByPatientId(patientId) {
        const stmt = Session.db.prepare(`
            SELECT 
                session_id, patient_id, measurement_type, start_time, end_time, status, input_file_name, updated_at
            FROM sessions 
            WHERE patient_id = ?
            ORDER BY start_time DESC
        `)
        return  stmt.all(patientId)
    }
    static findSessionIdByContentHash(contentHash) {
        const stmt = Session.db.prepare(`
            SELECT session_id
            FROM sessions
            WHERE content_hash = ?
        `)
        const result = stmt.get(contentHash)
        return result ? result.session_id : null
    }

    static update(sessionId, updateFields) {
        const fields = Object.keys(updateFields)
        if (fields.length === 0) return null
        const fieldMap = {
            patientId: 'patient_id',
            startTime: 'start_time',
            endTime: 'end_time',
            status: 'status',
        }
        const setClause = fields.map(field => {
            const dbField = fieldMap[field] || field
            return `${dbField} = ?`
        }).join(', ')
        const values = fields.map(field => updateFields[field])
        const now = new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })
        const stmt = Session.db.prepare(`
            UPDATE sessions
            SET ${setClause}, updated_at = ?
            WHERE session_id = ?
        `)
        const info = stmt.run(...values, now, sessionId)
        return info.changes > 0 ? this.findOneById(sessionId) : null
    }

    static delete(sessionId) {
        const stmt = Session.db.prepare(`
            DELETE FROM sessions
            WHERE session_id = ?
        `)
        const info = stmt.run(sessionId)
        return info.changes > 0
    }

    static deleteByPatientId(patientId) {
        const stmt = Session.db.prepare(`
            DELETE FROM sessions
            WHERE patient_id = ?
        `)
        const info = stmt.run(patientId)
        return info.changes
    }

    static findAllRelatedById(sessionId) {
        const stmt = Session.db.prepare(`
        SELECT
            p.patient_id, p.first_name AS patient_first_name, p.gender AS patient_gender,
            s.start_time AS session_start_time, s.end_time AS session_end_time,
            s.status, s.updated_at AS session_updated_at,
            c.channel_id, c.channel_number, c.data_kind AS channel_data_kind
        FROM sessions AS s
        INNER JOIN patients AS p ON s.patient_id = p.patient_id
        INNER JOIN channels AS c ON s.session_id = c.session_id
        WHERE s.session_id = ?
    `)
        const rows = stmt.all(sessionId)
        if (rows.length === 0) {
            return null
        }
        const result = {
            patientId: rows[0].patient_id,
            patientFirstName: rows[0].patient_first_name,
            patientGender: rows[0].patient_gender,
            sessionStartTime: rows[0].session_start_time,
            sessionEndTime: rows[0].session_end_time,
            sessionStatus: rows[0].status,
            sessionUpdatedAt: new Date(rows[0].session_updated_at).toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }),
            channels: []
        }
        for (const row of rows) {
            result.channels.push({
                channelId: row.channel_id,
                channelNumber: row.channel_number,
                dataKind: row.channel_data_kind
            })
        }
        return result
    }

    static getAllLabelsBySessionId(sessionId) {
        const stmt = Session.db.prepare(`
            SELECT
                c.channel_id,
                c.channel_number,
                c.raw_samples_uv              AS samples,
                c.sampling_frequency_khz   AS sampling_frequency,
                c.subsampled_khz           AS subsampled,
                a.annotation_id,
                a.start_time_ms,
                a.end_time_ms,
                a.note,
                l.label_id,
                l.name                     AS label_name
            FROM sessions s
            INNER JOIN channels c ON s.session_id = c.session_id
            LEFT JOIN annotations a ON a.channel_id = c.channel_id
            LEFT JOIN labels l ON l.label_id = a.label_id
            WHERE s.session_id = ? AND l.label_id IS NOT NULL
            ORDER BY c.channel_id, a.start_time_ms;
        `)
        const rows = stmt.all(sessionId)
        return rows.map(row => ({
            channelId: row.channel_id,
            channelNumber: row.channel_number,
            samples: JSON.parse(row.samples || '[]'),
            samplingFrequency: +row.sampling_frequency || null,
            subsampled: +row.subsampled || null,
            annotation: row.annotation_id ? {
                id: row.annotation_id,
                labelId: row.label_id,
                labelName: row.label_name,
                startTimeMs: +row.start_time_ms,
                endTimeMs: +row.end_time_ms,
                note: row.note
            } : null
        }));
    }
}

