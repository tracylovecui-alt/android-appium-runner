# 动作脚本格式

桌面程序里的动作脚本是一个 JSON 数组。示例文件在：

```text
examples/login-flow.actions.json
```

## 示例

```json
[
  {
    "type": "dismissPopups"
  },
  {
    "type": "input",
    "selector": "id=com.example.app:id/username",
    "value": "demo_user",
    "clearFirst": true
  },
  {
    "type": "input",
    "selector": "id=com.example.app:id/password",
    "value": "demo_password",
    "clearFirst": true
  },
  {
    "type": "click",
    "selector": "id=com.example.app:id/login"
  },
  {
    "type": "wait",
    "ms": 5000
  },
  {
    "type": "screenshot",
    "name": "after-login"
  }
]
```

## 支持的动作

- `dismissPopups`：尝试处理常见权限弹窗和确认弹窗
- `input`：等待元素出现后输入文本
- `click`：等待元素出现后点击
- `wait`：等待指定毫秒数
- `screenshot`：保存当前页面截图
- `back`：执行 Android 返回

## 字段说明

- `type`：动作类型，必填
- `selector`：元素选择器，`input` 和 `click` 必填
- `timeoutMs`：等待元素出现的超时时间，默认 `20000`
- `value`：输入内容，仅 `input` 使用
- `clearFirst`：输入前清空元素内容，仅 `input` 使用
- `ms`：等待时间，仅 `wait` 使用
- `name`：截图文件名后缀，仅 `screenshot` 使用

## 选择器建议

优先顺序：

1. `resource-id`
2. `accessibility id`
3. `class + text`
4. `xpath`

导出当前页面 XML：

```bash
adb shell uiautomator dump /sdcard/view.xml
adb pull /sdcard/view.xml
```
