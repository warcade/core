//! Simple template engine
//!
//! Pure Rust implementation for string templates with variable substitution.

use std::collections::HashMap;

/// Template engine for string interpolation
pub struct Template;

impl Template {
    /// Render template with variables using {{variable}} syntax
    ///
    /// # Examples
    /// ```rust
    /// let vars = HashMap::from([
    ///     ("name".to_string(), "World".to_string()),
    ///     ("count".to_string(), "42".to_string()),
    /// ]);
    /// let result = Template::render("Hello {{name}}! Count: {{count}}", &vars);
    /// assert_eq!(result, "Hello World! Count: 42");
    /// ```
    pub fn render(template: &str, vars: &HashMap<String, String>) -> String {
        let mut result = template.to_string();

        for (key, value) in vars {
            let pattern = format!("{{{{{}}}}}", key);
            result = result.replace(&pattern, value);
        }

        result
    }

    /// Render with trimmed whitespace around variables
    /// {{  name  }} becomes the same as {{name}}
    pub fn render_trim(template: &str, vars: &HashMap<String, String>) -> String {
        let mut result = template.to_string();

        // Find all {{...}} patterns
        let mut i = 0;
        while i < result.len() {
            if let Some(start) = result[i..].find("{{") {
                let abs_start = i + start;
                if let Some(end) = result[abs_start..].find("}}") {
                    let abs_end = abs_start + end + 2;
                    let var_name = result[abs_start + 2..abs_start + end].trim();

                    if let Some(value) = vars.get(var_name) {
                        result = format!(
                            "{}{}{}",
                            &result[..abs_start],
                            value,
                            &result[abs_end..]
                        );
                        i = abs_start + value.len();
                    } else {
                        i = abs_end;
                    }
                } else {
                    break;
                }
            } else {
                break;
            }
        }

        result
    }

    /// Render with default values for missing variables
    /// Syntax: {{variable|default}}
    pub fn render_with_defaults(template: &str, vars: &HashMap<String, String>) -> String {
        let mut result = template.to_string();

        let mut i = 0;
        while i < result.len() {
            if let Some(start) = result[i..].find("{{") {
                let abs_start = i + start;
                if let Some(end) = result[abs_start..].find("}}") {
                    let abs_end = abs_start + end + 2;
                    let content = result[abs_start + 2..abs_start + end].to_string();

                    let (var_name, default_val) = if let Some(pipe_pos) = content.find('|') {
                        let name = content[..pipe_pos].trim().to_string();
                        let default = content[pipe_pos + 1..].trim().to_string();
                        (name, Some(default))
                    } else {
                        (content.trim().to_string(), None)
                    };

                    let value = vars.get(&var_name)
                        .cloned()
                        .or(default_val)
                        .unwrap_or_default();

                    result = format!(
                        "{}{}{}",
                        &result[..abs_start],
                        value,
                        &result[abs_end..]
                    );
                    i = abs_start + value.len();
                } else {
                    break;
                }
            } else {
                break;
            }
        }

        result
    }

    /// Extract variable names from template
    pub fn extract_variables(template: &str) -> Vec<String> {
        let mut vars = Vec::new();
        let mut i = 0;

        while i < template.len() {
            if let Some(start) = template[i..].find("{{") {
                let abs_start = i + start;
                if let Some(end) = template[abs_start..].find("}}") {
                    let var_content = &template[abs_start + 2..abs_start + end];
                    let var_name = if let Some(pipe_pos) = var_content.find('|') {
                        var_content[..pipe_pos].trim()
                    } else {
                        var_content.trim()
                    };

                    if !vars.contains(&var_name.to_string()) {
                        vars.push(var_name.to_string());
                    }
                    i = abs_start + end + 2;
                } else {
                    break;
                }
            } else {
                break;
            }
        }

        vars
    }

    /// Check if template has all required variables
    pub fn has_all_variables(template: &str, vars: &HashMap<String, String>) -> bool {
        let required = Self::extract_variables(template);
        required.iter().all(|var| vars.contains_key(var))
    }

    /// Get missing variables
    pub fn missing_variables(template: &str, vars: &HashMap<String, String>) -> Vec<String> {
        let required = Self::extract_variables(template);
        required.into_iter()
            .filter(|var| !vars.contains_key(var))
            .collect()
    }

