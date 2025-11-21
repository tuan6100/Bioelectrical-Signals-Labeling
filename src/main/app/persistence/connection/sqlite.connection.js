import Database from "better-sqlite3"
import path from "path"
import {app} from "electron";

const env = process.env.NODE_ENV
let dbName
switch (env) {
    case 'test':
        dbName = 'biosignal-test.db'
        break
    case 'dev':
        dbName = 'biosignal-dev.db'
        break
    default:
        dbName = 'biosignal.db'
}

export const db = new Database(dbName, {
    verbose: console.log
})
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

const ddl = `
    CREATE TABLE IF NOT EXISTS patients (
        patient_id TEXT PRIMARY KEY NOT NULL,
        first_name TEXT NOT NULL,
        gender TEXT CHECK (gender IN ('M','F'))
    );
    CREATE INDEX IF NOT EXISTS patient_name_idx ON patients(first_name);

    CREATE TABLE IF NOT EXISTS sessions (
        session_id INTEGER PRIMARY KEY NOT NULL,
        patient_id TEXT NOT NULL,
        measurement_type TEXT DEFAULT 'UNKNOWN' CHECK (measurement_type IN ('ECG','EEG','EMG', 'UNKNOWN')),
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        input_file_name TEXT,
        content_hash TEXT UNIQUE,
        updated_at TEXT,
        FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS session_time_idx ON sessions(start_time, end_time);
    CREATE INDEX IF NOT EXISTS session_content_hash_idx ON sessions(content_hash);

    CREATE TABLE IF NOT EXISTS channels (
        channel_id INTEGER PRIMARY KEY NOT NULL,
        session_id INTEGER NOT NULL,
        channel_number INTEGER NOT NULL,
        data_kind TEXT NOT NULL,
        sweep_index INTEGER,
        raw_samples_uv TEXT NOT NULL,
        sampling_frequency_khz REAL,
        subsampled_khz REAL,
        sweep_duration_ms REAL,
        trace_duration_ms REAL,
        algorithm TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS channel_data_kind_sweep_idx ON channels(session_id, data_kind, sweep_index);
    CREATE INDEX IF NOT EXISTS channel_session_data_kind_idx ON channels(session_id, data_kind);

    CREATE TABLE IF NOT EXISTS labels (
        label_id INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL UNIQUE,
        created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS label_name_idx ON labels(name);

    CREATE TABLE IF NOT EXISTS annotations (
        annotation_id INTEGER PRIMARY KEY NOT NULL,
        channel_id INTEGER NOT NULL,
        label_id INTEGER NOT NULL,
        start_time_ms REAL NOT NULL,
        end_time_ms REAL NOT NULL,
        note TEXT,
        labeled_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT,
        FOREIGN KEY (channel_id) REFERENCES channels(channel_id) ON DELETE CASCADE,
        FOREIGN KEY (label_id) REFERENCES labels(label_id)
    );

`

db.initSchema = function() {
    db.exec(ddl)
    const stmt = db.prepare('INSERT OR IGNORE INTO labels (name) VALUES (?)')
    stmt.run('Unknown')
    stmt.run('Pending')
}

