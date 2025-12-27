const migrateTablePatients = `
    ALTER TABLE patients RENAME TO patients_old;
    CREATE TABLE patients (
        patient_id TEXT PRIMARY KEY NOT NULL,
        first_name TEXT,
        gender TEXT CHECK (gender IN ('M','F','U'))
    );

    INSERT INTO patients (patient_id, first_name, gender)
    SELECT patient_id, first_name, gender FROM patients_old;

    DROP TABLE patients_old;
`

const migrateTableSessions = `
    ALTER TABLE sessions RENAME TO sessions_old;

    CREATE TABLE IF NOT EXISTS sessions (
        session_id INTEGER PRIMARY KEY NOT NULL,
        patient_id TEXT NOT NULL,
        measurement_type TEXT DEFAULT 'UNKNOWN' CHECK (measurement_type IN ('ECG','EEG','EMG', 'UNKNOWN')),
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        status TEXT DEFAULT 'NEW' CHECK (status IN ('NEW','IN_PROGRESS', 'REQUEST_DOUBLE_CHECK', 'WAIT_FOR_DOUBLE_CHECK','STUDENT_COMPLETED', 'DOCTOR_COMPLETED')),
        input_file_name TEXT,
        content_hash TEXT UNIQUE,
        updated_at TEXT,
        exported INTEGER DEFAULT 0 CHECK (exported IN (0,1)),
        FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS session_time_idx ON sessions(start_time, end_time);
    CREATE INDEX IF NOT EXISTS session_content_hash_idx ON sessions(content_hash);
    INSERT INTO sessions 
    SELECT session_id, patient_id, measurement_type, start_time, end_time,
           status, input_file_name, content_hash, updated_at, 0 AS exported
    FROM sessions_old;

    DROP TABLE sessions_old;
    
`

const migrateTableChannels = `
    ALTER TABLE channels RENAME TO channels_old;

    CREATE TABLE channels (
        channel_id INTEGER PRIMARY KEY NOT NULL,
        session_id INTEGER NOT NULL,
        channel_number INTEGER NOT NULL,
        raw_samples_uv TEXT NOT NULL,
        sampling_frequency_khz REAL,
        subsampled_khz REAL,
        duration_ms REAL,
        double_checked INTEGER DEFAULT 0 CHECK (double_checked IN (0,1)),
        FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
    );
    INSERT INTO channels
    SELECT channel_id, session_id, channel_number,
           raw_samples_uv, sampling_frequency_khz,
           subsampled_khz, duration_ms, double_checked
    FROM channels_old;
--     WHERE data_kind = 'trace';
    CREATE INDEX IF NOT EXISTS channel_session_channel_number_idx ON channels(session_id, channel_number);

    DROP TABLE channels_old;
`

const migrateTableLabel = null

const migrateTableAnnotations = `
    ALTER TABLE annotations RENAME TO annotations_old;

    CREATE TABLE annotations (
        annotation_id INTEGER PRIMARY KEY NOT NULL,
        channel_id INTEGER NOT NULL,
        label_id INTEGER NOT NULL,
        start_time_ms REAL NOT NULL,
        end_time_ms REAL NOT NULL,
        note TEXT,
        FOREIGN KEY (channel_id) REFERENCES channels(channel_id) ON DELETE CASCADE,
        FOREIGN KEY (label_id) REFERENCES labels(label_id)
    );
    INSERT INTO annotations
    SELECT annotation_id, channel_id, label_id,
           start_time_ms, end_time_ms, note
    FROM annotations_old;
    CREATE INDEX IF NOT EXISTS annotation_start_time_asc_idx ON annotations(start_time_ms ASC);

    DROP TABLE annotations_old;
`

const migrateTableList = [
    migrateTablePatients,
    migrateTableSessions,
    migrateTableChannels,
    migrateTableLabel,
    migrateTableAnnotations
].filter(mig => mig !== null);

export function migrate113to120(db) {
    try {
        db.pragma('foreign_keys = OFF')
        db.transaction(() => {
            migrateTableList.forEach(migrationSQL => {
                db.exec(migrationSQL);
            })
            db.pragma('user_version = 120');
        })();
    } finally {
        db.pragma('foreign_keys = ON')
        db.exec('PRAGMA wal_checkpoint(TRUNCATE)')
        db.exec('VACUUM')
    }

}
