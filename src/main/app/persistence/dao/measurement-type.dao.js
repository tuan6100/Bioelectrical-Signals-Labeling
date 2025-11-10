import db from "../connection/sqlite.connection.js";

export default function MeasurementType(
    measurementTypeId,
    name
) {
    this.measurementTypeId = measurementTypeId
    this.name = name
}

MeasurementType.prototype.insert = function (measurementType) {
    const query = db.prepare(`
        INSERT INTO measurement_types (name) 
        VALUES (?)
    `)
    const info = query.run(measurementType.name)
    measurementType.measurementTypeId = info.lastInsertRowid
    return measurementType
}

MeasurementType.prototype.findOneById = function (measurementTypeId) {
    const query = db.prepare(`
        SELECT 
            measurement_type_id, name
        FROM measurement_types 
        WHERE measurement_type_id = ?
    `)
    const row = query.get(measurementTypeId)
    if (!row) return null
    return new MeasurementType(
        row.measurement_type_id,
        row.name
    )
}

MeasurementType.prototype.findOneByName = function (name) {
    const query = db.prepare(`
        SELECT 
            measurement_type_id, name
        FROM measurement_types 
        WHERE name = ?
    `)
    const row = query.get(name)
    if (!row) return null
    return new MeasurementType(
        row.measurement_type_id,
        row.name
    )
}

MeasurementType.prototype.findAll = function () {
    const query = db.prepare(`
        SELECT 
            measurement_type_id, name
        FROM measurement_types 
        ORDER BY name
    `)
    const rows = query.all()

    return rows.map(row => new MeasurementType(
        row.measurement_type_id,
        row.name
    ))
}

MeasurementType.prototype.update = function (measurementTypeId, name) {
    const query = db.prepare(`
        UPDATE measurement_types 
        SET name = ?
        WHERE measurement_type_id = ?
    `)

    const info = query.run(name, measurementTypeId)
    return info.changes > 0 ? this.findOneById(measurementTypeId) : null
}

MeasurementType.prototype.delete = function (measurementTypeId) {
    const query = db.prepare(`
        DELETE FROM measurement_types 
        WHERE measurement_type_id = ?
    `)
    const info = query.run(measurementTypeId)

    return info.changes > 0
}

