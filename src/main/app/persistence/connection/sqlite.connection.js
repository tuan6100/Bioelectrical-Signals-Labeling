import Database from "better-sqlite3";

const dbName = process.env.BUILD_TYPE === 'dev'? 'biosignal-dev.db': 'biosignal.db'
const db = new Database(dbName, {
    verbose: console.log
})
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON')

const ddl = `
    CREATE TABLE IF NOT EXISTS patients (
        patient_id TEXT PRIMARY KEY,
        first_name TEXT NOT NULL,
        gender TEXT CHECK (gender IN ('M','F'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
        session_id INTEGER PRIMARY KEY,
        patient_id TEXT NOT NULL,
        measurement_type TEXT DEFAULT 'UNKNOWN' CHECK (measurement_type IN ('ECG','EEG','EMG', 'UNKNOWN')),
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        subsampled REAL,
        sampling_frequency REAL,
        source_file_path TEXT,
        FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
        UNIQUE(patient_id, start_time, end_time)
    );

    CREATE TABLE IF NOT EXISTS channels (
        channel_id INTEGER PRIMARY KEY,
        session_id TEXT NOT NULL,
        channel_number INTEGER NOT NULL,    
        data_kind TEXT NOT NULL CHECK (data_kind IN ('average', 'sweep', 'longtrace')),
        sweep_index INTEGER,            
        sampling_frequency REAL,
        subsampled REAL,
        sweep_duration_ms REAL,
        trace_duration_ms REAL,
        algorithm TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS samples (
        sample_id INTEGER PRIMARY KEY,
        channel_id INTEGER NOT NULL,
        time_offset_ms REAL NOT NULL,
        value_mv REAL NOT NULL,
        FOREIGN KEY (channel_id) REFERENCES channels(channel_id) ON DELETE CASCADE
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
    const stmt = db.prepare('INSERT OR IGNORE INTO labels (name) VALUES (?)');
    stmt.run('Unknown');
    stmt.run('Pending');
};


export default db;