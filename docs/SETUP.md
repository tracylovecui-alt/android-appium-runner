# 环境和运行说明

## Windows 依赖

需要先安装：

1. `Node.js 20+`
2. `Java JDK 17+`
3. `Android Studio` 或 `Android SDK Platform Tools`
4. `Appium Server`
5. `Appium UiAutomator2 Driver`

推荐命令：

```bash
npm install -g appium
appium driver install uiautomator2
```

确认 Android 设备连接：

```bash
adb devices
```

如果使用真机，需要在手机上打开：

1. 开发者选项
2. USB 调试
3. 第一次连接时允许这台电脑调试

## 项目启动

安装依赖：

```bash
npm install
```

启动 Appium：

```bash
appium
```

启动桌面程序：

```bash
npm run start:desktop
```

命令行运行默认流程：

```bash
npm run test:android
```

## appPackage 和 appActivity

如果不知道包名和启动页，可以先安装并打开 App，然后执行：

```bash
adb shell dumpsys window | findstr mCurrentFocus
```

也可以用：

```bash
adb shell dumpsys activity activities | findstr mResumedActivity
```
