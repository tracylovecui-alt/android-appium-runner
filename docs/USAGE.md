# 怎么使用桌面程序

## 1. 先准备手机和电脑

1. Windows 电脑安装 `adb`、`Java`、`Appium`
2. Android 手机打开开发者选项和 USB 调试
3. 手机连接电脑，执行 `adb devices` 能看到设备
4. 单独打开一个终端，执行 `appium`

## 2. 打开程序

双击：

```text
Android Appium Runner 0.2.0.exe
```

打开后先点：

```text
检查环境
```

如果 `ADB`、`Android 设备`、`Appium`、`Java` 都是正常，再继续配置。

## 3. 填基础配置

需要填写：

- `APK 路径`：选择你的 APK 文件
- `App Package`：Android 包名，例如 `com.example.app`
- `App Activity`：启动页，例如 `.MainActivity`
- `Appium Host`：默认 `127.0.0.1`
- `Appium Port`：默认 `4723`
- `Appium Path`：默认 `/`

如果不知道 `App Package` 和 `App Activity`：

1. 先手动打开目标 App
2. 在程序里点 `获取当前 Activity`
3. 从日志里复制对应包名和 Activity

## 4. 填动作脚本

动作脚本是 JSON 数组。最常见流程是：

```json
[
  { "type": "dismissPopups" },
  {
    "type": "click",
    "selector": "id=com.example.app:id/start"
  },
  { "type": "wait", "ms": 2000 },
  { "type": "screenshot", "name": "result" }
]
```

写好后可以点：

```text
保存本地配置
```

后续也可以用：

- `导入配置`
- `导出配置`
- `恢复默认`

## 5. 开始执行

点：

```text
开始执行
```

执行过程会在右侧 `运行日志` 里显示。截图会保存在程序的截图目录，可以点：

```text
打开截图目录
```

## 6. 注意

这个工具只适合授权测试、演示和重复流程验证。不要用于伪造定位、绕过考勤规则或规避 App 风控。
