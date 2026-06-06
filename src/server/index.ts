import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 3001);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDistPath = __dirname.includes(`${path.sep}dist${path.sep}`)
  ? path.resolve(__dirname, "../../client")
  : path.resolve(__dirname, "../client");
const app = createApp({ clientDistPath });

app.listen(port, "127.0.0.1", () => {
  console.log(`Software Package Explorer server running at http://127.0.0.1:${port}`);
});
