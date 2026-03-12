const newLabels = [
    "Bình thường",
    "Nghi ngờ",
]
export function migrate120to121(db) {
    const stmt = db.prepare('INSERT OR IGNORE INTO labels (name) VALUES (?)')
    for (const label of newLabels) {
        stmt.run(label)
    }
}