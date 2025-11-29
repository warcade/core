// Core infrastructure modules
pub mod system_api;

#[cfg(feature = "dev-tools")]
pub mod developer_api;

// Re-export builder crate for backwards compatibility (dev-tools only)
#[cfg(feature = "dev-tools")]
pub use builder as plugin_builder;
