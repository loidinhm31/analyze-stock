use rand::Rng;
use std::sync::{Arc, Mutex};

/// Session manager for browser authentication
pub struct SessionManager {
    token: Mutex<Option<String>>,
}

impl SessionManager {
    pub fn new() -> Self {
        Self {
            token: Mutex::new(None),
        }
    }

    /// Generate a 256-bit random token
    pub fn generate_token(&self) -> String {
        let mut rng = rand::thread_rng();
        let bytes: [u8; 32] = rng.gen();
        let token = hex::encode(bytes);

        *self.token.lock().unwrap() = Some(token.clone());
        token
    }

    /// Validate token using constant-time comparison
    pub fn validate_token(&self, token: &str) -> bool {
        let guard = self.token.lock().unwrap();
        match &*guard {
            Some(stored) => constant_time_eq(stored.as_bytes(), token.as_bytes()),
            None => false,
        }
    }

    /// Invalidate the current token
    pub fn invalidate(&self) {
        *self.token.lock().unwrap() = None;
    }
}

impl Default for SessionManager {
    fn default() -> Self {
        Self::new()
    }
}

/// Constant-time comparison to prevent timing attacks
fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }

    let mut result = 0u8;
    for (x, y) in a.iter().zip(b.iter()) {
        result |= x ^ y;
    }
    result == 0
}

pub type SharedSessionManager = Arc<SessionManager>;
