import Database from "better-sqlite3"
import path from "path";
import {app} from "electron";
import pjson from '../../../../../package.json' with { type: "json" };

const env = process.env.NODE_ENV
let dbFileName
switch (env) {
    case 'test':
        dbFileName = 'biosignal-test.db'
        break
    case 'dev':
        dbFileName = 'biosignal-dev.db'
        break
    default:
        dbFileName = path.join(app.getPath("userData"), "biosignal.db");
}

export const db = new Database(dbFileName, {
    verbose: console.log
})

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')
const cleanedVersion = pjson.version.replace(/[-+].*$/, '').replace(/\./g, '')
db.pragma(`user_version = ${cleanedVersion}`)

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
        status TEXT DEFAULT 'NEW' CHECK (status IN ('NEW','IN_PROGRESS','COMPLETED')),
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
        raw_samples_uv TEXT NOT NULL,
        sampling_frequency_khz REAL,
        subsampled_khz REAL,
        duration_ms REAL,
        exported INTEGER DEFAULT 0 CHECK (exported IN (0,1)),
        FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS channel_data_kind_sweep_idx ON channels(session_id, data_kind);

    CREATE TABLE IF NOT EXISTS labels (
        label_id INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL UNIQUE
    );
    CREATE INDEX IF NOT EXISTS label_name_idx ON labels(name);

    CREATE TABLE IF NOT EXISTS annotations (
        annotation_id INTEGER PRIMARY KEY NOT NULL,
        channel_id INTEGER NOT NULL,
        label_id INTEGER NOT NULL,
        start_time_ms REAL NOT NULL,
        end_time_ms REAL NOT NULL,
        note TEXT,
        FOREIGN KEY (channel_id) REFERENCES channels(channel_id) ON DELETE CASCADE,
        FOREIGN KEY (label_id) REFERENCES labels(label_id)
    );
    CREATE INDEX IF NOT EXISTS annotation_start_time_asc_idx ON annotations(start_time_ms ASC);

`

db.initSchema = function() {
    db.exec(ddl)
    const stmt = db.prepare('INSERT OR IGNORE INTO labels (name) VALUES (?)')
    const labelList = [
        "Nhiễu của tấm tận cùng (Endplate noise)",
        "Nhọn tấm tận cùng (Endplate spike)",
        "Giật sơi (Fibrillation – Diphasic)",
        "Giật sơi (Fibrillation – Monophasic)",
        "Giật sợi (Fibrillation - Intial positive)",
        "Sóng nhọn dương ( Positive sharp waves)",
        "Phóng điện lặp lại thành phức hợp",
        "Phóng điện tăng trương lực",
        "Giật bó (Fasciculation)",
        "Doublets",
        "Triplets",
        "Multiplets",
        "Cramp",
        "Rest tremor",
        "Myokimic Discharge",
        "Neuromyotonic Discharge",
        "Neuropathic MUP (Long Duration)",
        "Neuropathic MUP (Polyphasia)",
        "Neuropathic MUP (Serration)",
        "Neuropathic MUP (Satelite potentials)",
        "Unstable MUP",
        "Myopathic MUP",
        "Kết tập sớm",
        "Kết tập giảm",
        "Unknown"
    ]
    labelList.forEach(label => stmt.run(label))
}

