import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  ChevronDown,
  ChevronRight,
  Download,
  FileArchive,
  FileSearch,
  Folder,
  LayoutGrid,
  ListFilter,
  Loader2,
  Moon,
  Search,
  Sun,
  Table2,
  Terminal,
  TreePine
} from "lucide-react";
import type { ExportFormat, ScanResult, SoftwarePackage, StatItem, TreeNode } from "../shared/types";

type Theme = "light" | "dark" | "blue" | "green";
type ViewMode = "cards" | "table";
type SortKey = "name" | "version" | "platform" | "sizeBytes" | "modifiedAt";
type SortDirection = "asc" | "desc";

interface Filters {
  query: string;
  platform: string;
  fileType: string;
  minSizeMb: string;
  maxSizeMb: string;
  modifiedFrom: string;
  modifiedTo: string;
}

const EMPTY_FILTERS: Filters = {
  query: "",
  platform: "",
  fileType: "",
  minSizeMb: "",
  maxSizeMb: "",
  modifiedFrom: "",
  modifiedTo: ""
};

const PAGE_SIZE = 12;
const CHART_COLORS = ["#2563eb", "#16a34a", "#e11d48", "#f59e0b", "#7c3aed", "#0891b2"];

export function App() {
  const [rootPath, setRootPath] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("spe-theme") as Theme) || "light");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [sortKey, setSortKey] = useState<SortKey>("modifiedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const isRemoteDeployment =
    typeof window !== "undefined" &&
    !["localhost", "127.0.0.1", ""].includes(window.location.hostname);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("spe-theme", theme);
  }, [theme]);

  const platformOptions = useMemo(() => unique(scanResult?.items.map((item) => item.platform) ?? []), [scanResult]);
  const fileTypeOptions = useMemo(() => unique(scanResult?.items.map((item) => item.fileType) ?? []), [scanResult]);

  const filteredItems = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    const minBytes = filters.minSizeMb ? Number(filters.minSizeMb) * 1024 * 1024 : null;
    const maxBytes = filters.maxSizeMb ? Number(filters.maxSizeMb) * 1024 * 1024 : null;
    const fromTime = filters.modifiedFrom ? new Date(filters.modifiedFrom).getTime() : null;
    const toTime = filters.modifiedTo ? new Date(`${filters.modifiedTo}T23:59:59`).getTime() : null;

    return (scanResult?.items ?? [])
      .filter((item) => {
        const haystack = `${item.name} ${item.version} ${item.platform} ${item.fileType} ${item.path}`.toLowerCase();
        const modifiedTime = new Date(item.modifiedAt).getTime();
        return (
          (!query || haystack.includes(query)) &&
          (!filters.platform || item.platform === filters.platform) &&
          (!filters.fileType || item.fileType === filters.fileType) &&
          (minBytes === null || item.sizeBytes >= minBytes) &&
          (maxBytes === null || item.sizeBytes <= maxBytes) &&
          (fromTime === null || modifiedTime >= fromTime) &&
          (toTime === null || modifiedTime <= toTime)
        );
      })
      .sort((a, b) => compareItems(a, b, sortKey, sortDirection));
  }, [filters, scanResult, sortDirection, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const pageItems = filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const visibleStats = useMemo(() => buildLocalStats(filteredItems, "platform"), [filteredItems]);
  const visibleSizeStats = useMemo(() => buildLocalStats(filteredItems, "category").sort((a, b) => b.sizeBytes - a.sizeBytes), [filteredItems]);

  useEffect(() => {
    setPage(1);
  }, [filters, sortKey, sortDirection, viewMode]);

  async function scan() {
    setError("");
    setIsLoading(true);
    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rootPath })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "扫描失败");
      }
      setScanResult(payload);
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : "扫描失败");
    } finally {
      setIsLoading(false);
    }
  }

  async function exportData(format: ExportFormat) {
    const response = await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format, items: filteredItems })
    });
    if (!response.ok) {
      setError("导出失败");
      return;
    }

    const blob = await response.blob();
    const disposition = response.headers.get("Content-Disposition") ?? "";
    const fileName = disposition.match(/filename="(.+)"/)?.[1] ?? `software-packages.${format}`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <FileArchive aria-hidden="true" />
          <div>
            <h1>Software Package Explorer</h1>
            <p>软件安装包统计系统</p>
          </div>
        </div>
        <div className="theme-group" aria-label="主题">
          {(["light", "dark", "blue", "green"] as Theme[]).map((item) => (
            <button
              key={item}
              className={theme === item ? "icon-button active" : "icon-button"}
              onClick={() => setTheme(item)}
              title={`切换到 ${item} 主题`}
              type="button"
            >
              {themeIcon(item)}
            </button>
          ))}
        </div>
      </header>

      <section className="command-row">
        <label className="path-field">
          <span>根目录</span>
          <input
            value={rootPath}
            onChange={(event) => setRootPath(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && rootPath.trim()) {
                void scan();
              }
            }}
            placeholder="/Users/name/software"
            data-testid="root-path-input"
          />
        </label>
        <button className="primary-button" disabled={!rootPath.trim() || isLoading} onClick={() => void scan()} type="button">
          {isLoading ? <Loader2 className="spin" aria-hidden="true" /> : <FileSearch aria-hidden="true" />}
          扫描
        </button>
        <div className="export-group">
          {(["csv", "json", "markdown"] as ExportFormat[]).map((format) => (
            <button key={format} className="ghost-button" disabled={!filteredItems.length} onClick={() => void exportData(format)} type="button">
              <Download aria-hidden="true" />
              {format.toUpperCase()}
            </button>
          ))}
        </div>
      </section>

      {error && <div className="notice error">{error}</div>}
      {isRemoteDeployment ? (
        <div className="notice">
          当前页面运行在远程部署环境，无法扫描浏览器所在电脑的本机目录；完整目录扫描请在本地运行 `npm run dev` 或 `npm run start`。
        </div>
      ) : null}
      {scanResult?.warnings.length ? <div className="notice">跳过 {scanResult.warnings.length} 个不可读路径，其他内容已正常统计。</div> : null}

      <section className="filters">
        <label className="search-field">
          <Search aria-hidden="true" />
          <input
            value={filters.query}
            onChange={(event) => setFilters({ ...filters, query: event.target.value })}
            placeholder="搜索软件、版本、路径"
          />
        </label>
        <Select value={filters.platform} onChange={(platform) => setFilters({ ...filters, platform })} options={platformOptions} placeholder="全部平台" />
        <Select value={filters.fileType} onChange={(fileType) => setFilters({ ...filters, fileType })} options={fileTypeOptions} placeholder="全部类型" />
        <input className="compact-input" value={filters.minSizeMb} onChange={(event) => setFilters({ ...filters, minSizeMb: event.target.value })} placeholder="最小 MB" inputMode="decimal" />
        <input className="compact-input" value={filters.maxSizeMb} onChange={(event) => setFilters({ ...filters, maxSizeMb: event.target.value })} placeholder="最大 MB" inputMode="decimal" />
        <input className="date-input" type="date" value={filters.modifiedFrom} onChange={(event) => setFilters({ ...filters, modifiedFrom: event.target.value })} title="更新时间起始" />
        <input className="date-input" type="date" value={filters.modifiedTo} onChange={(event) => setFilters({ ...filters, modifiedTo: event.target.value })} title="更新时间结束" />
        <button className="icon-text-button" onClick={() => setFilters(EMPTY_FILTERS)} type="button">
          <ListFilter aria-hidden="true" />
          重置
        </button>
      </section>

      <section className="overview" aria-label="统计总览">
        <Metric label="软件总数" value={scanResult?.summary.softwareCount ?? 0} />
        <Metric label="目录总数" value={scanResult?.summary.directoryCount ?? 0} />
        <Metric label="总占用空间" value={scanResult?.summary.totalSizeText ?? "0 B"} />
        <Metric label="平台数量" value={scanResult?.summary.platformCount ?? 0} />
      </section>

      <section className="workspace">
        <aside className="tree-pane">
          <div className="section-title">
            <TreePine aria-hidden="true" />
            分类树
          </div>
          {scanResult ? <TreeView node={scanResult.tree} query={filters.query} /> : <EmptyState text="输入目录后开始扫描" />}
        </aside>

        <div className="main-pane">
          <section className="analytics">
            <ChartBlock title="平台分布">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={visibleStats}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {visibleStats.map((entry, index) => (
                      <Cell key={entry.label} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartBlock>
            <ChartBlock title="空间占用">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={visibleSizeStats.slice(0, 6)} dataKey="sizeBytes" nameKey="label" innerRadius={48} outerRadius={86} paddingAngle={2}>
                    {visibleSizeStats.slice(0, 6).map((entry, index) => (
                      <Cell key={entry.label} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatBytes(value)} />
                </PieChart>
              </ResponsiveContainer>
            </ChartBlock>
          </section>

          <section className="results-header">
            <div>
              <h2>{filteredItems.length} 个安装包</h2>
              <p>{scanResult ? `扫描于 ${formatDateTime(scanResult.scannedAt)}` : "等待扫描"}</p>
            </div>
            <div className="view-switch">
              <button className={viewMode === "cards" ? "icon-button active" : "icon-button"} onClick={() => setViewMode("cards")} title="卡片视图" type="button">
                <LayoutGrid aria-hidden="true" />
              </button>
              <button className={viewMode === "table" ? "icon-button active" : "icon-button"} onClick={() => setViewMode("table")} title="表格视图" type="button">
                <Table2 aria-hidden="true" />
              </button>
            </div>
          </section>

          {viewMode === "cards" ? (
            <PackageCards items={pageItems} />
          ) : (
            <PackageTable items={pageItems} sortKey={sortKey} sortDirection={sortDirection} onSort={(nextKey) => {
              setSortDirection(sortKey === nextKey && sortDirection === "asc" ? "desc" : "asc");
              setSortKey(nextKey);
            }} />
          )}

          <Pagination page={page} totalPages={totalPages} setPage={setPage} />
        </div>
      </section>
    </main>
  );
}

function Select({ value, onChange, options, placeholder }: { value: string; onChange: (value: string) => void; options: string[]; placeholder: string }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function ChartBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="chart-block">
      <h3>{title}</h3>
      {children}
    </article>
  );
}

function PackageCards({ items }: { items: SoftwarePackage[] }) {
  if (!items.length) {
    return <EmptyState text="暂无匹配安装包" />;
  }

  return (
    <div className="card-grid">
      {items.map((item) => (
        <article className="package-card" key={item.id}>
          <div className="card-topline">
            <span className="file-pill">{item.fileType}</span>
            <span>{item.platform}</span>
          </div>
          <h3>{item.name}</h3>
          <dl>
            <div>
              <dt>Version</dt>
              <dd>{item.version}</dd>
            </div>
            <div>
              <dt>Size</dt>
              <dd>{item.sizeText}</dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>{formatDate(item.modifiedAt)}</dd>
            </div>
          </dl>
          <p title={item.path}>{item.relativePath}</p>
        </article>
      ))}
    </div>
  );
}

function PackageTable({
  items,
  sortKey,
  sortDirection,
  onSort
}: {
  items: SoftwarePackage[];
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
}) {
  if (!items.length) {
    return <EmptyState text="暂无匹配安装包" />;
  }

  const columns: Array<[SortKey, string]> = [
    ["name", "软件名称"],
    ["version", "版本"],
    ["platform", "平台"],
    ["sizeBytes", "大小"],
    ["modifiedAt", "更新时间"]
  ];

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map(([key, label]) => (
              <th key={key}>
                <button onClick={() => onSort(key)} type="button">
                  {label}
                  {sortKey === key ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                </button>
              </th>
            ))}
            <th>路径</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td>{item.version}</td>
              <td>{item.platform}</td>
              <td>{item.sizeText}</td>
              <td>{formatDate(item.modifiedAt)}</td>
              <td className="path-cell" title={item.path}>{item.relativePath}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TreeView({ node, query }: { node: TreeNode; query: string }) {
  const filtered = filterTree(node, query.trim().toLowerCase());
  if (!filtered) {
    return <EmptyState text="分类树中没有匹配节点" />;
  }
  return <TreeItem node={filtered} level={0} defaultOpen />;
}

function TreeItem({ node, level, defaultOpen = false }: { node: TreeNode; level: number; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen || level < 1);
  const hasChildren = node.children.length > 0;

  return (
    <div className="tree-item">
      <button className="tree-row" style={{ paddingLeft: 8 + level * 16 }} onClick={() => setOpen(!open)} type="button">
        {hasChildren ? open ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" /> : <span className="tree-spacer" />}
        {node.type === "directory" ? <Folder aria-hidden="true" /> : <FileArchive aria-hidden="true" />}
        <span className="tree-name">{node.name}</span>
        <span className="tree-stat">{node.count} / {node.sizeText}</span>
      </button>
      {open && hasChildren ? node.children.map((child) => <TreeItem key={child.id} node={child} level={level + 1} />) : null}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="empty-state">
      <FileSearch aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}

function Pagination({ page, totalPages, setPage }: { page: number; totalPages: number; setPage: (page: number) => void }) {
  return (
    <nav className="pagination" aria-label="分页">
      <button disabled={page <= 1} onClick={() => setPage(page - 1)} type="button">上一页</button>
      <span>{page} / {totalPages}</span>
      <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} type="button">下一页</button>
    </nav>
  );
}

function themeIcon(theme: Theme) {
  if (theme === "dark") return <Moon aria-hidden="true" />;
  if (theme === "blue") return <Sun aria-hidden="true" />;
  if (theme === "green") return <Terminal aria-hidden="true" />;
  return <Sun aria-hidden="true" />;
}

function compareItems(a: SoftwarePackage, b: SoftwarePackage, key: SortKey, direction: SortDirection): number {
  const multiplier = direction === "asc" ? 1 : -1;
  const left = a[key];
  const right = b[key];
  if (typeof left === "number" && typeof right === "number") {
    return (left - right) * multiplier;
  }
  return String(left).localeCompare(String(right)) * multiplier;
}

function buildLocalStats(items: SoftwarePackage[], key: "platform" | "category"): StatItem[] {
  const grouped = new Map<string, { count: number; sizeBytes: number }>();
  items.forEach((item) => {
    const current = grouped.get(item[key]) ?? { count: 0, sizeBytes: 0 };
    current.count += 1;
    current.sizeBytes += item.sizeBytes;
    grouped.set(item[key], current);
  });

  return [...grouped.entries()].map(([label, value]) => ({
    label,
    count: value.count,
    sizeBytes: value.sizeBytes,
    sizeText: formatBytes(value.sizeBytes)
  }));
}

function filterTree(node: TreeNode, query: string): TreeNode | null {
  if (!query) return node;
  const matches = `${node.name} ${node.relativePath}`.toLowerCase().includes(query);
  const children = node.children.map((child) => filterTree(child, query)).filter((child): child is TreeNode => Boolean(child));
  if (!matches && children.length === 0) {
    return null;
  }
  return { ...node, children };
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  const precision = value >= 100 || index === 0 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(precision)} ${units[index]}`;
}
