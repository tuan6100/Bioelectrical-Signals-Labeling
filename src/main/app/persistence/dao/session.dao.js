import db from "../connection/sqlite.connection.js";

export default class Session {
    constructor(
        patientId,
        measurementType,
        startTime,
        endTime,
        contentHash
    ) {
        this.sessionId = 0
        this.patientId = patientId
        this.measurementType = measurementType
        this.startTime = startTime
        this.endTime = endTime
        this.contentHash = contentHash
    }

    insert() {
        const stmt = db.prepare(`
            INSERT INTO sessions (
                patient_id, measurement_type, start_time, end_time, content_hash
            )
            VALUES (?, ?, ?, ?, ?)
        `);
        const resultingChanges = stmt.run(
            this.patientId,
            this.measurementType,
            this.startTime,
            this.endTime,
            this.contentHash
        );
        if (!this.sessionId) {
            this.sessionId = resultingChanges.lastInsertRowid;
        }
        return this;
    }


    static findOneById(sessionId) {
        const stmt = db.prepare(`
            SELECT 
                session_id, patient_id, measurement_type, start_time, end_time, content_hash
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
            row.subsampled,
            row.sampling_frequency,
            row.content_hash
        )
    }

    static findAll() {
        const stmt = db.prepare(`
            SELECT 
                session_id, patient_id, measurement_type, start_time, end_time, content_hash
            FROM sessions 
            ORDER BY start_time DESC
        `)
        const rows = stmt.all()
        return rows.map(row => new Session(
            row.session_id,
            row.patient_id,
            row.type,
            row.start_time,
            row.end_time,
            row.subsampled,
            row.sampling_frequency,
            row.content_hash
        ))
    }

    static findAllWithPagination(limit, offset) {
        const stmt = db.prepare(`
            SELECT s.session_id, s.measurement_type, s.start_time, s.end_time,
                   a.patient_id, a.first_name AS patient_name
            FROM sessions s
            INNER JOIN patients a ON s.patient_id = a.patient_id
            ORDER BY start_time DESC
            LIMIT ? OFFSET ?
        `)
        const rows = stmt.all(limit, offset)
        return rows.map(row => new Session(
            row.session_id,
            row.patient_id,
            row.patient_name,
            row.measurement_type,
            row.start_time,
            row.end_time
        ))
    }

    static findByPatientId(patientId) {
        const stmt = db.prepare(`
            SELECT 
                session_id, patient_id, measurement_type, start_time, end_time, content_hash
            FROM sessions 
            WHERE patient_id = ?
            ORDER BY start_time DESC
        `)
        const rows = stmt.all(patientId)
        return rows.map(row => new Session(
            row.session_id,
            row.patient_id,
            row.type,
            row.start_time,
            row.end_time,
            row.subsampled,
            row.sampling_frequency,
            row.content_hash
        ))
    }

    static findByType(type) {
        const stmt = db.prepare(`
            SELECT 
                session_id, patient_id, measurement_type, start_time, end_time, content_hash
            FROM sessions 
            WHERE measurement_type = ?
            ORDER BY start_time DESC
        `)
        const rows = stmt.all(type)
        return rows.map(row => new Session(
            row.session_id,
            row.patient_id,
            row.type,
            row.start_time,
            row.end_time,
            row.subsampled,
            row.sampling_frequency,
            row.content_hash
        ))
    }

    static findByContentHash(contentHash) {
        const stmt = db.prepare(`
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
            type: 'type',
            startTime: 'start_time',
            endTime: 'end_time',
            channelCount: 'subsampled',
            samplingFrequency: 'sampling_frequency',
            sourceFilePath: 'content_hash'
        }
        const setClause = fields.map(field => {
            const dbField = fieldMap[field] || field
            return `${dbField} = ?`
        }).join(', ')
        const values = fields.map(field => updateFields[field])
        const stmt = db.prepare(`
            UPDATE sessions
            SET ${setClause}
            WHERE session_id = ?
        `)
        const info = stmt.run(...values, sessionId)
        return info.changes > 0 ? this.findOneById(sessionId) : null
    }

    static delete(sessionId) {
        const stmt = db.prepare(`
            DELETE FROM sessions
            WHERE session_id = ?
        `)
        const info = stmt.run(sessionId)
        return info.changes > 0
    }

    static deleteByPatientId(patientId) {
        const stmt = db.prepare(`
            DELETE FROM sessions
            WHERE patient_id = ?
        `)
        const info = stmt.run(patientId)
        return info.changes
    }

    static findAllRelatedById(sessionId) {
        const stmt = db.prepare(`
        SELECT
            p.patient_id, p.first_name AS patient_first_name, p.gender AS patient_gender,
            s.start_time AS session_start_time, s.end_time AS session_end_time,
            c.channel_id, c.channel_number, c.data_kind AS channel_data_kind, c.sweep_index AS channel_sweep_index
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
            channels: []
        }
        for (const row of rows) {
            result.channels.push({
                channelId: row.channel_id,
                channelNumber: row.channel_number,
                dataKind: row.channel_data_kind,
                sweepIndex: row.channel_sweep_index
            })
        }
        return result
    }

    static getAllLabelsBySessionId(sessionId) {
        const stmt = db.prepare(`
            SELECT
                c.channel_id,
                c.channel_number,
                c.raw_samples              AS samples,
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

