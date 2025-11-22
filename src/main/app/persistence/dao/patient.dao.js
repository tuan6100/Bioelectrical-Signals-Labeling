import {db as sqliteDb} from "../connection/sqlite.connection.js";

export default class Patient {
    constructor(patientId, firstName, gender) {
        this.patientId = patientId
        this.firstName = firstName
        this.gender = gender
    }

    static db = sqliteDb

    static useDb(dbInstance) {
        Patient.db = dbInstance
    }

    insert() {
        const stmt = Patient.db.prepare(`
            INSERT OR IGNORE INTO patients (patient_id, first_name, gender) 
            VALUES (?, ?, ?)
        `)
        stmt.run(this.patientId, this.firstName, this.gender)
    }

    static update(patientId, updateFields) {
        const fields = Object.keys(updateFields)
        if (fields.length === 0) return null
        const setClause = fields.map(field => {
            const dbField = field === 'firstName' ? 'first_name' : field
            return `${dbField} = ?`
        }).join(', ')
        const values = fields.map(field => updateFields[field])
        const stmt = Patient.db.prepare(`
            UPDATE patients 
            SET ${setClause}
            WHERE patient_id = ?
        `)
        const info = stmt.run(...values, patientId)
        return info.changes > 0 ? this.findOneById(patientId) : null
    }

    static findOneById(patientId) {
        const stmt = Patient.db.prepare(`
            SELECT patient_id, first_name, gender 
            FROM patients 
            WHERE patient_id = ?
        `)
        const row = stmt.get(patientId)
        if (!row) return null
        return new Patient(row.patient_id, row.first_name, row.gender)
    }

    static findAll() {
        const stmt = Patient.db.prepare(`
            SELECT patient_id, first_name, gender 
            FROM patients 
            ORDER BY patient_id
        `)
        const rows = stmt.all()
        return rows.map(row => new Patient(row.patient_id, row.first_name, row.gender))
    }

    static delete(patientId) {
        const stmt = Patient.db.prepare(`
            DELETE FROM patients 
            WHERE patient_id = ?
        `)
        const info = stmt.run(patientId)
        return info.changes > 0
    }
}
