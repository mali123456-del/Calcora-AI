export const DESKTOP_GEMINI_ENV_KEY = 'CALCORA_DESKTOP_GEMINI_API_KEY';

export function getDesktopRuntimeEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  return {
    ...env,
    NODE_ENV: 'production',
    CALCORA_DESKTOP: '1',
    CALCORA_PORT: '0',
  };
}

export function getServerHost(env: NodeJS.ProcessEnv = process.env): string {
  if (env.CALCORA_DESKTOP === '1') return '127.0.0.1';
  return env.CALCORA_HOST?.trim() || '0.0.0.0';
}

export function getServerPort(env: NodeJS.ProcessEnv = process.env): number {
  const configured = Number(env.CALCORA_PORT);
  return Number.isInteger(configured) && configured >= 0 && configured <= 65535
    ? configured
    : 3000;
}

export function getGeminiCredentialPath(userDataPath: string): string {
  const separator = userDataPath.includes('\\') ? '\\' : '/';
  return `${userDataPath.replace(/[\\/]+$/, '')}${separator}gemini-credential.bin`;
}

export function resolveGeminiApiKey(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const desktopCredential = env.CALCORA_DESKTOP === '1'
    ? env[DESKTOP_GEMINI_ENV_KEY]?.trim()
    : undefined;
  const environmentCredential = env.GEMINI_API_KEY?.trim();
  const key = desktopCredential || environmentCredential;
  return key && !['MY_GEMINI_API_KEY', 'your-gemini-api-key', 'CHANGE-ME'].includes(key)
    ? key
    : undefined;
}

export function isTrustedCalcoraRendererUrl(rawUrl: string, expectedPort = 3000): boolean {
  try {
    const url = new URL(rawUrl);
    return url.protocol === 'http:'
      && url.hostname === '127.0.0.1'
      && Number(url.port) === expectedPort
      && (url.pathname === '/' || url.pathname === '/index.html')
      && !url.username
      && !url.password;
  } catch {
    return false;
  }
}
