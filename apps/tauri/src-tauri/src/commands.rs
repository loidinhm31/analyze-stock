use crate::database::Database;
use crate::models::*;
use std::sync::Arc;
use tauri::State;

/// Get all transactions with optional filter
#[tauri::command]
pub fn get_transactions(
    db: State<Arc<Database>>,
    filter: Option<TransactionFilter>,
) -> Result<Vec<Transaction>, String> {
    db.get_transactions(filter).map_err(|e| e.to_string())
}

/// Add a new transaction
#[tauri::command]
pub fn add_transaction(
    db: State<Arc<Database>>,
    transaction: NewTransaction,
) -> Result<Transaction, String> {
    db.add_transaction(transaction).map_err(|e| e.to_string())
}

/// Update an existing transaction
#[tauri::command]
pub fn update_transaction(
    db: State<Arc<Database>>,
    transaction: Transaction,
) -> Result<Transaction, String> {
    db.update_transaction(transaction)
        .map_err(|e| e.to_string())
}

/// Delete a transaction
#[tauri::command]
pub fn delete_transaction(db: State<Arc<Database>>, id: String) -> Result<(), String> {
    db.delete_transaction(&id).map_err(|e| e.to_string())
}

/// Import transactions from CSV data
#[tauri::command]
pub fn import_transactions(
    db: State<Arc<Database>>,
    transactions: Vec<NewTransaction>,
    filename: String,
) -> Result<ImportResult, String> {
    db.import_transactions(transactions, &filename)
        .map_err(|e| e.to_string())
}

/// Get all categories
#[tauri::command]
pub fn get_categories(db: State<Arc<Database>>) -> Result<Vec<Category>, String> {
    db.get_categories().map_err(|e| e.to_string())
}

/// Get all accounts
#[tauri::command]
pub fn get_accounts(db: State<Arc<Database>>) -> Result<Vec<Account>, String> {
    db.get_accounts().map_err(|e| e.to_string())
}

/// Get statistics
#[tauri::command]
pub fn get_statistics(
    db: State<Arc<Database>>,
    filter: Option<TransactionFilter>,
) -> Result<Statistics, String> {
    db.get_statistics(filter).map_err(|e| e.to_string())
}
