# 🎮 WebArcade

**High-speed development framework for web and desktop applications**

WebArcade is a modern, fast development framework that helps you launch web and desktop applications at light speed. Built with SolidJS and Rust, it provides a complete development environment with plugin architecture, real-time file operations, and seamless desktop integration.

## ⚡ Features

- **🚀 Launch Fast** - Get your projects off the ground in seconds
- **🔌 Plugin Architecture** - Modular, extensible development environment
- **🌉 Bridge Server** - High-performance Rust backend for file operations
- **📱 Web + Desktop** - Build for both web and desktop with Tauri
- **⚡ Real-time** - Live file watching and system monitoring
- **🎨 Modern UI** - Beautiful interface built with SolidJS and DaisyUI

## 🛠️ Tech Stack

- **Frontend**: SolidJS + DaisyUI + TailwindCSS
- **Backend**: Rust (Hyper + Tokio)
- **Desktop**: Tauri
- **Build**: Rspack
- **Package Manager**: Bun

## 🚀 Quick Start

### Prerequisites
- [Bun](https://bun.sh/) - JavaScript runtime and package manager
- [Rust](https://rustup.rs/) - For the bridge server
- [Tauri Prerequisites](https://tauri.app/v2/guides/getting-started/prerequisites/) - For desktop builds

### Launch Your Project

```bash
# Clone WebArcade
git clone https://github.com/webarcade-framework/webarcade
cd webarcade

# Install dependencies
bun install

# Launch web development server
bun run web

# Or launch desktop app
bun run app
```

## 📦 Available Scripts

- `bun run web` - Start web development server
- `bun run app` - Start desktop development with Tauri
- `bun run bridge` - Start the Rust bridge server only
- `bun run build:web` - Build for web production
- `bun run build:app` - Build desktop application
- `bun run serve` - Serve production build

## 🏗️ Project Structure

```
webarcade/
├── src/                    # Frontend source code
│   ├── plugins/           # Plugin system
│   │   └── core/         # Core plugins
│   │       ├── bridge/   # Bridge server integration
│   │       ├── menu/     # Menu system
│   │       └── ...       # Other core plugins
│   ├── ui/               # Reusable UI components
│   └── api/              # API utilities
├── bridge/               # Rust bridge server
│   └── src/             # Rust source code
├── src-tauri/           # Tauri desktop configuration
└── dist/                # Build output
```

## 🔌 Plugin System

WebArcade features a powerful plugin architecture:

- **Core Plugins**: Essential functionality (bridge, menu, file operations)
- **Custom Plugins**: Easy to create and integrate
- **Plugin API**: Rich API for extending functionality
- **Hot Reload**: Plugins update in real-time during development

## 🌉 Bridge Server

The Rust bridge server provides:

- **File Operations**: Fast, secure file system access
- **Real-time Monitoring**: System resources and file changes
- **Caching**: Intelligent caching for performance
- **Cross-platform**: Works on Windows, macOS, and Linux

## 🎯 Use Cases

- **Web Applications**: Modern SPA development
- **Desktop Apps**: Cross-platform desktop applications
- **Development Tools**: IDEs, editors, and development utilities
- **Prototyping**: Rapid application prototyping
- **Boilerplates**: Template for new projects

## 📖 Documentation

- [Getting Started Guide](docs/getting-started.md)
- [Plugin Development](docs/plugins.md)
- [Bridge Server API](docs/bridge-api.md)
- [Desktop Integration](docs/desktop.md)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

Built with amazing open-source technologies:
- [SolidJS](https://solidjs.com/) - Reactive UI library
- [Tauri](https://tauri.app/) - Desktop app framework  
- [Rust](https://rust-lang.org/) - Systems programming language
- [DaisyUI](https://daisyui.com/) - Component library
- [Rspack](https://rspack.dev/) - Fast bundler

---

**Ready for liftoff? 🚀 [Get started now](#-quick-start)**