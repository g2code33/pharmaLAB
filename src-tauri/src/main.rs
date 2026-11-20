#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rusqlite::{params, Connection, OptionalExtension};
use std::path::Path;
use tauri::Manager;

type Failure = Box<dyn std::error::Error>;

fn database(dir: &Path) -> Result<Connection, Failure> {
    std::fs::create_dir_all(dir)?;
    let mut db = Connection::open(dir.join("pharmalab.db"))?;
    let version: i64 = db.query_row("PRAGMA user_version", [], |row| row.get(0))?;
    match version {
        0 => {
            // SQLx's original migration created records but left user_version at zero.
            let tx = db.transaction()?;
            tx.execute_batch("CREATE TABLE IF NOT EXISTS records(key TEXT PRIMARY KEY,value TEXT NOT NULL);")?;
            tx.prepare("SELECT key,value FROM records LIMIT 0")?;
            tx.pragma_update(None, "user_version", 1)?;
            tx.commit()?;
        }
        1 => (),
        _ => return Err("Unsupported notebook database revision".into()),
    }
    Ok(db)
}

fn open(app: &tauri::AppHandle, key: &str) -> Result<Connection, String> {
    if !matches!(key, "settings" | "experiments") {
        return Err("Unknown workspace record".into());
    }
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    database(&dir).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_record(app: tauri::AppHandle, key: String) -> Result<Option<String>, String> {
    open(&app, &key)?
        .query_row("SELECT value FROM records WHERE key=?1", [&key], |row| row.get(0))
        .optional()
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn write_record(app: tauri::AppHandle, key: String, value: String) -> Result<(), String> {
    open(&app, &key)?
        .execute("INSERT OR REPLACE INTO records(key,value) VALUES(?1,?2)", params![key,value])
        .map(|_| ())
        .map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![read_record, write_record])
        .run(tauri::generate_context!())
        .expect("Unable to start PharmaLab");
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn preserve_legacy_rows_and_reject_future_schema() -> Result<(), Failure> {
        let dir = std::env::temp_dir().join(format!("pharmalab-migration-{}", std::process::id()));
        std::fs::create_dir(&dir)?;
        let old = Connection::open(dir.join("pharmalab.db"))?;
        old.execute_batch("CREATE TABLE records(key TEXT PRIMARY KEY,value TEXT NOT NULL); INSERT INTO records VALUES('experiments','historical');")?;
        drop(old);
        let db = database(&dir)?;
        assert_eq!(db.query_row("SELECT value FROM records", [], |r| r.get::<_, String>(0))?, "historical");
        db.pragma_update(None, "user_version", 2)?;
        drop(db);
        assert!(database(&dir).is_err());
        std::fs::remove_dir_all(dir)?;
        Ok(())
    }
}
