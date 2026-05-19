mod session;
mod web_server;
mod auth;
mod shared_auth;
mod shared_sync;

use auth::{AuthService, AuthResponse, AuthStatus};
use session::{SessionManager, SharedSessionManager};
use std::sync::{Arc, Mutex};
use tauri::Manager;
use web_server::{ServerHandle, WEB_SERVER_PORT};

pub struct AppState {
    auth: Arc<Mutex<AuthService>>,
}

struct WebServerState {
    handle: Mutex<Option<ServerHandle>>,
}

// Auth commands
#[tauri::command]
async fn auth_configure_sync(
    server_url: Option<String>,
    app_id: Option<String>,
    api_key: Option<String>,
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let auth = state.auth.lock().map_err(|e| format!("Failed to lock auth: {}", e))?.clone();
    auth.configure_sync(&app_handle, server_url, app_id, api_key).await
}

#[tauri::command]
async fn auth_register(
    username: String,
    email: String,
    password: String,
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<AuthResponse, String> {
    let auth = state.auth.lock().map_err(|e| format!("Failed to lock auth: {}", e))?.clone();
    auth.register(&app_handle, username, email, password).await
}

#[tauri::command]
async fn auth_login(
    email: String,
    password: String,
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    auth_status_holder: tauri::State<'_, shared_auth::SharedAuthStatusHolder>,
) -> Result<AuthResponse, String> {
    let auth = state.auth.lock().map_err(|e| format!("Failed to lock auth: {}", e))?.clone();
    let response = auth.login(&app_handle, email.clone(), password).await?;
    let status = auth.get_auth_status(&app_handle).await;
    auth_status_holder.update(shared_auth::SharedAuthStatus {
        is_authenticated: status.is_authenticated,
        user_id: status.user_id,
        username: None,
        email: Some(email),
        apps: status.apps,
        is_admin: status.is_admin,
        server_url: status.server_url,
    });
    Ok(response)
}

#[tauri::command]
async fn auth_logout(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    auth_status_holder: tauri::State<'_, shared_auth::SharedAuthStatusHolder>,
) -> Result<(), String> {
    let auth = state.auth.lock().map_err(|e| format!("Failed to lock auth: {}", e))?.clone();
    auth.logout(&app_handle).await?;
    auth_status_holder.clear();
    Ok(())
}

#[tauri::command]
async fn auth_get_status(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    auth_status_holder: tauri::State<'_, shared_auth::SharedAuthStatusHolder>,
) -> Result<AuthStatus, String> {
    let auth = state.auth.lock().map_err(|e| format!("Failed to lock auth: {}", e))?.clone();
    let status = auth.get_auth_status(&app_handle).await;
    auth_status_holder.update(shared_auth::SharedAuthStatus {
        is_authenticated: status.is_authenticated,
        user_id: status.user_id.clone(),
        username: None,
        email: None,
        apps: status.apps.clone(),
        is_admin: status.is_admin,
        server_url: status.server_url.clone(),
    });
    Ok(status)
}

#[tauri::command]
async fn auth_is_authenticated(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<bool, String> {
    let auth = state.auth.lock().map_err(|e| format!("Failed to lock auth: {}", e))?.clone();
    Ok(auth.is_authenticated(&app_handle).await)
}

#[tauri::command]
async fn auth_get_access_token(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    let auth = state.auth.lock().map_err(|e| format!("Failed to lock auth: {}", e))?.clone();
    auth.get_access_token(&app_handle).await
}

// Browser mode commands
#[tauri::command]
fn open_in_browser(
    session_manager: tauri::State<SharedSessionManager>,
    web_state: tauri::State<WebServerState>,
) -> Result<String, String> {
    let mut handle_guard = web_state.handle.lock().map_err(|e| e.to_string())?;

    if handle_guard.is_none() {
        let handle = web_server::start_web_server(session_manager.inner().clone());
        *handle_guard = Some(handle);
    }

    let token = handle_guard.as_ref().map(|h| h.token.clone()).ok_or("Failed to get session token")?;

    let is_dev_mode = std::env::var("TAURI_DEV_HOST").is_ok() || std::env::var("CARGO_MANIFEST_DIR").is_ok();
    let browser_port = if is_dev_mode { 1420 } else { WEB_SERVER_PORT };
    let url = format!("http://localhost:{}?session={}", browser_port, token);

    println!("Browser sync started: {}", url);
    Ok(url)
}

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
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|app| {
            let _ = dotenvy::dotenv();

            let sync_server_url = std::env::var("SYNC_SERVER_URL")
                .unwrap_or_else(|_| "http://localhost:3000".to_string());
            let sync_center_app_id = std::env::var("SYNC_CENTER_APP_ID")
                .unwrap_or_else(|_| "money-insight".to_string());
            let sync_center_api_key = std::env::var("SYNC_CENTER_API_KEY")
                .unwrap_or_else(|_| "your_api_key_here".to_string());

            // Initialize auth service
            let auth = Arc::new(Mutex::new(AuthService::new(
                sync_server_url,
                sync_center_app_id,
                sync_center_api_key,
            )));

            let app_state = AppState { auth };
            app.handle().manage(app_state);

            // Initialize session manager
            let session_manager: SharedSessionManager = Arc::new(SessionManager::new());
            app.handle().manage(session_manager);

            // Initialize web server state
            app.handle().manage(WebServerState { handle: Mutex::new(None) });

            // Initialize shared status holders
            app.handle().manage(shared_auth::create_auth_status_holder());
            app.handle().manage(shared_sync::create_sync_status_holder());

            println!("[MoneyInsight] Application initialized with sync support");

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Auth commands
            auth_configure_sync,
            auth_register,
            auth_login,
            auth_logout,
            auth_get_status,
            auth_is_authenticated,
            auth_get_access_token,
            // Browser mode
            open_in_browser,
            stop_browser_server,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
