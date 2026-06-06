# Software Package Explorer

本地软件安装包统计系统。输入一个本机目录后，应用会递归扫描常见安装包文件，解析软件名、版本、平台、大小、更新时间和路径，并提供统计图表、分类树、卡片/表格视图、搜索过滤和导出。

## Quick Start

```bash
npm install
npm run dev
```

开发模式会启动两个服务：

- Frontend: `http://127.0.0.1:5173/`
- Backend API: `http://127.0.0.1:3001/`

生产构建和启动：

```bash
npm run build
npm run start
```

生产服务默认运行在 `http://127.0.0.1:3001/`。

## Scripts

- `npm run dev`：同时启动本地 API 和 Vite 前端。
- `npm run build`：执行前端类型检查、服务端编译和前端生产构建。
- `npm run start`：运行构建后的本地服务。
- `npm test`：运行解析、扫描、导出和 API 集成测试。

## Usage

1. 打开应用首页。
2. 在“根目录”中输入要扫描的软件目录，例如 `/Users/name/software`。
3. 点击“扫描”。
4. 使用搜索框、平台、文件类型、大小范围、更新时间范围过滤结果。
5. 在卡片视图和表格视图之间切换。
6. 使用 `CSV`、`JSON`、`MARKDOWN` 按钮导出当前过滤结果。

## API

### `POST /api/scan`

Request:

```json
{
  "rootPath": "/Users/name/software"
}
```

Response: `ScanResult`，包含扫描条目、目录树、总览指标、平台统计、分类统计、空间占用统计和不可读路径 warning。

### `POST /api/export`

Request:

```json
{
  "format": "csv",
  "items": []
}
```

`format` 支持 `csv`、`json`、`markdown`。响应会返回可下载文件内容。

## Supported File Types

默认识别：

`.exe`, `.msi`, `.apk`, `.dmg`, `.pkg`, `.zip`, `.rar`, `.7z`, `.iso`, `.deb`, `.rpm`, `.tar`, `.gz`

## Parsing Rules

- 平台优先从目录名推断，如 `windows`、`win`、`macos`、`mac`、`android`、`apk`、`linux`。
- 文件类型来自扩展名。
- 版本从文件名中的 `1.2.3`、`v1.2`、`2021`、`136.0` 等模式提取。
- 软件名会清理常见架构和发布标记，如 `x64`、`x86`、`arm64`、`release`、`final`、`setup`、`installer`。

## MVP Limitations

- 目前不解析 PE、MSI、APK 等安装包内部元数据。
- 扫描结果保存在浏览器内存中，刷新页面后需要重新扫描。
- 当前是本地单用户工具，不包含账号、数据库、多用户协作或远程部署能力。
- 大目录扫描会按递归文件系统遍历执行，首版未加入后台任务队列或增量扫描。
