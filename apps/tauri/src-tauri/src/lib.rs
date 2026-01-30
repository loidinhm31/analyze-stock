mod commands;
mod database;
mod models;
mod session;
mod web_server;

use database::Database;
use session::{SessionManager, SharedSessionManager};
use std::sync::{Arc, Mutex};
use tauri::Manager;
use web_server::{ServerHandle, WEB_SERVER_PORT};

/// Shared state for the web server handle
struct WebServerState {
    handle: Mutex<Option<ServerHandle>>,
}

/// Command to open the app in browser
#[tauri::command]
fn open_in_browser(
    db: tauri::State<Arc<Database>>,
    session_manager: tauri::State<SharedSessionManager>,
    web_state: tauri::State<WebServerState>,
) -> Result<String, String> {
    let mut handle_guard = web_state.handle.lock().map_err(|e| e.to_string())?;

    // Start web server if not already running
    if handle_guard.is_none() {
        let handle =
            web_server::start_web_server(db.inner().clone(), session_manager.inner().clone());
        *handle_guard = Some(handle);
    }

    let token = handle_guard
        .as_ref()
        .map(|h| h.token.clone())
        .ok_or("Failed to get session token")?;

    // In dev mode, open browser to Vite dev server for HMR support
    // In production, open to the embedded web server
    // This matches the pattern from cham-lang
    let is_dev_mode =
        std::env::var("TAURI_DEV_HOST").is_ok() || std::env::var("CARGO_MANIFEST_DIR").is_ok();

    let browser_port = if is_dev_mode {
        1420 // Vite dev server
    } else {
        WEB_SERVER_PORT // Embedded server (25095)
    };

    let url = format!("http://localhost:{}?session={}", browser_port, token);

    println!("Browser sync started: {}", url);
    if is_dev_mode {
        println!(
            "   Dev mode: Opening Vite (1420), API on {}",
            WEB_SERVER_PORT
        );
    } else {
        println!(
            "   Production: Serving from embedded server ({})",
            WEB_SERVER_PORT
        );
    }

    Ok(url)
}

/// Command to stop the web server
#[tauri::command]
fn stop_browser_server(web_state: tauri::State<WebServerState>) -> Result<(), String> {
    let mut handle_guard = web_state.handle.lock().map_err(|e| e.to_string())?;

    if let Some(handle) = handle_guard.take() {
        web_server::stop_web_server(&handle);
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Initialize database
            let db = Database::new(app.handle()).expect("Failed to initialize database");
            let db = Arc::new(db);
            app.handle().manage(db);

            // Initialize session manager
            let session_manager: SharedSessionManager = Arc::new(SessionManager::new());
            app.handle().manage(session_manager);

            // Initialize web server state (starts on demand)
            app.handle().manage(WebServerState {
                handle: Mutex::new(None),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_transactions,
            commands::add_transaction,
            commands::update_transaction,
            commands::delete_transaction,
            commands::import_transactions,
            commands::get_categories,
            commands::get_accounts,
            commands::get_statistics,
            open_in_browser,
            stop_browser_server,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
