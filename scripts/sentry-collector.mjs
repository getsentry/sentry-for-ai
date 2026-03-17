#!/usr/bin/env node

// Sentry AI monitoring collector for Claude Code
//
// Two modes:
//   --batch <file.jsonl>  Process a JSONL file of hook events (batch mode)
//   --serve               Start HTTP server for real-time event collection

import * as Sentry from "@sentry/node";
import { readFileSync, unlinkSync, existsSync } from "node:fs";
import { createServer } from "node:http";

// ── Sentry init ──────────────────────────────────────────────

if (!process.env.SENTRY_DSN) {
  process.exit(0);
}

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});

// ── Batch mode ───────────────────────────────────────────────

async function processBatch(filePath) {
  if (!existsSync(filePath)) {
    process.exit(0);
  }

  const lines = readFileSync(filePath, "utf-8").trim().split("\n");
  const events = lines
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  if (events.length === 0) {
    try {
      unlinkSync(filePath);
    } catch {}
    return;
  }

  // Extract model from SessionStart event (or first event with model info)
  const sessionStart = events.find(
    (e) => e.hook_event_name === "SessionStart"
  );
  const model = sessionStart?.model || events[0]?.model || "claude";

  // Extract token data from the session transcript
  const transcriptPath = sessionStart?.transcript_path || events[0]?.transcript_path;
  const tokenData = transcriptPath ? extractTokensFromTranscript(transcriptPath) : null;

  // Pair PreToolUse with PostToolUse events
  const toolCalls = pairToolEvents(events);

  // Determine session timing
  const firstTs = events[0]._ts || Date.now() / 1000;
  const lastTs = events[events.length - 1]._ts || Date.now() / 1000;

  console.error(`[sentry-collector] events=${events.length} tools=${toolCalls.length} dur=${(lastTs - firstTs).toFixed(1)}s tokens=${tokenData?.inputTokens || 0}in/${tokenData?.outputTokens || 0}out`);

  // Create all spans as inactive with explicit timestamps (avoids startSpan
  // callback pattern which overrides end time for historical spans).
  const rootSpan = Sentry.startInactiveSpan({
    name: "invoke_agent claude-code",
    op: "gen_ai.invoke_agent",
    forceTransaction: true,
    startTime: firstTs,
    attributes: {
      "gen_ai.agent.name": "claude-code",
      "gen_ai.request.model": model,
      "gen_ai.system": "anthropic",
    },
  });

  // Set token data from session transcript
  if (tokenData) {
    if (tokenData.inputTokens) {
      rootSpan.setAttribute("gen_ai.usage.input_tokens", tokenData.inputTokens);
    }
    if (tokenData.outputTokens) {
      rootSpan.setAttribute("gen_ai.usage.output_tokens", tokenData.outputTokens);
    }
    if (tokenData.model) {
      rootSpan.setAttribute("gen_ai.response.model", tokenData.model);
    }
    if (tokenData.prompt) {
      rootSpan.setAttribute("gen_ai.request.messages", truncate(tokenData.prompt, 1000));
    }
    if (tokenData.lastResponse) {
      rootSpan.setAttribute("gen_ai.response.text", truncate(tokenData.lastResponse, 1000));
    }
  }

  Sentry.withActiveSpan(rootSpan, () => {
    for (const tool of toolCalls) {
      const attrs = {
        "gen_ai.tool.name": tool.tool_name,
      };
      if (tool.input) {
        attrs["gen_ai.tool.input"] = truncate(JSON.stringify(tool.input), 1000);
      }
      if (tool.output) {
        attrs["gen_ai.tool.output"] = truncate(JSON.stringify(tool.output), 1000);
      }

      const childSpan = Sentry.startInactiveSpan({
        name: `execute_tool ${tool.tool_name}`,
        op: "gen_ai.execute_tool",
        startTime: tool.startTime,
        attributes: attrs,
      });
      childSpan.end(tool.endTime * 1000);
    }
  });

  rootSpan.end(lastTs * 1000);

  await Sentry.flush(10_000);

  try {
    unlinkSync(filePath);
  } catch {}
}

// ── Real-time server mode ────────────────────────────────────

