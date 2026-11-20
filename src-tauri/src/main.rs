#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use tauri_plugin_sql::{Migration,MigrationKind};
fn main(){tauri::Builder::default().plugin(tauri_plugin_sql::Builder::default().add_migrations("sqlite:pharmalab.db",vec![Migration{version:1,description:"Create local records",sql:"CREATE TABLE records(key TEXT PRIMARY KEY,value TEXT NOT NULL);",kind:MigrationKind::Up}]).build()).run(tauri::generate_context!()).expect("Unable to start PharmaLab");}
