# 打包 EXE

## 本地打包

在 Windows 上执行：

```bash
npm install
npm run build:exe
```

打包结果会输出到：

```text
release/
```

也可以运行一键脚本：

```powershell
.\build-windows.ps1
```

或双击：

```text
build-windows.bat
```

## 构建 portable EXE 和安装包

只生成便携版：

```bash
npm run build:exe
```

同时生成便携版和安装包：

```bash
npm run build:windows
```

## GitHub Actions 自动打包

工作流文件：

```text
.github/workflows/build-windows-exe.yml
```

触发方式：

- 推送到 `main` 或 `master`
- 在 GitHub `Actions` 页面手动运行 `Build Windows EXE`

下载方式：

1. 打开仓库 `Actions`
2. 进入 `Build Windows EXE`
3. 打开某次运行记录
4. 在 `Artifacts` 下载 `windows-exe`
