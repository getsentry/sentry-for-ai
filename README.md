# Sentry Claude Code Plugin

Official Sentry integration plugin for Claude Code that provides intelligent issue tracking, performance monitoring, and automated PR comment resolution.

## Overview

This plugin brings Sentry's powerful error tracking and performance monitoring directly into your Claude Code workflow. Ask questions in natural language, analyze issues across projects, monitor application performance, and automatically resolve code quality issues identified by Sentry Bot in pull requests.

## Features

### 🔌 Sentry Integration
- Direct access to Sentry APIs and issue data
- Automatic configuration via bundled MCP server
- No additional setup required after installation

### 💬 Slash Commands

#### `/seer <natural language query>`
Ask questions about your Sentry environment in natural language.

**Usage:**
```
/seer What are the top errors in the last 24 hours?
/seer Show me all critical issues in mobile-app
/seer Which issues are affecting the most users?
/seer Show me database performance for the web-app project
/seer What's the request latency for the api-gateway application?
```

**Features:**
- Natural language query interface
- Formatted responses (tables, cards, statistics)
- Clickable URLs to Sentry issues
- Actionable insights and recommendations

#### `/getIssues [projectName]`
Fetch the 10 most recent issues from Sentry.

**Usage:**
```
/getIssues                  # Get issues across all projects
/getIssues sentryvibe       # Get issues for specific project
```

### 🤖 Sub-Agents

#### issue-summarizer
Analyzes multiple Sentry issues in parallel to provide comprehensive summaries.

**Features:**
- Parallel issue processing for efficiency
- Pattern recognition across multiple issues
- User impact assessment
- Root cause analysis
- Prioritized recommendations

**When to use:**
- Understanding overall project health
- Investigating multiple related issues
- Generating executive summaries
- Prioritizing bug fixes

### 🎯 Skills

#### sentry-pr-resolver
Automatically analyzes and resolves Sentry Bot comments on GitHub Pull Requests.

**Features:**
- Parses Sentry Bot comments (ignores seer-by-sentry)
- Validates issues still exist
- Implements suggested fixes
- Provides comprehensive resolution summary

**When Claude uses this:**
- When reviewing PRs with Sentry Bot comments
- When asked to "fix sentry issues in PR"
- When analyzing code quality issues

## Installation

### From GitHub

#### 1. Add the Sentry Marketplace
```bash
/plugin marketplace add getsentry/claude-marketplace
```

#### 2. Install the Plugin
```bash
/plugin install sentry@getsentry
```

#### 3. Restart Claude Code
Restart Claude Code to activate the plugin and load the bundled MCP server configuration.

#### 4. Verify Installation
```bash
/help           # Should show /seer and /getIssues commands
/mcp            # Should show sentry MCP server
```

### From Local Source

If you're developing or testing locally:

```bash
# Clone the repository
git clone https://github.com/getsentry/claude-marketplace.git
cd claude-marketplace

# Add as local marketplace
/plugin marketplace add /path/to/claude-marketplace

# Install
/plugin install sentry@local

# Restart Claude Code
```

## Usage Examples

### Query Your Sentry Environment
```bash
# Error and issue queries
/seer What are the top errors today?
/seer Show critical issues in web-app
/seer Which issues have the most user impact?

# Performance queries
/seer Show me database performance for backend project
/seer What's the request latency for api-gateway?
/seer Show slow database queries in web-app
```

### Get Recent Issues
```bash
# All projects
/getIssues

# Specific project
/getIssues my-project-name
```

### Analyze Multiple Issues
```
Can you analyze the recent issues in my-project and summarize the user impact?
```
Claude will automatically invoke the issue-summarizer agent.

### Resolve PR Comments
```
Review PR #118 and fix the Sentry Bot comments
```
Claude will automatically use the sentry-pr-resolver skill to:
1. Fetch Sentry Bot comments
2. Analyze each issue
3. Implement fixes
4. Provide a summary

## Configuration

### Sentry API Connection

The plugin automatically configures access to Sentry APIs when installed. No additional setup is required - just install the plugin and restart Claude Code.

For advanced configuration options (such as custom authentication or proxy settings), see [MCP-SETUP.md](./MCP-SETUP.md).

### GitHub CLI (for PR resolver)

The `sentry-pr-resolver` skill requires GitHub CLI to fetch PR comments. Install and authenticate:

```bash
# Install GitHub CLI
brew install gh          # macOS
# or download from https://cli.github.com/

# Authenticate
gh auth login
```

## Plugin Structure

```
claude-marketplace/
├── .claude-plugin/
│   ├── plugin.json           # Plugin metadata
│   └── marketplace.json      # Marketplace listing
├── .mcp.json                 # MCP server configuration
├── commands/
│   ├── seer.md               # /seer natural language query command
│   └── getIssues.md          # /getIssues command
├── agents/
│   └── issue-summarizer.md  # Parallel issue analysis agent
├── skills/
│   └── sentry-pr-resolver/
│       └── SKILL.md          # PR comment resolver skill
├── MCP-SETUP.md              # Advanced MCP configuration guide
└── README.md                 # This file
```

## Tips & Best Practices

### Query Tips
- **Be specific**: Mention project names, time ranges, or severity in your `/seer` queries
- **Natural language works**: Use phrases like "show me", "what are", "how many"
- **Performance queries**: Ask about database performance, request latency, slow queries
- **Follow-ups**: Ask follow-up questions to drill deeper into specific issues

### Workflow Integration
- Use `/seer` for exploratory analysis and ad-hoc questions
- Use `/getIssues` for quick checks of recent issues
- Let Claude automatically invoke `issue-summarizer` agent for deep analysis of multiple issues
- The `sentry-pr-resolver` skill activates automatically when reviewing PRs

### Performance Optimization
- Queries run in parallel when analyzing multiple issues for faster results
- Results include clickable URLs for quick navigation to Sentry
- Automatic connection to Sentry APIs - no manual configuration needed

### PR Review Workflow
- Ensure `gh` CLI is authenticated before using PR resolver
- Sentry Bot comments have severity levels (CRITICAL, HIGH, MEDIUM, LOW)
- The skill will prioritize fixes based on confidence and severity
- Manual review may be needed for low-confidence issues

## Troubleshooting

### MCP Server Not Available
Check your Claude Code MCP configuration:
```bash
# Verify MCP servers are loaded
/help
```

### Command Not Found
Ensure the plugin is installed and Claude Code has been restarted.

### PR Resolver Can't Access GitHub
Install and authenticate GitHub CLI:
```bash
brew install gh
gh auth login
```

## Contributing

Feel free to extend this plugin with additional commands, agents, or skills!

## License

MIT
