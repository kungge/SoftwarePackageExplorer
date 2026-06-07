import type { Config } from "@netlify/functions";
import { scanDirectory } from "../../src/server/scanner";

export default async (request: Request) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  let body: { rootPath?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const rootPath = String(body.rootPath ?? "").trim();
  if (!rootPath) {
    return json({ error: "rootPath is required." }, 400);
  }

  try {
    return json(await scanDirectory(rootPath));
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : "Failed to scan directory."
      },
      400
    );
  }
};

export const config: Config = {
  path: "/api/scan"
};

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

