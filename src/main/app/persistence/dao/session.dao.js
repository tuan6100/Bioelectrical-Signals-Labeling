import db from "../connection/sqlite.connection.js";

export default class Session {
    constructor(
        patientId,
        measurementType,
        startTime,
        endTime,
        subsampled,
        samplingFrequency,
        sourceFilePath
    ) {
        this.sessionId = 0
        this.patientId = patientId
        this.measurementType = measurementType
        this.startTime = startTime
        this.endTime = endTime
        this.subsampled = subsampled
        this.samplingFrequency = samplingFrequency
        this.sourceFilePath = sourceFilePath
    }

    insert() {
        const query = db.prepare(`
            INSERT INTO sessions (
                patient_id, measurement_type, start_time, end_time,
                subsampled, sampling_frequency, source_file_path
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        const resultingChanges = query.run(
            this.patientId,
            this.measurementType,
            this.startTime,
            this.endTime,
            this.subsampled,
            this.samplingFrequency,
            this.sourceFilePath
        );
        if (!this.sessionId) {
            this.sessionId = resultingChanges.lastInsertRowid;
        }
        return this;
    }


    static findOneById(sessionId) {
        const query = db.prepare(`
            SELECT 
                session_id, patient_id, measurement_type, start_time, end_time,
                subsampled, sampling_frequency, source_file_path
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
            row.source_file_path
        )
    }

    static findAll() {
        const query = db.prepare(`
            SELECT 
                session_id, patient_id, type, start_time, end_time,
                subsampled, sampling_frequency, source_file_path
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
            row.source_file_path
        ))
    }

    static findByPatientId(patientId) {
        const query = db.prepare(`
            SELECT 
                session_id, patient_id, type, start_time, end_time,
                subsampled, sampling_frequency, source_file_path
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
            row.source_file_path
        ))
    }

    static findByType(type) {
        const query = db.prepare(`
            SELECT 
                session_id, patient_id, type, start_time, end_time,
                subsampled, sampling_frequency, source_file_path
            FROM sessions 
            WHERE type = ?
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
            row.source_file_path
        ))
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
            sourceFilePath: 'source_file_path'
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
}
