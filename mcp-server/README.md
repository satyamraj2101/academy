# SpotCLM Academy MCP Server

Exposes course-authoring operations (courses, modules, lessons, quizzes, assignments, and full AI-generated courses) as MCP tools, so Claude or any other MCP client can author Academy content directly — without going through the web UI.

It is a thin wrapper: every tool call is just a request to the existing admin REST API (`/api/admin/academy/...`). No D1 business logic is duplicated here — validation, permission checks, and audit logging all stay in the Cloudflare Pages Functions where they already live.

## Setup

1. In the live admin panel, go to **Service Keys** (superadmin only) and create a key. Copy the `sk_...` value shown — it is never shown again.
2. Build the server:
   ```
   cd mcp-server
   npm install
   npm run build
   ```
3. Add it to your MCP client config (e.g. Claude Desktop's `claude_desktop_config.json`):
   ```json
   {
     "mcpServers": {
       "spotclm-academy": {
         "command": "node",
         "args": ["/absolute/path/to/mcp-server/dist/index.js"],
         "env": {
           "ACADEMY_SERVICE_API_KEY": "sk_...",
           "ACADEMY_ADMIN_BASE_URL": "https://spotclm-academy.pages.dev/api/admin"
         }
       }
     }
   }
   ```

## Tools

- `list_courses`, `create_course`, `publish_course`, `duplicate_course`, `get_course_structure`
- `create_module`, `create_lesson`, `set_lesson_drip`
- `create_quiz` (with questions in one call)
- `create_assignment`
- `generate_course_from_prompt` — the flagship operation: generates a complete draft course (modules, lessons, a quiz and assignment per module) from a topic brief, in a single tool call.

## Revoking access

Revoke a key any time from the Service Keys admin page — it takes effect immediately, no redeploy needed.
