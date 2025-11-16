//! Process execution utilities
//!
//! Provides FFI-safe process spawning and management.

use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use std::process::{Command as StdCommand, Stdio, Output as StdOutput};

/// Command output result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandOutput {
    pub success: bool,
    pub exit_code: Option<i32>,
    pub stdout: String,
    pub stderr: String,
}

impl CommandOutput {
    /// Check if command succeeded
    pub fn is_success(&self) -> bool {
        self.success
    }

    /// Get stdout lines
    pub fn stdout_lines(&self) -> Vec<String> {
        self.stdout.lines().map(|s| s.to_string()).collect()
    }

    /// Get stderr lines
    pub fn stderr_lines(&self) -> Vec<String> {
        self.stderr.lines().map(|s| s.to_string()).collect()
    }

    /// Get combined output
    pub fn combined(&self) -> String {
        format!("{}{}", self.stdout, self.stderr)
    }
}

/// Command builder
#[derive(Debug, Clone)]
pub struct Command {
    program: String,
    args: Vec<String>,
    env: HashMap<String, String>,
    cwd: Option<String>,
    stdin_data: Option<Vec<u8>>,
}

impl Command {
    /// Create a new command
    pub fn new(program: &str) -> Self {
        Self {
            program: program.to_string(),
            args: Vec::new(),
            env: HashMap::new(),
            cwd: None,
            stdin_data: None,
        }
    }

    /// Add an argument
    pub fn arg(mut self, arg: &str) -> Self {
        self.args.push(arg.to_string());
        self
    }

    /// Add multiple arguments
    pub fn args(mut self, args: &[&str]) -> Self {
        for arg in args {
            self.args.push(arg.to_string());
        }
        self
    }

    /// Set environment variable
    pub fn env(mut self, key: &str, value: &str) -> Self {
        self.env.insert(key.to_string(), value.to_string());
        self
    }

    /// Set multiple environment variables
    pub fn envs(mut self, vars: &HashMap<String, String>) -> Self {
        for (key, value) in vars {
            self.env.insert(key.clone(), value.clone());
        }
        self
    }

    /// Set current working directory
    pub fn current_dir(mut self, dir: &str) -> Self {
        self.cwd = Some(dir.to_string());
        self
    }

    /// Set stdin data
    pub fn stdin(mut self, data: &[u8]) -> Self {
        self.stdin_data = Some(data.to_vec());
        self
    }

    /// Set stdin as string
    pub fn stdin_string(mut self, data: &str) -> Self {
        self.stdin_data = Some(data.as_bytes().to_vec());
        self
    }

    /// Execute the command and wait for completion
    pub fn run(&self) -> Result<CommandOutput, String> {
        let mut cmd = StdCommand::new(&self.program);

        cmd.args(&self.args);

        for (key, value) in &self.env {
            cmd.env(key, value);
        }

        if let Some(cwd) = &self.cwd {
            cmd.current_dir(cwd);
        }

        if self.stdin_data.is_some() {
            cmd.stdin(Stdio::piped());
        }

        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());

        let output = if let Some(stdin_data) = &self.stdin_data {
            let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn process: {}", e))?;

            // Write stdin
            if let Some(mut stdin) = child.stdin.take() {
                use std::io::Write;
                stdin.write_all(stdin_data).map_err(|e| format!("Failed to write stdin: {}", e))?;
            }

            child.wait_with_output().map_err(|e| format!("Failed to wait for process: {}", e))?
        } else {
            cmd.output().map_err(|e| format!("Failed to execute command: {}", e))?
        };

        Ok(CommandOutput {
            success: output.status.success(),
            exit_code: output.status.code(),
            stdout: String::from_utf8_lossy(&output.stdout).to_string(),
            stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        })
    }

    /// Execute and return just stdout (fails if command fails)
    pub fn output(&self) -> Result<String, String> {
        let result = self.run()?;
        if result.success {
            Ok(result.stdout)
        } else {
            Err(format!("Command failed: {}", result.stderr))
        }
    }

    /// Execute and return just the exit code
    pub fn status(&self) -> Result<i32, String> {
        let result = self.run()?;
        result.exit_code.ok_or_else(|| "No exit code".to_string())
    }

    /// Build command string for display
    pub fn to_string(&self) -> String {
        let mut parts = vec![self.program.clone()];
        parts.extend(self.args.clone());
        parts.join(" ")
    }
}

/// Shell command execution
pub struct Shell;

impl Shell {
    /// Execute a shell command string
    pub fn run(command: &str) -> Result<CommandOutput, String> {
        let (shell, flag) = if cfg!(windows) {
            ("cmd", "/C")
        } else {
            ("sh", "-c")
        };

        Command::new(shell).arg(flag).arg(command).run()
    }

    /// Execute a shell command and return stdout
    pub fn output(command: &str) -> Result<String, String> {
        let result = Self::run(command)?;
        if result.success {
            Ok(result.stdout.trim().to_string())
        } else {
            Err(format!("Command failed: {}", result.stderr))
        }
    }

