# 排查问题

## adb devices 看不到设备

检查：

- 手机是否打开 USB 调试
- 数据线是否支持传输数据
- 手机是否弹出授权确认
- Windows 是否安装了对应 USB 驱动

## Appium 启动失败

确认已安装 UiAutomator2 driver：

```bash
appium driver list --installed
appium driver install uiautomator2
```

## 找不到元素

优先检查：

- 选择器是否包含完整 `resource-id`
- 页面是否还在加载
- 是否有弹窗挡住页面
- 元素是否在 WebView 内

导出页面结构：

```bash
adb shell uiautomator dump /sdcard/view.xml
adb pull /sdcard/view.xml
```

## appPackage 或 appActivity 不对

打开 App 后执行：

```bash
adb shell dumpsys window | findstr mCurrentFocus
```

或者：

```bash
adb shell dumpsys activity activities | findstr mResumedActivity
```

## Windows 打包失败

先执行项目检查：

```bash
npm run check
```

再重新安装依赖：

```bash
npm install
npm run build:exe
```
