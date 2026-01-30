use chrono::{NaiveDate, NaiveDateTime};
use serde::{Deserialize, Serialize};

/// Source of the transaction
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum TransactionSource {
    CsvImport,
    Manual,
}

impl TransactionSource {
    pub fn as_str(&self) -> &'static str {
        match self {
            TransactionSource::CsvImport => "csv_import",
            TransactionSource::Manual => "manual",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "csv_import" => TransactionSource::CsvImport,
            _ => TransactionSource::Manual,
        }
    }
}

/// Main transaction model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transaction {
    pub id: String,
    pub source: TransactionSource,
    pub import_batch_id: Option<i64>,

    // Core fields from Money Lover CSV
    pub note: String,
    pub amount: f64,
    pub category: String,
    pub account: String,
    pub currency: String,
    pub date: String, // ISO format YYYY-MM-DD
    pub event: Option<String>,
    pub exclude_report: bool,

    // Computed fields
    pub expense: f64,
    pub income: f64,
    pub year_month: String,
    pub year: i32,
    pub month: i32,

    // Metadata
    pub created_at: String,
    pub updated_at: String,
}

/// New transaction for creation (without computed fields)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewTransaction {
    pub note: String,
    pub amount: f64,
    pub category: String,
    pub account: String,
    pub currency: String,
    pub date: String,
    pub event: Option<String>,
    pub exclude_report: bool,
    pub source: Option<TransactionSource>,
    pub import_batch_id: Option<i64>,
}

impl NewTransaction {
    /// Compute derived fields and create a full Transaction
    pub fn into_transaction(self) -> Transaction {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S").to_string();

        // Parse date to extract year/month
        let (year, month, year_month) =
            if let Ok(date) = NaiveDate::parse_from_str(&self.date, "%Y-%m-%d") {
                (
                    date.year(),
                    date.month() as i32,
                    date.format("%Y-%m").to_string(),
                )
            } else {
                (0, 0, String::new())
            };

        // Compute expense/income
        let (expense, income) = if self.amount < 0.0 {
            (self.amount.abs(), 0.0)
        } else {
            (0.0, self.amount)
        };

        Transaction {
            id,
            source: self.source.unwrap_or(TransactionSource::Manual),
            import_batch_id: self.import_batch_id,
            note: self.note,
            amount: self.amount,
            category: self.category,
            account: self.account,
            currency: self.currency,
            date: self.date,
            event: self.event,
            exclude_report: self.exclude_report,
            expense,
            income,
            year_month,
            year,
            month,
            created_at: now.clone(),
            updated_at: now,
        }
    }
}

/// Category definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Category {
    pub id: i64,
    pub name: String,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub is_expense: bool,
}

/// Account definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Account {
    pub id: i64,
    pub name: String,
    pub account_type: Option<String>,
    pub icon: Option<String>,
}

/// Import batch tracking
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportBatch {
    pub id: i64,
    pub filename: String,
    pub record_count: i32,
    pub imported_at: String,
}

/// Filter for querying transactions
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct TransactionFilter {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub categories: Option<Vec<String>>,
    pub accounts: Option<Vec<String>>,
    pub min_amount: Option<f64>,
    pub max_amount: Option<f64>,
    pub source: Option<TransactionSource>,
    pub search: Option<String>,
}

/// Statistics summary
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Statistics {
    pub total_expense: f64,
    pub total_income: f64,
    pub net_savings: f64,
    pub savings_rate: f64,
    pub transaction_count: i64,
    pub category_count: i64,
    pub account_count: i64,
}

/// Result of import operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportResult {
    pub batch_id: i64,
    pub imported_count: i32,
    pub skipped_count: i32,
}

use chrono::Datelike;
