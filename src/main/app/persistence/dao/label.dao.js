import {db as sqliteDb} from "../connection/sqlite.connection.js";

export default class Label {
    constructor(
        labelId,
        name
    ) {
        this.labelId = labelId
        this.name = name
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
            label_id, name
        FROM labels 
        WHERE label_id = ?
    `)
        const row = stmt.get(labelId)
        if (!row) return null
        return new Label(
            row.label_id,
            row.name
        )
}

    static findOneByName(name) {
        const stmt = Label.db.prepare(`
        SELECT 
            label_id, name
        FROM labels 
        WHERE name = ?
    `)
        const row = stmt.get(name)
        if (!row) return null
        return new Label(
            row.label_id,
            row.name,
        )
}

    static findAll() {
        const stmt = Label.db.prepare(`
            SELECT label_id,
                   name
            FROM labels
            ORDER BY name
        `)
        const rows = stmt.all()
        return rows.map(row => new Label(
            row.label_id,
            row.name
        ))
    }
}

