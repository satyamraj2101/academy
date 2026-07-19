import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { adminGet, adminPost, adminPut } from '../client.js';

export function registerLessonTools(server: McpServer) {
  server.registerTool(
    'create_module',
    {
      title: 'Create a module',
      description: 'Creates a new module inside a course.',
      inputSchema: { course_id: z.string(), title: z.string(), description: z.string().optional() },
    },
    async ({ course_id, title, description }) => {
      const data = await adminPost('/academy/modules', { course_id, title, description: description || '' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    'create_lesson',
    {
      title: 'Create a lesson',
      description: 'Creates a new lesson inside a module, with markdown content as its single content block.',
      inputSchema: {
        module_id: z.string(),
        title: z.string(),
        markdown_content: z.string().optional(),
        is_preview: z.boolean().optional(),
      },
    },
    async ({ module_id, title, markdown_content, is_preview }) => {
      const lesson = await adminPost<{ id: string }>('/academy/lessons', {
        module_id, title, content_type: 'blocks', is_preview: is_preview ? 1 : 0,
      });

      if (markdown_content?.trim()) {
        await adminPut(`/academy/lessons/${lesson.id}/sections`, {
          sections: [{ section_type: 'markdown', content: markdown_content, is_mandatory: true }],
        });
      }

      return { content: [{ type: 'text', text: JSON.stringify(lesson, null, 2) }] };
    }
  );

  server.registerTool(
    'set_lesson_drip',
    {
      title: 'Set lesson drip schedule / publish state',
      description: 'Updates a lesson\'s drip-delay (days after enrollment), fixed unlock date, preview flag, or published flag.',
      inputSchema: {
        lesson_id: z.string(),
        drip_days: z.number().int().min(0).optional(),
        unlock_date: z.string().optional(),
        is_preview: z.boolean().optional(),
        is_published: z.boolean().optional(),
      },
    },
    async ({ lesson_id, drip_days, unlock_date, is_preview, is_published }) => {
      // The lessons PUT endpoint is a full-record replace, not a patch —
      // fetch the current record first so unrelated fields aren't blanked out.
      const { lesson: existing } = await adminGet<{ lesson: any }>(`/academy/lessons?id=${lesson_id}`);
      const data = await adminPut('/academy/lessons', {
        ...existing,
        id: lesson_id,
        drip_days: drip_days ?? existing.drip_days,
        unlock_date: unlock_date ?? existing.unlock_date,
        is_preview: is_preview === undefined ? existing.is_preview : (is_preview ? 1 : 0),
        is_published: is_published === undefined ? existing.is_published : (is_published ? 1 : 0),
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );
}
