function readEnv(name: string) {
  const value = process.env[name];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function getRuntimeDatabaseUrl() {
  return (
    readEnv("POSTGRES_PRISMA_URL") ??
    readEnv("POSTGRES_URL") ??
    readEnv("DATABASE_URL")
  );
}

export function getPrismaCliDatabaseUrl() {
  return (
    readEnv("POSTGRES_URL_NON_POOLING") ??
    readEnv("DATABASE_URL_UNPOOLED") ??
    getRuntimeDatabaseUrl()
  );
}
