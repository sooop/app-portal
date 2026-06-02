/**
 * SvelteKit hooks for security headers
 * @type {import('@sveltejs/kit').Handle}
 */
export async function handle({ event, resolve }) {
  const response = await resolve(event);

  // 보안 헤더 설정
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Permissions Policy - 불필요한 브라우저 기능 제한
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // Content Security Policy
  // 모든 리소스(ExcelJS, Pretendard 폰트 등)를 npm 번들로 self-host하므로 외부 CDN을 허용하지 않는다.
  // 'unsafe-inline'(script): SvelteKit 하이드레이션 부트스트랩 인라인 스크립트에 필요
  // 'unsafe-inline'(style): Svelte 트랜지션이 사용하는 인라인 스타일에 필요
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ];

  response.headers.set('Content-Security-Policy', cspDirectives.join('; '));

  return response;
}
