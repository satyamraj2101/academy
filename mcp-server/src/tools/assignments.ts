import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { adminPost } from '../client.js';

export function registerAssignmentTools(server: McpServer) {
  server.registerTool(
    'create_assignment',
    {
      title: 'Create a graded assignment',
      description: 'Creates a graded assignment attached to a lesson. Attach it to the lesson\'s content via an Assignment content block in the Course Builder.',
      inputSchema: {
        lesson_id: z.string(),
        prompt_text: z.string(),
        submission_type: z.enum(['text', 'file', 'both']).default('text'),
        max_score: z.number().int().min(1).default(100),
      },
    },
    async ({ lesson_id, prompt_text, submission_type, max_score }) => {
      const data = await adminPost('/academy/assignments', { lesson_id, prompt_text, submission_type, max_score });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );
}
