import appConfig from "../../config.js";

const newLabels = [
    "Bình thường",
    "Nghi ngờ",
]
export function migrate122to123(db) {
    if (db.getVersion !== 122) {
        return
    }
    const stmt = db.prepare('INSERT OR IGNORE INTO labels (name) VALUES (?)')
    for (const label of newLabels) {
        stmt.run(label)
    }
    db.setVersion(appConfig.get('database.version'))
}