fn main() {
    let manifest = tauri_build::AppManifest::new().commands(&["read_record", "write_record"]);
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(manifest))
        .expect("Unable to prepare local application permissions");
}