    /// Simple conditional: {{#if var}}content{{/if}}
    pub fn render_conditionals(template: &str, vars: &HashMap<String, String>) -> String {
        let mut result = template.to_string();

        // Process {{#if var}}...{{/if}} blocks
        loop {
            let if_start = result.find("{{#if ");
            if if_start.is_none() {
                break;
            }
            let if_start = if_start.unwrap();

            let if_end = result[if_start..].find("}}");
            if if_end.is_none() {
                break;
            }
            let if_end = if_start + if_end.unwrap();

            let endif = result[if_end..].find("{{/if}}");
            if endif.is_none() {
                break;
            }
            let endif = if_end + endif.unwrap();

            let var_name = result[if_start + 6..if_end].trim();
            let content = &result[if_end + 2..endif];

            let should_include = vars.get(var_name)
                .map(|v| !v.is_empty() && v != "false" && v != "0")
                .unwrap_or(false);

            let replacement = if should_include {
                content.to_string()
            } else {
                String::new()
            };

            result = format!(
                "{}{}{}",
                &result[..if_start],
                replacement,
                &result[endif + 7..]
            );
        }

        result
    }

    /// Full render with conditionals and defaults
    pub fn render_full(template: &str, vars: &HashMap<String, String>) -> String {
        let processed = Self::render_conditionals(template, vars);
        Self::render_with_defaults(&processed, vars)
    }
}

/// Template builder for chaining
pub struct TemplateBuilder {
    template: String,
    vars: HashMap<String, String>,
}

impl TemplateBuilder {
    pub fn new(template: &str) -> Self {
        Self {
            template: template.to_string(),
            vars: HashMap::new(),
        }
    }

    /// Set a variable
    pub fn var(mut self, key: &str, value: &str) -> Self {
        self.vars.insert(key.to_string(), value.to_string());
        self
    }

    /// Set multiple variables
    pub fn vars(mut self, vars: HashMap<String, String>) -> Self {
        self.vars.extend(vars);
        self
    }

    /// Render the template
    pub fn render(self) -> String {
        Template::render(&self.template, &self.vars)
    }

    /// Render with defaults
    pub fn render_with_defaults(self) -> String {
        Template::render_with_defaults(&self.template, &self.vars)
    }

    /// Full render (conditionals + defaults)
    pub fn render_full(self) -> String {
        Template::render_full(&self.template, &self.vars)
    }

    /// Check if all variables are provided
    pub fn is_complete(&self) -> bool {
        Template::has_all_variables(&self.template, &self.vars)
    }

    /// Get missing variables
    pub fn missing(&self) -> Vec<String> {
        Template::missing_variables(&self.template, &self.vars)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_render() {
        let vars = HashMap::from([
            ("name".to_string(), "World".to_string()),
        ]);
        let result = Template::render("Hello {{name}}!", &vars);
        assert_eq!(result, "Hello World!");
    }

    #[test]
    fn test_multiple_vars() {
        let vars = HashMap::from([
            ("first".to_string(), "John".to_string()),
            ("last".to_string(), "Doe".to_string()),
        ]);
        let result = Template::render("{{first}} {{last}}", &vars);
        assert_eq!(result, "John Doe");
    }

    #[test]
    fn test_defaults() {
        let vars = HashMap::from([
            ("name".to_string(), "Alice".to_string()),
        ]);
        let result = Template::render_with_defaults(
            "Hello {{name}}! You are {{age|unknown}} years old.",
            &vars
        );
        assert_eq!(result, "Hello Alice! You are unknown years old.");
    }

    #[test]
    fn test_extract_variables() {
        let vars = Template::extract_variables("{{a}} {{b}} {{a}} {{c|default}}");
        assert_eq!(vars, vec!["a", "b", "c"]);
    }

    #[test]
    fn test_conditionals() {
        let vars = HashMap::from([
            ("show".to_string(), "true".to_string()),
        ]);
        let result = Template::render_conditionals(
            "Start {{#if show}}VISIBLE{{/if}} End",
            &vars
        );
        assert_eq!(result, "Start VISIBLE End");

        let empty_vars = HashMap::new();
        let result2 = Template::render_conditionals(
            "Start {{#if show}}VISIBLE{{/if}} End",
            &empty_vars
        );
        assert_eq!(result2, "Start  End");
    }

    #[test]
    fn test_builder() {
        let result = TemplateBuilder::new("Hello {{name}}!")
            .var("name", "Builder")
            .render();
        assert_eq!(result, "Hello Builder!");
    }
}
