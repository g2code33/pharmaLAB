export const desktop =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
let web: Promise<IDBDatabase> | undefined;
function open() {
  return (web ??= new Promise((ok, no) => {
    const r = indexedDB.open("pharmalab", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("records");
    r.onsuccess = () => ok(r.result);
    r.onerror = () => no(r.error);
    r.onblocked = () => no(Error("Close other PharmaLab windows"));
  }));
}
export async function get<T>(key: string): Promise<T | undefined> {
  if (desktop) {
    const { invoke } = await import("@tauri-apps/api/core");
    const value = await invoke<string | null>("read_record", { key });
    return value === null ? undefined : JSON.parse(value);
  }
  const d = await open();
  return new Promise((ok, no) => {
    const r = d.transaction("records").objectStore("records").get(key);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => no(r.error);
  });
}
export async function put(key: string, value: unknown) {
  if (desktop) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("write_record", { key, value: JSON.stringify(value) });
    return;
  }
  const d = await open();
  await new Promise<void>((ok, no) => {
    const t = d.transaction("records", "readwrite");
    t.objectStore("records").put(value, key);
    t.oncomplete = () => ok();
    t.onabort = () => no(t.error);
    t.onerror = () => no(t.error);
  });
}
