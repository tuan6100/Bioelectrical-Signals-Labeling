import Database from "better-sqlite3";

const db = new Database('biosignal.db', {
    verbose: console.log
})
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON')

const ddl = `
    CREATE TABLE IF NOT EXISTS patients (
        patient_id INTEGER PRIMARY KEY,
        first_name TEXT NOT NULL,
        gender TEXT CHECK (gender IN ('M','F'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        patient_id INTEGER NOT NULL,
        type TEXT CHECK (type IN ('ECG','EEG','EMG')),
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        channel_count INTEGER,
        sampling_frequency REAL,
        source_file_path TEXT,
        FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS measurement_types (
        measurement_type_id INTEGER PRIMARY KEY,
        name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS channels (
        channel_id INTEGER PRIMARY KEY,
        session_id INTEGER NOT NULL,
        channel_index INTEGER NOT NULL,
        name TEXT,
        measurement_type_id INTEGER,
        FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE,
        FOREIGN KEY (measurement_type_id) REFERENCES measurement_types(measurement_type_id),
        UNIQUE(session_id, channel_index)
    );

    CREATE TABLE IF NOT EXISTS samples (
        sample_id INTEGER PRIMARY KEY,
        channel_id INTEGER NOT NULL,
        value_mv REAL NOT NULL,  
        time_offset_ms REAL NOT NULL,
        FOREIGN KEY (channel_id) REFERENCES channels(channel_id) ON DELETE CASCADE,
        UNIQUE(channel_id, time_offset_ms)
    );

    CREATE TABLE IF NOT EXISTS labels (
        label_id INTEGER PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at TEXT DEFAULT (datetime('now')),
        type TEXT
    );

    CREATE TABLE IF NOT EXISTS annotations (
        annotation_id INTEGER PRIMARY KEY,
        session_id INTEGER,
        label_id INTEGER,
        start_time_ms REAL NOT NULL,
        end_time_ms REAL NOT NULL,
        note TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE,
        FOREIGN KEY (label_id) REFERENCES labels(label_id)
    );

`;

db.initSchema = function() {
    db.exec(ddl);
    db.prepare(
        'INSERT OR IGNORE INTO labels (name) VALUES (?)'
    ).run('Unknown');
};

export default db;