use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    routing::{delete, get, post, put},
    Json, Router,
};
use rust_embed::RustEmbed;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::broadcast;
use tower_http::cors::{Any, CorsLayer};

use crate::database::Database;
use crate::models::*;
use crate::session::SharedSessionManager;

/// Port for the embedded web server
pub const WEB_SERVER_PORT: u16 = 25095;

/// Embed the dist folder at compile time (only in release mode)
/// In debug mode, assets are served by Vite dev server, so we provide a dummy implementation
#[cfg(not(debug_assertions))]
#[derive(RustEmbed)]
#[folder = "../dist"]
struct Asset;

/// Dummy Asset struct for debug/dev mode - returns None for all assets
/// since the Vite dev server handles asset serving on port 1420
#[cfg(debug_assertions)]
struct Asset;

#[cfg(debug_assertions)]
impl Asset {
    fn get(_path: &str) -> Option<rust_embed::EmbeddedFile> {
        None // In dev mode, assets are served by Vite
    }
}

/// Shared application state
#[derive(Clone)]
pub struct AppState {
    pub db: Arc<Database>,
    pub session_manager: SharedSessionManager,
    pub shutdown_tx: broadcast::Sender<String>,
}

/// API response wrapper
#[derive(Serialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    pub fn error(message: impl Into<String>) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(message.into()),
        }
    }
}

/// Token query parameter for authentication
#[derive(Deserialize)]
pub struct TokenQuery {
    pub token: String,
}

/// Server handle for controlling the web server
pub struct ServerHandle {
    pub token: String,
    pub shutdown_tx: broadcast::Sender<String>,
}

/// Start the embedded web server
pub fn start_web_server(db: Arc<Database>, session_manager: SharedSessionManager) -> ServerHandle {
    let token = session_manager.generate_token();
    let (shutdown_tx, _) = broadcast::channel::<String>(1);

    let state = AppState {
        db,
        session_manager,
        shutdown_tx: shutdown_tx.clone(),
    };

    let shutdown_tx_clone = shutdown_tx.clone();

    // Spawn the server in a background thread
    std::thread::spawn(move || {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let cors = CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any);

            let app = Router::new()
                // Transaction routes
                .route("/api/transactions", get(get_transactions))
                .route("/api/transactions", post(add_transaction))
                .route("/api/transactions", put(update_transaction))
                .route("/api/transactions/{id}", delete(delete_transaction))
                .route("/api/transactions/import", post(import_transactions))
                // Category and account routes
                .route("/api/categories", get(get_categories))
                .route("/api/accounts", get(get_accounts))
                // Statistics route
                .route("/api/statistics", get(get_statistics))
                // Health check
                .route("/api/health", get(health_check))
                // SSE for shutdown notification
                .route("/api/events", get(sse_handler))
                // Static files from embedded dist
                .fallback(get(serve_asset))
                .layer(cors)
                .with_state(state);

            let listener = tokio::net::TcpListener::bind(format!("127.0.0.1:{}", WEB_SERVER_PORT))
                .await
                .expect("Failed to bind to port");

            println!("Web server started on http://127.0.0.1:{}", WEB_SERVER_PORT);

            let mut shutdown_rx = shutdown_tx_clone.subscribe();

            axum::serve(listener, app)
                .with_graceful_shutdown(async move {
                    let _ = shutdown_rx.recv().await;
                    println!("Web server shutting down...");
                })
                .await
                .expect("Failed to run web server");
        });
    });

    ServerHandle { token, shutdown_tx }
}

/// Send shutdown signal to the web server
pub fn stop_web_server(handle: &ServerHandle) {
    let _ = handle.shutdown_tx.send("shutdown".to_string());
}

// Helper to validate token
fn validate_token(
    state: &AppState,
    query: &TokenQuery,
) -> Result<(), (StatusCode, Json<ApiResponse<()>>)> {
    if !state.session_manager.validate_token(&query.token) {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(ApiResponse::error("Invalid session token")),
        ));
    }
    Ok(())
}

// === API Handlers ===

async fn health_check() -> Json<ApiResponse<&'static str>> {
    Json(ApiResponse::success("OK"))
}

#[derive(Deserialize)]
struct GetTransactionsQuery {
    token: String,
    filter: Option<String>, // JSON-encoded TransactionFilter
}

async fn get_transactions(
    State(state): State<AppState>,
    Query(query): Query<GetTransactionsQuery>,
) -> Result<Json<ApiResponse<Vec<Transaction>>>, (StatusCode, Json<ApiResponse<()>>)> {
    validate_token(&state, &TokenQuery { token: query.token })?;

    let filter: Option<TransactionFilter> =
        query.filter.and_then(|f| serde_json::from_str(&f).ok());

    match state.db.get_transactions(filter) {
        Ok(transactions) => Ok(Json(ApiResponse::success(transactions))),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::error(e.to_string())),
        )),
    }
}

async fn add_transaction(
    State(state): State<AppState>,
    Query(query): Query<TokenQuery>,
    Json(transaction): Json<NewTransaction>,
) -> Result<Json<ApiResponse<Transaction>>, (StatusCode, Json<ApiResponse<()>>)> {
    validate_token(&state, &query)?;

    match state.db.add_transaction(transaction) {
        Ok(tx) => Ok(Json(ApiResponse::success(tx))),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::error(e.to_string())),
        )),
    }
}

