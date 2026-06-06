import express, { type Express } from "express";
import cors from "cors";
import path from "node:path";
import type { ExportFormat, SoftwarePackage } from "../shared/types.js";
import { exportPackages } from "./exporter.js";
import { scanDirectory } from "./scanner.js";

export interface CreateAppOptions {
  clientDistPath?: string;
}

export function createApp(options: CreateAppOptions = {}): Express {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "20mb" }));

  app.post("/api/scan", async (request, response) => {
    const rootPath = String(request.body?.rootPath ?? "").trim();
    if (!rootPath) {
      response.status(400).json({ error: "rootPath is required." });
      return;
    }

    try {
      response.json(await scanDirectory(rootPath));
    } catch (error) {
      response.status(400).json({
        error: error instanceof Error ? error.message : "Failed to scan directory."
      });
    }
  });

  app.post("/api/export", (request, response) => {
    const format = request.body?.format as ExportFormat;
    const items = request.body?.items as SoftwarePackage[];

    if (!["csv", "json", "markdown"].includes(format) || !Array.isArray(items)) {
      response.status(400).json({ error: "format and items are required." });
      return;
    }

    const exported = exportPackages(format, items);
    response.setHeader("Content-Type", exported.contentType);
    response.setHeader("Content-Disposition", `attachment; filename="${exported.fileName}"`);
    response.send(exported.content);
  });

  if (options.clientDistPath) {
    app.use(express.static(options.clientDistPath));
    app.get("*", (_request, response) => {
      response.sendFile(path.join(options.clientDistPath!, "index.html"));
    });
  }

  return app;
}
