#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerCourseTools } from './tools/courses.js';
import { registerLessonTools } from './tools/lessons.js';
import { registerQuizTools } from './tools/quizzes.js';
import { registerAssignmentTools } from './tools/assignments.js';
import { registerGenerateTools } from './tools/generate.js';

const server = new McpServer({
  name: 'spotclm-academy',
  version: '1.0.0',
});

registerCourseTools(server);
registerLessonTools(server);
registerQuizTools(server);
registerAssignmentTools(server);
registerGenerateTools(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('SpotCLM Academy MCP server running on stdio');
}

main().catch(err => {
  console.error('Fatal error starting MCP server:', err);
  process.exit(1);
});