async fn update_transaction(
    State(state): State<AppState>,
    Query(query): Query<TokenQuery>,
    Json(transaction): Json<Transaction>,
) -> Result<Json<ApiResponse<Transaction>>, (StatusCode, Json<ApiResponse<()>>)> {
    validate_token(&state, &query)?;

    match state.db.update_transaction(transaction) {
        Ok(tx) => Ok(Json(ApiResponse::success(tx))),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::error(e.to_string())),
        )),
    }
}

async fn delete_transaction(
    State(state): State<AppState>,
    Query(query): Query<TokenQuery>,
    Path(id): Path<String>,
) -> Result<Json<ApiResponse<()>>, (StatusCode, Json<ApiResponse<()>>)> {
    validate_token(&state, &query)?;

    match state.db.delete_transaction(&id) {
        Ok(()) => Ok(Json(ApiResponse::success(()))),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::error(e.to_string())),
        )),
    }
}

#[derive(Deserialize)]
struct ImportRequest {
    transactions: Vec<NewTransaction>,
    filename: String,
}

async fn import_transactions(
    State(state): State<AppState>,
    Query(query): Query<TokenQuery>,
    Json(req): Json<ImportRequest>,
) -> Result<Json<ApiResponse<ImportResult>>, (StatusCode, Json<ApiResponse<()>>)> {
    validate_token(&state, &query)?;

    match state
        .db
        .import_transactions(req.transactions, &req.filename)
    {
        Ok(result) => Ok(Json(ApiResponse::success(result))),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::error(e.to_string())),
        )),
    }
}

async fn get_categories(
    State(state): State<AppState>,
    Query(query): Query<TokenQuery>,
) -> Result<Json<ApiResponse<Vec<Category>>>, (StatusCode, Json<ApiResponse<()>>)> {
    validate_token(&state, &query)?;

    match state.db.get_categories() {
        Ok(categories) => Ok(Json(ApiResponse::success(categories))),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::error(e.to_string())),
        )),
    }
}

async fn get_accounts(
    State(state): State<AppState>,
    Query(query): Query<TokenQuery>,
) -> Result<Json<ApiResponse<Vec<Account>>>, (StatusCode, Json<ApiResponse<()>>)> {
    validate_token(&state, &query)?;

    match state.db.get_accounts() {
        Ok(accounts) => Ok(Json(ApiResponse::success(accounts))),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::error(e.to_string())),
        )),
    }
}

#[derive(Deserialize)]
struct GetStatisticsQuery {
    token: String,
    filter: Option<String>, // JSON-encoded TransactionFilter
}

async fn get_statistics(
    State(state): State<AppState>,
    Query(query): Query<GetStatisticsQuery>,
) -> Result<Json<ApiResponse<Statistics>>, (StatusCode, Json<ApiResponse<()>>)> {
    validate_token(&state, &TokenQuery { token: query.token })?;

    let filter: Option<TransactionFilter> =
        query.filter.and_then(|f| serde_json::from_str(&f).ok());

    match state.db.get_statistics(filter) {
        Ok(stats) => Ok(Json(ApiResponse::success(stats))),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::error(e.to_string())),
        )),
    }
}

// SSE handler for shutdown notifications
async fn sse_handler(
    State(state): State<AppState>,
    Query(query): Query<TokenQuery>,
) -> Result<
    axum::response::Sse<
        impl futures_util::Stream<Item = Result<axum::response::sse::Event, std::convert::Infallible>>,
    >,
    (StatusCode, Json<ApiResponse<()>>),
> {
    use axum::response::sse::{Event, Sse};
    use futures_util::stream;
    use std::time::Duration;

    validate_token(&state, &query)?;

    let shutdown_rx = state.shutdown_tx.subscribe();

    let stream = stream::unfold(
        (shutdown_rx, false),
        |(mut rx, sent_connected)| async move {
            if !sent_connected {
                return Some((
                    Ok(Event::default()
                        .event("connected")
                        .data("Connected to server")),
                    (rx, true),
                ));
            }

            tokio::select! {
                _ = tokio::time::sleep(Duration::from_secs(30)) => {
                    Some((Ok(Event::default().event("ping").data("keepalive")), (rx, true)))
                }
                result = rx.recv() => {
                    match result {
                        Ok(_) => Some((Ok(Event::default().event("shutdown").data("Server is shutting down")), (rx, true))),
                        Err(_) => None,
                    }
                }
            }
        },
    );

    Ok(Sse::new(stream))
}

// Serve static assets from embedded dist folder
async fn serve_asset(uri: axum::http::Uri) -> Result<axum::response::Response, StatusCode> {
    use axum::body::Body;
    use axum::http::{header, Response};

    let path = uri.path().trim_start_matches('/');
    let path = if path.is_empty() { "index.html" } else { path };

    match Asset::get(path) {
        Some(content) => {
            let mime = mime_guess::from_path(path)
                .first_or_octet_stream()
                .to_string();

            Response::builder()
                .status(StatusCode::OK)
                .header(header::CONTENT_TYPE, mime)
                .body(Body::from(content.data.into_owned()))
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
        }
        None => {
            // Try serving index.html for SPA routing
            match Asset::get("index.html") {
                Some(content) => Response::builder()
                    .status(StatusCode::OK)
                    .header(header::CONTENT_TYPE, "text/html")
                    .body(Body::from(content.data.into_owned()))
                    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR),
                None => Err(StatusCode::NOT_FOUND),
            }
        }
    }
}
