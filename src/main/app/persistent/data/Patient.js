import db from "../connection/sqlite.connection.js";

export default function Patient(patientId, firstName, gender) {
    this.patientId = patientId
    this.firstName = firstName
    this.gender = gender
}

Patient.prototype.insert = function (patient) {
    const query = db.prepare(`
        insert into patients (patient_id, first_name, gender) values (?, ?, ?)
    `)
    query.run(patient.patientId, patient.firstName, patient.gender)
}

Patient.prototype.update = function (patient) {
    const query = db.prepare()
}

Patient.prototype.findOneById = function (patientId) {

}

Patient.prototype.findAll = function () {

}

Patient.prototype.delete = function () {

}
