import type { Config } from "@netlify/functions";
import type { ExportFormat, SoftwarePackage } from "../../src/shared/types";
import { exportPackages } from "../../src/server/exporter";

export default async (request: Request) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  let body: { format?: ExportFormat; items?: SoftwarePackage[] };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const format = body.format;
  const items = body.items;
  if (!format || !["csv", "json", "markdown"].includes(format) || !Array.isArray(items)) {
    return json({ error: "format and items are required." }, 400);
  }

  const exported = exportPackages(format, items);
  return new Response(exported.content, {
    status: 200,
    headers: {
      "Content-Type": exported.contentType,
      "Content-Disposition": `attachment; filename="${exported.fileName}"`
    }
  });
};

export const config: Config = {
  path: "/api/export"
};

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