    /// Execute a shell command and return status code
    pub fn status(command: &str) -> Result<i32, String> {
        let result = Self::run(command)?;
        result.exit_code.ok_or_else(|| "No exit code".to_string())
    }

    /// Check if a command exists
    pub fn exists(command: &str) -> bool {
        let check = if cfg!(windows) {
            format!("where {}", command)
        } else {
            format!("which {}", command)
        };

        Self::status(&check).map(|c| c == 0).unwrap_or(false)
    }

    /// Get command path
    pub fn which(command: &str) -> Option<String> {
        let check = if cfg!(windows) {
            format!("where {}", command)
        } else {
            format!("which {}", command)
        };

        Self::output(&check)
            .ok()
            .map(|s| s.lines().next().unwrap_or("").to_string())
            .filter(|s| !s.is_empty())
    }
}

/// Common system commands
pub struct Exec;

impl Exec {
    /// List directory contents
    pub fn ls(path: &str) -> Result<Vec<String>, String> {
        if cfg!(windows) {
            Shell::output(&format!("dir /B \"{}\"", path))
        } else {
            Shell::output(&format!("ls -1 \"{}\"", path))
        }
        .map(|s| s.lines().map(|l| l.to_string()).collect())
    }

    /// Get current directory
    pub fn pwd() -> Result<String, String> {
        if cfg!(windows) {
            Shell::output("cd")
        } else {
            Shell::output("pwd")
        }
    }

    /// Create directory
    pub fn mkdir(path: &str) -> Result<(), String> {
        if cfg!(windows) {
            Shell::status(&format!("mkdir \"{}\"", path))
        } else {
            Shell::status(&format!("mkdir -p \"{}\"", path))
        }
        .map(|_| ())
    }

    /// Remove file
    pub fn rm(path: &str) -> Result<(), String> {
        if cfg!(windows) {
            Shell::status(&format!("del /F \"{}\"", path))
        } else {
            Shell::status(&format!("rm -f \"{}\"", path))
        }
        .map(|_| ())
    }

    /// Remove directory
    pub fn rmdir(path: &str) -> Result<(), String> {
        if cfg!(windows) {
            Shell::status(&format!("rmdir /S /Q \"{}\"", path))
        } else {
            Shell::status(&format!("rm -rf \"{}\"", path))
        }
        .map(|_| ())
    }

    /// Copy file
    pub fn cp(from: &str, to: &str) -> Result<(), String> {
        if cfg!(windows) {
            Shell::status(&format!("copy \"{}\" \"{}\"", from, to))
        } else {
            Shell::status(&format!("cp \"{}\" \"{}\"", from, to))
        }
        .map(|_| ())
    }

    /// Move file
    pub fn mv(from: &str, to: &str) -> Result<(), String> {
        if cfg!(windows) {
            Shell::status(&format!("move \"{}\" \"{}\"", from, to))
        } else {
            Shell::status(&format!("mv \"{}\" \"{}\"", from, to))
        }
        .map(|_| ())
    }

    /// Get environment variable
    pub fn env(name: &str) -> Option<String> {
        std::env::var(name).ok()
    }

    /// Echo/print text
    pub fn echo(text: &str) -> Result<String, String> {
        Shell::output(&format!("echo {}", text))
    }

    /// Sleep for seconds
    pub fn sleep(seconds: u64) {
        std::thread::sleep(std::time::Duration::from_secs(seconds));
    }

    /// Get hostname
    pub fn hostname() -> Result<String, String> {
        if cfg!(windows) {
            Shell::output("hostname")
        } else {
            Shell::output("hostname")
        }
    }

    /// Get current user
    pub fn whoami() -> Result<String, String> {
        if cfg!(windows) {
            Shell::output("whoami")
        } else {
            Shell::output("whoami")
        }
    }

    /// Open file or URL with default application
    pub fn open(path: &str) -> Result<(), String> {
        let cmd = if cfg!(windows) {
            format!("start \"\" \"{}\"", path)
        } else if cfg!(target_os = "macos") {
            format!("open \"{}\"", path)
        } else {
            format!("xdg-open \"{}\"", path)
        };

        Shell::status(&cmd).map(|_| ())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_command_builder() {
        let cmd = Command::new("echo")
            .arg("hello")
            .arg("world")
            .env("TEST", "value");

        assert_eq!(cmd.to_string(), "echo hello world");
    }

    #[test]
    fn test_echo() {
        let result = Command::new("echo").arg("test").run();
        assert!(result.is_ok());
        let output = result.unwrap();
        assert!(output.success);
        assert!(output.stdout.contains("test"));
    }

    #[test]
    fn test_shell_exists() {
        // These should exist on any system
        if cfg!(windows) {
            assert!(Shell::exists("cmd"));
        } else {
            assert!(Shell::exists("sh"));
        }
    }
}
