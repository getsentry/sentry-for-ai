---
name: getIssues
description: Fetch the most recent 10 issues from Sentry, optionally filtered by project name
---

# Get Recent Sentry Issues

Retrieve and display the 10 most recent issues from Sentry.

## Usage

- `/getIssues` - Get the 10 most recent issues across all projects
- `/getIssues <projectName>` - Get the 10 most recent issues for a specific project

## Instructions

You are tasked with fetching recent Sentry issues using the Sentry MCP server.

1. **Parse the command arguments:**
   - Extract the project name if provided (e.g., `/getIssues sentryvibe` should extract "sentryvibe")
   - If no project name is provided, fetch issues across all projects

2. **Use the Sentry MCP tools to fetch issues:**
   - Query for the 10 most recent issues
   - If a project name was provided, filter results to only that project
   - Sort by most recent first

3. **Display the results in a clear format:**
   ```
   ## Recent Sentry Issues [for <project>]

   ### Issue 1: [Title]
   - **ID:** [issue-id]
   - **Project:** [project-name]
   - **Status:** [status]
   - **First Seen:** [timestamp]
   - **Last Seen:** [timestamp]
   - **Event Count:** [count]
   - **Users Affected:** [count]
   - **Link:** [sentry-url]

   [Repeat for each issue]
   ```

4. **Error handling:**
   - If the Sentry MCP server is not available, inform the user and suggest checking their MCP configuration
   - If no issues are found, inform the user
   - If the specified project doesn't exist, list available projects

## Tips

- Use the MCP tools provided by the Sentry MCP server at https://mcp.sentry.dev/mcp
- The project name argument is case-sensitive
- You can suggest using the issue-summarizer agent for deeper analysis of multiple issues
