export function getEnv(name: string): string | undefined {
  if (process.env[name] !== undefined) return process.env[name];

  const lower = name.toLowerCase();
  for (const key of Object.keys(process.env)) {
    if (key.toLowerCase() === lower) return process.env[key];
  }

  return undefined;
}
