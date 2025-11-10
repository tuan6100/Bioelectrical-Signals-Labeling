import db from "../connection/sqlite.connection.js";

export default function PatientDao(
    patientId,
    firstName,
    gender
) {
    this.patientId = patientId
    this.firstName = firstName
    this.gender = gender
}

PatientDao.prototype.insert = function (patient) {
    const query = db.prepare(`
        INSERT INTO patients (patient_id, first_name, gender) 
        VALUES (?, ?, ?)
    `)
    query.run(patient.patientId, patient.firstName, patient.gender)
    return patient
}

PatientDao.prototype.update = function (patientId, updateFields) {
    const fields = Object.keys(updateFields)
    if (fields.length === 0) return null
    const setClause = fields.map(field => {
        const dbField = field === 'firstName' ? 'first_name' : field
        return `${dbField} = ?`
    }).join(', ')
    const values = fields.map(field => updateFields[field])
    const query = db.prepare(`
        UPDATE patients 
        SET ${setClause}
        WHERE patient_id = ?
    `)
    const info = query.run(...values, patientId)
    return info.changes > 0 ? this.findOneById(patientId) : null
}

PatientDao.prototype.findOneById = function (patientId) {
    const query = db.prepare(`
        SELECT patient_id, first_name, gender 
        FROM patients 
        WHERE patient_id = ?
    `)
    const row = query.get(patientId)
    if (!row) return null
    return new PatientDao(row.patient_id, row.first_name, row.gender)
}

PatientDao.prototype.findAll = function () {
    const query = db.prepare(`
        SELECT patient_id, first_name, gender 
        FROM patients 
        ORDER BY patient_id
    `)
    const rows = query.all()
    return rows.map(row => new PatientDao(row.patient_id, row.first_name, row.gender))
}

PatientDao.prototype.delete = function (patientId) {
    const query = db.prepare(`
        DELETE FROM patients 
        WHERE patient_id = ?
    `)
    const info = query.run(patientId)
    return info.changes > 0
}
