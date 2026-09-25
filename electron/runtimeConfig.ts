export function getDesktopRuntimeEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  return {
    ...env,
    NODE_ENV: 'production',
    CALCORA_DESKTOP: '1',
  };
}
