import db from "../connection/sqlite.connection.js";

export default function Session(
    sessionId,
    patientId,
    type,
    startTime,
    endTime,
    channelCount,
    samplingFrequency,
    sourceFilePath
) {
    this.sessionId = sessionId
    this.patientId = patientId
    this.type = type
    this.startTime = startTime
    this.endTime = endTime
    this.channelCount = channelCount
    this.samplingFrequency = samplingFrequency
    this.sourceFilePath = sourceFilePath
}

Session.prototype.insert = function (session) {
    const query = db.prepare(`
        INSERT INTO sessions (
            session_id, patient_id, type, start_time, end_time, 
            channel_count, sampling_frequency, source_file_path
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    query.run(
        session.sessionId,
        session.patientId,
        session.type,
        session.startTime,
        session.endTime,
        session.channelCount,
        session.samplingFrequency,
        session.sourceFilePath
    )
    return session
}

Session.prototype.findOneById = function (sessionId) {
    const query = db.prepare(`
        SELECT 
            session_id, patient_id, type, start_time, end_time,
            channel_count, sampling_frequency, source_file_path
        FROM sessions 
        WHERE session_id = ?
    `)
    const row = query.get(sessionId)
    if (!row) return null
    return new Session(
        row.session_id,
        row.patient_id,
        row.type,
        row.start_time,
        row.end_time,
        row.channel_count,
        row.sampling_frequency,
        row.source_file_path
    )
}

Session.prototype.findAll = function () {
    const query = db.prepare(`
        SELECT 
            session_id, patient_id, type, start_time, end_time,
            channel_count, sampling_frequency, source_file_path
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
        row.channel_count,
        row.sampling_frequency,
        row.source_file_path
    ))
}

Session.prototype.findByPatientId = function (patientId) {
    const query = db.prepare(`
        SELECT 
            session_id, patient_id, type, start_time, end_time,
            channel_count, sampling_frequency, source_file_path
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
        row.channel_count,
        row.sampling_frequency,
        row.source_file_path
    ))
}

Session.prototype.findByType = function (type) {
    const query = db.prepare(`
        SELECT 
            session_id, patient_id, type, start_time, end_time,
            channel_count, sampling_frequency, source_file_path
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
        row.channel_count,
        row.sampling_frequency,
        row.source_file_path
    ))
}

Session.prototype.update = function (sessionId, updateFields) {
    const fields = Object.keys(updateFields)
    if (fields.length === 0) return null
    const fieldMap = {
        patientId: 'patient_id',
        type: 'type',
        startTime: 'start_time',
        endTime: 'end_time',
        channelCount: 'channel_count',
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

Session.prototype.delete = function (sessionId) {
    const query = db.prepare(`
        DELETE FROM sessions 
        WHERE session_id = ?
    `)
    const info = query.run(sessionId)

    return info.changes > 0
}

Session.prototype.deleteByPatientId = function (patientId) {
    const query = db.prepare(`
        DELETE FROM sessions 
        WHERE patient_id = ?
    `)
    const info = query.run(patientId)
    return info.changes
}
