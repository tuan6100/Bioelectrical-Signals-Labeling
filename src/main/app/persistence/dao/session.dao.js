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
        const query = db.prepare(`
            INSERT INTO sessions (
                patient_id, measurement_type, start_time, end_time, content_hash
            )
            VALUES (?, ?, ?, ?, ?)
        `);
        const resultingChanges = query.run(
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
        const query = db.prepare(`
            SELECT 
                session_id, patient_id, measurement_type, start_time, end_time, content_hash
            FROM sessions 
            WHERE session_id = ?
        `)
        const row = query.get(sessionId)
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
        const query = db.prepare(`
            SELECT 
                session_id, patient_id, measurement_type, start_time, end_time, content_hash
            FROM sessions 
            ORDER BY start_time DESC
        `)
        const rows = query.all()
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

    static findByPatientId(patientId) {
        const query = db.prepare(`
            SELECT 
                session_id, patient_id, measurement_type, start_time, end_time, content_hash
            FROM sessions 
            WHERE patient_id = ?
            ORDER BY start_time DESC
        `)
        const rows = query.all(patientId)
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
        const query = db.prepare(`
            SELECT 
                session_id, patient_id, measurement_type, start_time, end_time, content_hash
            FROM sessions 
            WHERE measurement_type = ?
            ORDER BY start_time DESC
        `)
        const rows = query.all(type)
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
        const query = db.prepare(`
            SELECT session_id
            FROM sessions
            WHERE content_hash = ?
        `)
        const result = query.get(contentHash)
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
        const query = db.prepare(`
            UPDATE sessions
            SET ${setClause}
            WHERE session_id = ?
        `)
        const info = query.run(...values, sessionId)
        return info.changes > 0 ? this.findOneById(sessionId) : null
    }

    static delete(sessionId) {
        const query = db.prepare(`
            DELETE FROM sessions
            WHERE session_id = ?
        `)
        const info = query.run(sessionId)
        return info.changes > 0
    }

    static deleteByPatientId(patientId) {
        const query = db.prepare(`
            DELETE FROM sessions
            WHERE patient_id = ?
        `)
        const info = query.run(patientId)
        return info.changes
    }

    static findAllRelatedById(sessionId) {
        const query = db.prepare(`
        SELECT
            p.patient_id, p.first_name AS patient_first_name, p.gender AS patient_gender,
            s.start_time AS session_start_time, s.end_time AS session_end_time,
            c.channel_id, c.channel_number, c.data_kind AS channel_data_kind, c.sweep_index AS channel_sweep_index
        FROM sessions AS s
        INNER JOIN patients AS p ON s.patient_id = p.patient_id
        INNER JOIN channels AS c ON s.session_id = c.session_id
        WHERE s.session_id = ?
    `)
        const rows = query.all(sessionId)
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
}

