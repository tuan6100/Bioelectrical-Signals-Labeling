import db from "../connection/sqlite.connection.js";

export default function Label(
    labelId,
    name,
    createdAt,
    type
) {
    this.labelId = labelId
    this.name = name
    this.createdAt = createdAt
    this.type = type
}

Label.prototype.insert = function (label) {
    const query = db.prepare(`
        INSERT INTO labels (name, type) 
        VALUES (?, ?)
    `)
    const info = query.run(label.name, label.type)
    label.labelId = info.lastInsertRowid
    return this.findOneById(label.labelId)
}

Label.prototype.findOneById = function (labelId) {
    const query = db.prepare(`
        SELECT 
            label_id, name, created_at, type
        FROM labels 
        WHERE label_id = ?
    `)
    const row = query.get(labelId)
    if (!row) return null
    return new Label(
        row.label_id,
        row.name,
        row.created_at,
        row.type
    )
}

Label.prototype.findOneByName = function (name) {
    const query = db.prepare(`
        SELECT 
            label_id, name, created_at, type
        FROM labels 
        WHERE name = ?
    `)
    const row = query.get(name)
    if (!row) return null
    return new Label(
        row.label_id,
        row.name,
        row.created_at,
        row.type
    )
}

Label.prototype.findAll = function () {
    const query = db.prepare(`
        SELECT 
            label_id, name, created_at, type
        FROM labels 
        ORDER BY name
    `)
    const rows = query.all()
    return rows.map(row => new Label(
        row.label_id,
        row.name,
        row.created_at,
        row.type
    ))
}

Label.prototype.findByType = function (type) {
    const query = db.prepare(`
        SELECT 
            label_id, name, created_at, type
        FROM labels 
        WHERE type = ?
        ORDER BY name
    `)
    const rows = query.all(type)
    return rows.map(row => new Label(
        row.label_id,
        row.name,
        row.created_at,
        row.type
    ))
}

Label.prototype.update = function (labelId, updateFields) {
    const fields = Object.keys(updateFields)
    if (fields.length === 0) return null
    const fieldMap = {
        name: 'name',
        type: 'type'
    }
    const setClause = fields.map(field => {
        const dbField = fieldMap[field] || field
        return `${dbField} = ?`
    }).join(', ')
    const values = fields.map(field => updateFields[field])
    const query = db.prepare(`
        UPDATE labels 
        SET ${setClause}
        WHERE label_id = ?
    `)
    const info = query.run(...values, labelId)
    return info.changes > 0 ? this.findOneById(labelId) : null
}

Label.prototype.delete = function (labelId) {
    const query = db.prepare(`
        DELETE FROM labels 
        WHERE label_id = ?
    `)
    const info = query.run(labelId)
    return info.changes > 0
}

