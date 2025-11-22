import {db as sqliteDb} from "../connection/sqlite.connection.js";

export default class Label {
    constructor(
        labelId,
        name
    ) {
        this.labelId = labelId
        this.name = name
        this.createdAt = new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })
    }

    static db = sqliteDb

    static useDb(dbInstance) {
        Label.db = dbInstance
    }

    insert() {
        const stmt = Label.db.prepare(`
        INSERT INTO labels(label_id, name)
        VALUES (?, ?)
    `)
        const info = stmt.run(this.labelId, this.name)
        this.labelId = info.lastInsertRowid
        return this
}

    static findOneById(labelId) {
        const stmt = Label.db.prepare(`
        SELECT 
            label_id, name, created_at
        FROM labels 
        WHERE label_id = ?
    `)
        const row = stmt.get(labelId)
        if (!row) return null
        return new Label(
            row.label_id,
            row.name,
            row.created_at
        )
}

    static findOneByName(name) {
        const stmt = Label.db.prepare(`
        SELECT 
            label_id, name, created_at
        FROM labels 
        WHERE name = ?
    `)
        const row = stmt.get(name)
        if (!row) return null
        return new Label(
            row.label_id,
            row.name,
            row.created_at
        )
}

    static findAll() {
        const stmt = Label.db.prepare(`
            SELECT label_id,
                   name,
                   created_at
            FROM labels
            ORDER BY name
        `)
        const rows = stmt.all()
        return rows.map(row => new Label(
            row.label_id,
            row.name,
            row.created_at
        ))
    }

    static update(labelId, updateFields) {
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
        const stmt = Label.db.prepare(`
            UPDATE labels
            SET ${setClause}
            WHERE label_id = ?
        `)
        const info = stmt.run(...values, labelId)
        return info.changes > 0 ? this.findOneById(labelId) : null
    }

    static delete(labelId) {
        const stmt = Label.db.prepare(`
            DELETE FROM labels
            WHERE label_id = ?
        `)
        const info = stmt.run(labelId)
        return info.changes > 0
    }
}

