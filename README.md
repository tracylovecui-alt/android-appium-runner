# Android Appium Runner

一个用于 Windows 的 Android APK 自动化桌面工具。它用 `Electron` 提供界面，用 `Appium + UiAutomator2` 执行 Android App 自动化。

适合用于授权测试、演示、重复性流程验证和内部工具自动化。不要用于伪造定位、绕过考勤规则或规避 App 风控。

## 项目结构

```text
.
├── .github/workflows/       # GitHub Actions 自动构建 EXE
├── config/                  # 默认运行配置
├── desktop/                 # Electron 桌面界面
├── docs/                    # 使用、动作脚本、构建说明
├── examples/                # 可复制修改的配置示例
├── scripts/                 # 项目维护脚本
├── src/                     # Appium 自动化执行逻辑
├── build-windows.bat        # Windows 一键打包脚本
├── build-windows.ps1        # PowerShell 一键打包脚本
└── package.json
```

## 快速开始

先准备好 Windows 环境：

```bash
npm install -g appium
appium driver install uiautomator2
adb devices
```

安装项目依赖：

```bash
npm install
```

启动 Appium Server：

```bash
appium
```

启动桌面程序：

```bash
npm run start:desktop
```

## 常用命令

```bash
npm run check
npm run test:android
npm run start:desktop
npm run build:exe
npm run build:windows
```

## 文档

- [环境和运行说明](docs/SETUP.md)
- [怎么使用桌面程序](docs/USAGE.md)
- [动作脚本格式](docs/ACTIONS.md)
- [打包 EXE](docs/BUILD.md)
- [排查问题](docs/TROUBLESHOOTING.md)
- [使用边界](docs/RESPONSIBLE_USE.md)