function startServer() {
  const PORT = parseInt(process.env.SENTRY_COLLECTOR_PORT || "9876", 10);
  const sessions = new Map();

  function handleEvent(event) {
    const { session_id, hook_event_name, tool_name, tool_input } = event;

    switch (hook_event_name) {
      case "SessionStart": {
        const rootSpan = Sentry.startInactiveSpan({
          name: "invoke_agent claude-code",
          op: "gen_ai.invoke_agent",
          forceTransaction: true,
          attributes: {
            "gen_ai.agent.name": "claude-code",
            "gen_ai.request.model": event.model || "claude",
            "gen_ai.system": "anthropic",
          },
        });
        sessions.set(session_id, {
          rootSpan,
          pendingTools: [],
          toolCount: 0,
        });
        break;
      }

      case "PreToolUse": {
        const session = sessions.get(session_id);
        if (!session) break;

        const toolInput = {};
        if (tool_input?.file_path) toolInput.file_path = tool_input.file_path;
        if (tool_input?.command) toolInput.command = truncate(tool_input.command, 200);
        if (tool_input?.pattern) toolInput.pattern = tool_input.pattern;

        const toolSpan = Sentry.withActiveSpan(session.rootSpan, () =>
          Sentry.startInactiveSpan({
            name: `execute_tool ${tool_name}`,
            op: "gen_ai.execute_tool",
            attributes: {
              "gen_ai.tool.name": tool_name,
              "gen_ai.tool.input": JSON.stringify(toolInput),
            },
          })
        );
        session.pendingTools.push(toolSpan);
        session.toolCount++;
        break;
      }

      case "PostToolUse": {
        const session = sessions.get(session_id);
        if (!session) break;
        const toolSpan = session.pendingTools.pop();
        if (toolSpan) toolSpan.end();
        break;
      }

      case "SessionEnd": {
        const session = sessions.get(session_id);
        if (!session) break;
        for (const span of session.pendingTools) {
          span.end();
        }
        session.rootSpan.setAttribute("gen_ai.tool.call_count", session.toolCount);
        session.rootSpan.end();
        sessions.delete(session_id);
        Sentry.flush(5_000);
        break;
      }
    }
  }

  const server = createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200);
      res.end("ok");
      return;
    }

    if (req.url !== "/hook" || req.method !== "POST") {
      res.writeHead(404);
      res.end("not found");
      return;
    }

    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        handleEvent(JSON.parse(body));
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end("{}");
      } catch (err) {
        res.writeHead(400);
        res.end(err.message);
      }
    });
  });

  server.listen(PORT, "127.0.0.1", () => {
    console.log(`Sentry collector listening on http://127.0.0.1:${PORT}`);
  });

  process.on("SIGTERM", async () => {
    server.close();
    for (const [, session] of sessions) {
      session.rootSpan.end();
    }
    await Sentry.flush(5_000);
    process.exit(0);
  });
}

// ── Transcript token extraction ──────────────────────────────

function extractTokensFromTranscript(transcriptPath) {
  if (!existsSync(transcriptPath)) return null;

  let inputTokens = 0;
  let outputTokens = 0;
  let model = null;
  let prompt = null;
  let lastResponse = null;

  const content = readFileSync(transcriptPath, "utf-8");
  for (const line of content.split("\n")) {
    if (!line) continue;
    let obj;
    try {
      obj = JSON.parse(line);
    } catch {
      continue;
    }

    // Capture first user message as prompt
    if (obj.type === "user" && !prompt) {
      const msg = obj.message?.content || obj.message;
      prompt = typeof msg === "string" ? msg : JSON.stringify(msg);
    }

    // Capture last assistant text as response
    if (obj.type === "assistant" && Array.isArray(obj.message?.content)) {
      const texts = obj.message.content
        .filter((c) => c.type === "text" && c.text)
        .map((c) => c.text);
      if (texts.length) lastResponse = texts.join("\n");
    }

    if (obj.type !== "assistant" || !obj.message?.usage) continue;

    const usage = obj.message.usage;
    inputTokens += (usage.input_tokens || 0) +
      (usage.cache_creation_input_tokens || 0) +
      (usage.cache_read_input_tokens || 0);
    outputTokens += usage.output_tokens || 0;

    if (obj.message.model) {
      model = obj.message.model;
    }
  }

  return { inputTokens, outputTokens, model, prompt, lastResponse };
}

// ── Helpers ──────────────────────────────────────────────────

function pairToolEvents(events) {
  // Use tool_use_id for precise pairing (handles parallel tool calls)
  const preByUseId = new Map();
  const completed = [];

  for (const event of events) {
    if (event.hook_event_name === "PreToolUse") {
      const id = event.tool_use_id || `fallback-${event._ts}-${event.tool_name}`;
      preByUseId.set(id, event);
    } else if (event.hook_event_name === "PostToolUse") {
      const id = event.tool_use_id || `fallback-${event._ts}-${event.tool_name}`;
      const pre = preByUseId.get(id);
      if (pre) {
        preByUseId.delete(id);
        completed.push({
          tool_name: event.tool_name,
          startTime: pre._ts,
          endTime: event._ts,
          input: pre.tool_input,
          output: event.tool_response,
        });
      } else {
        // PostToolUse without matching PreToolUse
        completed.push({
          tool_name: event.tool_name,
          startTime: event._ts - 1,
          endTime: event._ts,
          input: event.tool_input,
          output: event.tool_response,
        });
      }
    }
  }

  return completed;
}

function truncate(str, maxLen) {
  if (!str || str.length <= maxLen) return str;
  return str.slice(0, maxLen) + "\u2026";
}

// ── CLI entry point ──────────────────────────────────────────

const [, , command, arg] = process.argv;

if (command === "--batch") {
  processBatch(arg)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Batch processing error:", err.message);
      process.exit(1);
    });
} else if (command === "--serve") {
  startServer();
} else {
  console.error(
    "Usage: sentry-collector.mjs --batch <file.jsonl> | --serve"
  );
  process.exit(1);
}
