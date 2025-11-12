//! Helpful macros for plugin development

/// Macro to simplify plugin metadata creation
///
/// Usage:
/// ```
/// impl Plugin for MyPlugin {
///     plugin_metadata!("my-plugin", "My Plugin", "1.0.0", "Plugin description");
///     // or with author:
///     plugin_metadata!("my-plugin", "My Plugin", "1.0.0", "Plugin description", author: "Your Name");
/// }
/// ```
#[macro_export]
macro_rules! plugin_metadata {
    ($id:expr, $name:expr, $version:expr, $description:expr) => {
        fn metadata(&self) -> $crate::PluginMetadata {
            $crate::PluginMetadata {
                id: $id.to_string(),
                name: $name.to_string(),
                version: $version.to_string(),
                description: $description.to_string(),
                author: "WebArcade Team".to_string(),
                dependencies: vec![],
            }
        }
    };
    ($id:expr, $name:expr, $version:expr, $description:expr, author: $author:expr) => {
        fn metadata(&self) -> $crate::PluginMetadata {
            $crate::PluginMetadata {
                id: $id.to_string(),
                name: $name.to_string(),
                version: $version.to_string(),
                description: $description.to_string(),
                author: $author.to_string(),
                dependencies: vec![],
            }
        }
    };
}

/// Macro to simplify route registration
///
/// Usage:
/// ```
/// route!(router, GET "/path" => handler_function);
/// route!(router, POST "/path" => handler_function);
/// route!(router, GET "/path/:param", path => handler_function);
/// route!(router, OPTIONS "/path" => handler_function);
/// ```
#[macro_export]
macro_rules! route {
    ($router:expr, GET $path:expr => $handler:expr) => {
        $router.add_route("GET", $path, stringify!($handler));
    };
    ($router:expr, POST $path:expr => $handler:expr) => {
        $router.add_route("POST", $path, stringify!($handler));
    };
    ($router:expr, PUT $path:expr => $handler:expr) => {
        $router.add_route("PUT", $path, stringify!($handler));
    };
    ($router:expr, DELETE $path:expr => $handler:expr) => {
        $router.add_route("DELETE", $path, stringify!($handler));
    };
    ($router:expr, OPTIONS $path:expr => $handler:expr) => {
        $router.add_route("OPTIONS", $path, stringify!($handler));
    };
    // Variants with path parameters (ignored, just for compatibility)
    ($router:expr, GET $path:expr, path => $handler:expr) => {
        $router.add_route("GET", $path, stringify!($handler));
    };
    ($router:expr, POST $path:expr, path => $handler:expr) => {
        $router.add_route("POST", $path, stringify!($handler));
    };
    ($router:expr, PUT $path:expr, path => $handler:expr) => {
        $router.add_route("PUT", $path, stringify!($handler));
    };
    ($router:expr, DELETE $path:expr, path => $handler:expr) => {
        $router.add_route("DELETE", $path, stringify!($handler));
    };
}
