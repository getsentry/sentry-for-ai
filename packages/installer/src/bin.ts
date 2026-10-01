// Entrypoint for the standalone (Node SEA) binary; the npm package starts at
// index.ts directly. See sea.ts for why the binary needs this indirection.
import { runForkedNodePtyScript } from "./sea";

if (!runForkedNodePtyScript()) {
  // index.ts runs the CLI on load; require keeps that conditional and bundles
  // it into the same file.
  require("./index");
}
