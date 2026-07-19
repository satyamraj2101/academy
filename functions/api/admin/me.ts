import { verifyAdminRequest, corsResponse, corsOptionsResponse } from './middleware';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  const result = await verifyAdminRequest(request, env as any);
  if ('error' in result) return result.error;
  
  return corsResponse({ admin: result.context.admin });
};
