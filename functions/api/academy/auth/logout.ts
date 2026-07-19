import { Env, CORS_HEADERS, corsResponse, corsOptionsResponse, getCookie } from './middleware';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const refreshToken = getCookie(request, 'academy_refresh');

  if (refreshToken && env.ENQUIRY_KV) {
    await env.ENQUIRY_KV.delete(`academy:refresh:${refreshToken}`);
  }

  const response = new Response(JSON.stringify({ success: true }), { status: 200, headers: CORS_HEADERS });

  // Clear cookies
  response.headers.append('Set-Cookie', 'academy_token=; HttpOnly; Path=/; SameSite=Strict; Secure; Max-Age=0');
  response.headers.append('Set-Cookie', 'academy_refresh=; HttpOnly; Path=/api/academy/auth; SameSite=Strict; Secure; Max-Age=0');

  return response;
};
