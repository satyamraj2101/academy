import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { adminGet, adminPost, adminPut } from '../client.js';

export function registerCourseTools(server: McpServer) {
  server.registerTool(
    'list_courses',
    {
      title: 'List courses',
      description: 'Lists courses in the Academy, paginated.',
      inputSchema: { page: z.number().int().min(1).optional(), pageSize: z.number().int().min(1).max(100).optional() },
    },
    async ({ page, pageSize }) => {
      const query = new URLSearchParams();
      if (page) query.set('page', String(page));
      if (pageSize) query.set('pageSize', String(pageSize));
      const data = await adminGet(`/academy/courses?${query.toString()}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    'create_course',
    {
      title: 'Create a course',
      description: 'Creates a new course (starts as a draft — use publish_course to make it live).',
      inputSchema: {
        title: z.string(),
        description: z.string().optional(),
        long_description: z.string().optional(),
        level: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Expert']).optional(),
        duration: z.string().optional(),
        category: z.string().optional(),
        price_usd_cents: z.number().int().min(0).optional(),
        price_inr_cents: z.number().int().min(0).optional(),
      },
    },
    async ({ title, description, long_description, level, duration, category, price_usd_cents, price_inr_cents }) => {
      const data = await adminPost('/academy/courses', {
        title, description, long_description, level, duration, category,
        price_usd: price_usd_cents, price_inr: price_inr_cents, status: 'draft',
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    'publish_course',
    {
      title: 'Publish or unpublish a course',
      description: 'Sets a course\'s status to published or draft.',
      inputSchema: { course_id: z.string(), published: z.boolean() },
    },
    async ({ course_id, published }) => {
      // The courses PUT endpoint is a full-record replace, not a patch — fetch
      // the current record first so fields we're not changing aren't blanked out.
      const existing = await adminGet(`/academy/courses?id=${course_id}`);
      const data = await adminPut('/academy/courses', { ...existing, id: course_id, status: published ? 'published' : 'draft' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    'duplicate_course',
    {
      title: 'Duplicate a course',
      description: 'Deep-copies a course (modules, lessons, quizzes, assignments) into a new draft course.',
      inputSchema: { course_id: z.string() },
    },
    async ({ course_id }) => {
      const data = await adminPost(`/academy/courses/${course_id}/duplicate`, {});
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    'get_course_structure',
    {
      title: 'Get a course\'s full structure',
      description: 'Returns a course with its modules, lessons, and content sections.',
      inputSchema: { course_id: z.string() },
    },
    async ({ course_id }) => {
      const data = await adminGet(`/academy/courses/${course_id}/structure`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );
}
