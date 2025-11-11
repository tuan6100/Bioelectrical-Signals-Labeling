import db from "../connection/sqlite.connection.js";

export default class Patient {
    constructor(patientId, firstName, gender) {
        this.patientId = patientId
        this.firstName = firstName
        this.gender = gender
    }

    insert() {
        const query = db.prepare(`
            INSERT OR IGNORE INTO patients (patient_id, first_name, gender) 
            VALUES (?, ?, ?)
        `)
        query.run(this.patientId, this.firstName, this.gender)
    }

    static update(patientId, updateFields) {
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

    static findOneById(patientId) {
        const query = db.prepare(`
            SELECT patient_id, first_name, gender 
            FROM patients 
            WHERE patient_id = ?
        `)
        const row = query.get(patientId)
        if (!row) return null
        return new PatientDao(row.patient_id, row.first_name, row.gender)
    }

    static findAll() {
        const query = db.prepare(`
            SELECT patient_id, first_name, gender 
            FROM patients 
            ORDER BY patient_id
        `)
        const rows = query.all()
        return rows.map(row => new PatientDao(row.patient_id, row.first_name, row.gender))
    }

    static delete(patientId) {
        const query = db.prepare(`
            DELETE FROM patients 
            WHERE patient_id = ?
        `)
        const info = query.run(patientId)
        return info.changes > 0
    }
}
