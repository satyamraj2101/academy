import { Env, CORS_HEADERS, corsResponse, corsOptionsResponse, errorResponse, verifyAcademyUser, logAcademyAction } from './middleware';
import { generateTOTPSecret, verifyTOTP } from '../../utils/totp';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;

  const { user, db } = authResult.context;

  try {
    const data = await request.json() as any;
    
    // Step 1: Generate a new secret if they are just starting setup
    if (data.action === 'generate') {
      const existingUser = await db.prepare('SELECT totp_enabled FROM academy_users WHERE id = ?').bind(user.id).first() as any;
      if (existingUser?.totp_enabled === 1) {
        return errorResponse('2FA is already enabled', 400);
      }

      const secret = generateTOTPSecret();
      await db.prepare('UPDATE academy_users SET totp_secret = ? WHERE id = ?').bind(secret, user.id).run();
      
      // In a real app, generate a QR code data URI here (e.g. using a qrcode library)
      // For this implementation, we return the otpauth URI which the frontend can render using a library
      const otpauthUrl = `otpauth://totp/SpotCLM%20Academy:${encodeURIComponent(user.email)}?secret=${secret}&issuer=SpotCLM%20Academy`;
      
      return corsResponse({
        success: true,
        secret,
        otpauthUrl
      });
    }
    
    // Step 2: Verify code to finalize setup
    if (data.action === 'verify') {
      const code = data.code;
      if (!code) return errorResponse('Code required', 400);
      
      const freshUser = await db.prepare('SELECT totp_secret, totp_enabled FROM academy_users WHERE id = ?').bind(user.id).first() as any;
      
      if (freshUser.totp_enabled === 1) return errorResponse('Already enabled', 400);
      if (!freshUser.totp_secret) return errorResponse('Please generate a secret first', 400);
      
      const isValid = await verifyTOTP(freshUser.totp_secret, code);
      if (!isValid) return errorResponse('Invalid verification code', 400);
      
      await db.prepare('UPDATE academy_users SET totp_enabled = 1 WHERE id = ?').bind(user.id).run();
      await logAcademyAction(db, user.id, 'user.2fa_enabled', 'user', user.id, {}, request);
      
      return corsResponse({ success: true, message: '2FA enabled successfully' });
    }
    
    return errorResponse('Invalid action', 400);

  } catch (error: any) {
    console.error('2FA setup error:', error);
    return errorResponse('Internal server error', 500);
  }
};
