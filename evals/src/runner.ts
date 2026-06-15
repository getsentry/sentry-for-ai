/**
 * Runs a skill agent against a fixture project in an isolated temp directory.
 * The agent gets sandboxed file tools (read, write, list, search, delete) —
 * no shell or network access. Returns the resulting filesystem state.
 */

import {
  mkdtempSync,
  cpSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";

import Anthropic from "@anthropic-ai/sdk";

import type { EvalMeta, EvalOutput } from "./types.js";

const DEFAULT_MODEL = "claude-sonnet-4-6";
const MAX_TURNS = 30;
const TIMEOUT_MS = 180_000;

export interface RunOptions {
  apiKey: string;
  model?: string;
  maxTurns?: number;
  timeoutMs?: number;
  verbose?: boolean;
}

export interface ToolCallInfo {
  name: string;
  arguments: Record<string, string>;
  result: string;
}

function collectFiles(dir: string, base?: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    const relPath = base ? join(base, entry.name) : entry.name;
    if (entry.isDirectory()) {
      result.push(...collectFiles(fullPath, relPath));
    } else {
      result.push(relPath);
    }
  }
  return result;
}

function snapshotDir(dir: string): Record<string, string> {
  const snapshot: Record<string, string> = {};
  for (const relPath of collectFiles(dir)) {
    try {
      snapshot[relPath] = readFileSync(join(dir, relPath), "utf-8");
    } catch {
      // skip binary files
    }
  }
  return snapshot;
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: "read_file",
    description: "Read a file (relative to project root).",
    input_schema: {
      type: "object" as const,
      properties: { path: { type: "string" } },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Write a file (relative to project root). Creates parent dirs.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string" },
        content: { type: "string" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "list_directory",
    description: "List entries in a directory (relative to project root).",
    input_schema: {
      type: "object" as const,
      properties: { path: { type: "string" } },
      required: ["path"],
    },
  },
  {
    name: "search_files",
    description: "Grep for a pattern across project files. Case-insensitive.",
    input_schema: {
      type: "object" as const,
      properties: {
        pattern: { type: "string" },
        path: { type: "string", description: 'Directory to search. Default: "."' },
      },
      required: ["pattern"],
    },
  },
  {
    name: "delete_file",
    description: "Delete a file (relative to project root).",
    input_schema: {
      type: "object" as const,
      properties: { path: { type: "string" } },
      required: ["path"],
    },
  },
];

function executeTool(
  name: string,
  input: Record<string, string>,
  workDir: string,
): string {
  // Require exact dir prefix to prevent "/tmp/eval-a" matching "/tmp/eval-ab"
  const safePath = (p: string) => {
    const resolved = join(workDir, p);
    if (resolved !== workDir && !resolved.startsWith(workDir + "/")) {
      throw new Error(`Path traversal blocked: ${p}`);
    }
    return resolved;
  };

  switch (name) {
    case "read_file": {
      const fullPath = safePath(input["path"]!);
      if (!existsSync(fullPath)) return `Error: File not found: ${input["path"]}`;
      return readFileSync(fullPath, "utf-8");
    }
    case "write_file": {
      const fullPath = safePath(input["path"]!);
      mkdirSync(dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, input["content"]!);
      return `File written: ${input["path"]}`;
    }
    case "list_directory": {
      const fullPath = safePath(input["path"] || ".");
      if (!existsSync(fullPath)) return `Error: Directory not found: ${input["path"]}`;
      return readdirSync(fullPath, { withFileTypes: true })
        .map((e) => `${e.isDirectory() ? "[dir]" : "[file]"} ${e.name}`)
        .join("\n");
    }
    case "search_files": {
      const searchDir = safePath(input["path"] || ".");
      const pattern = input["pattern"]!.toLowerCase();
      const results: string[] = [];
      for (const relPath of collectFiles(searchDir)) {
        try {
          const lines = readFileSync(join(searchDir, relPath), "utf-8").split("\n");
          for (let i = 0; i < lines.length; i++) {
            if (lines[i]!.toLowerCase().includes(pattern)) {
              const display = input["path"] ? join(input["path"], relPath) : relPath;
              results.push(`${display}:${i + 1}: ${lines[i]}`);
            }
          }
        } catch {
          /* skip binary */
        }
      }
      return results.length > 0 ? results.slice(0, 50).join("\n") : "No matches found.";
    }
    case "delete_file": {
      const fullPath = safePath(input["path"]!);
      if (!existsSync(fullPath)) return `Error: File not found: ${input["path"]}`;
      rmSync(fullPath);
      return `File deleted: ${input["path"]}`;
    }
    default:
      return `Error: Unknown tool: ${name}`;
  }
}

function buildSystemPrompt(skillPath: string): string {
  const skillContent = readFileSync(join(skillPath, "SKILL.md"), "utf-8");

  // Inline all reference files so the agent doesn't need extra turns to read them
  const refsDir = join(skillPath, "references");
  let refsBlock = "";
  if (existsSync(refsDir)) {
    for (const entry of readdirSync(refsDir)) {
      if (entry.endsWith(".md")) {
        refsBlock += `\n\n## Reference: ${entry}\n\n${readFileSync(join(refsDir, entry), "utf-8")}`;
      }
    }
  }

  return `You are an AI coding assistant tasked with setting up Sentry SDK instrumentation in a project.

You MUST follow the skill instructions below exactly. Use the provided tools to explore the project, detect the framework and libraries, then make all necessary file changes.

IMPORTANT:
- Use the tools to read existing files before modifying them.
- Write complete file contents when modifying files (not patches).
- Do NOT ask the user questions -- proceed with your best judgment based on detection.
- When the skill says to run "bundle install" or similar, skip the actual command execution -- just ensure the Gemfile is correct.
- The reference files mentioned in the skill (e.g. \${SKILL_ROOT}/references/...) are provided inline below.
- After making all changes, output a brief summary of what you did.

## Skill Instructions

${skillContent}
${refsBlock}`;
}

/** Run a single install eval scenario through a real Claude agent. */
export async function runInstallEval(
  meta: EvalMeta,
  options: RunOptions,
): Promise<EvalOutput & { toolCalls: ToolCallInfo[] }> {
  const startTime = Date.now();
  const model = options.model ?? DEFAULT_MODEL;
  const maxTurns = options.maxTurns ?? MAX_TURNS;
  const client = new Anthropic({
    apiKey: options.apiKey,
    timeout: options.timeoutMs ?? TIMEOUT_MS,
  });

  const workDir = mkdtempSync(join(tmpdir(), `sentry-eval-${meta.name}-`));
  try {
    cpSync(meta.fixturePath, workDir, { recursive: true });
    const beforeSnapshot = snapshotDir(workDir);
    const systemPrompt = buildSystemPrompt(meta.skillPath);
    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: meta.prompt },
    ];

    let agentOutput = "";
    const allToolCalls: ToolCallInfo[] = [];
    let turn = 0;

    while (turn < maxTurns) {
      turn++;
      if (options.verbose) {
        console.log(`  [eval:${meta.name}] Turn ${turn}/${maxTurns}`);
      }

      const response = await client.messages.create({
        model,
        max_tokens: 8192,
        system: systemPrompt,
        tools: TOOLS,
        messages,
      });

      for (const block of response.content) {
        if (block.type === "text") agentOutput += block.text + "\n";
      }

      if (response.stop_reason !== "tool_use") break;

      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
      );

      const toolResults: Anthropic.ToolResultBlockParam[] = toolUseBlocks.map(
        (block) => {
          const args = block.input as Record<string, string>;
          const result = executeTool(block.name, args, workDir);
          allToolCalls.push({ name: block.name, arguments: args, result });
          if (options.verbose) {
            console.log(`  [eval:${meta.name}]   ${block.name}(${JSON.stringify(args).slice(0, 80)})`);
          }
          return { type: "tool_result" as const, tool_use_id: block.id, content: result };
        },
      );

      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: toolResults });
    }

    // Diff before/after filesystem state
    const afterSnapshot = snapshotDir(workDir);
    const allPaths = new Set([...Object.keys(beforeSnapshot), ...Object.keys(afterSnapshot)]);
    const createdFiles: string[] = [];
    const modifiedFiles: string[] = [];
    const deletedFiles: string[] = [];

    for (const path of allPaths) {
      const before = beforeSnapshot[path];
      const after = afterSnapshot[path];
      if (before === undefined && after !== undefined) createdFiles.push(path);
      else if (before !== undefined && after === undefined) deletedFiles.push(path);
      else if (before !== after) modifiedFiles.push(path);
    }

    const files: Record<string, string> = {};
    for (const path of allPaths) {
      const content = afterSnapshot[path];
      if (content !== undefined) files[path] = content;
    }

    return {
      files,
      createdFiles,
      modifiedFiles,
      deletedFiles,
      agentOutput,
      durationMs: Date.now() - startTime,
      toolCalls: allToolCalls,
    };
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}
