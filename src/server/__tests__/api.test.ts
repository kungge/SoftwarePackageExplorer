import fs from "node:fs/promises";
import http, { type Server } from "node:http";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../app.js";
import type { SoftwarePackage } from "../../shared/types.js";

let server: Server;
let baseUrl = "";
let tempRoot = "";

describe("api", () => {
  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "spe-api-"));
    await fs.mkdir(path.join(tempRoot, "windows", "Chrome"), { recursive: true });
    await fs.mkdir(path.join(tempRoot, "Android", "APK"), { recursive: true });
    await fs.writeFile(path.join(tempRoot, "windows", "Chrome", "ChromeSetup_136.0.exe"), "chrome");
    await fs.writeFile(path.join(tempRoot, "Android", "APK", "QQ_v9.0.apk"), "qq");

    server = http.createServer(createApp());
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    assert.equal(typeof address, "object");
    assert.notEqual(address, null);
    baseUrl = `http://127.0.0.1:${address!.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it("scans a directory through POST /api/scan", async () => {
    const response = await postJson("/api/scan", { rootPath: tempRoot });
    assert.equal(response.status, 200);

    const payload = await response.json();
    assert.equal(payload.summary.softwareCount, 2);
    assert.equal(payload.summary.platformCount, 2);
    assert.deepEqual(payload.tree.children.map((child: { name: string }) => child.name).sort(), ["Android", "Windows"]);
    assert.deepEqual(payload.items.map((item: SoftwarePackage) => item.name).sort(), ["Chrome", "QQ"]);
  });

  it("returns 400 for invalid scan requests", async () => {
    const response = await postJson("/api/scan", { rootPath: "" });
    assert.equal(response.status, 400);

    const payload = await response.json();
    assert.equal(payload.error, "rootPath is required.");
  });

  it("exports CSV through POST /api/export", async () => {
    const item: SoftwarePackage = {
      id: "1",
      name: "Chrome, Enterprise",
      version: "136.0",
      fileType: "exe",
      sizeBytes: 6,
      sizeText: "6 B",
      modifiedAt: "2026-01-02T03:04:05.000Z",
      path: "/software/windows/ChromeSetup_136.0.exe",
      relativePath: "windows/ChromeSetup_136.0.exe",
      category: "Chrome",
      platform: "Windows"
    };

    const response = await postJson("/api/export", { format: "csv", items: [item] });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type")?.startsWith("text/csv"), true);
    assert.equal(response.headers.get("content-disposition")?.includes("software-packages-"), true);

    const content = await response.text();
    assert.equal(content.includes("软件名称,版本,平台,文件类型,大小,更新时间,路径"), true);
    assert.equal(content.includes("\"Chrome, Enterprise\""), true);
  });

  it("returns 400 for invalid export requests", async () => {
    const response = await postJson("/api/export", { format: "xlsx", items: [] });
    assert.equal(response.status, 400);

    const payload = await response.json();
    assert.equal(payload.error, "format and items are required.");
  });
});

function postJson(pathname: string, body: unknown): Promise<Response> {
  return fetch(`${baseUrl}${pathname}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}
