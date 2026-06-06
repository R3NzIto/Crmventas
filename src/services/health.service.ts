import { prisma } from "@/lib/prisma";
import { getRedisConnection } from "@/lib/redis";

export type HealthStatus = "ok" | "error";

export interface HealthDependencyStatus {
  status: HealthStatus;
  latencyMs?: number;
  error?: string;
}

export interface HealthCheckResult {
  status: HealthStatus;
  checkedAt: string;
  dependencies: {
    database: HealthDependencyStatus;
    redis: HealthDependencyStatus;
  };
}

export interface HealthDatabasePort {
  $queryRaw<T = unknown>(query: TemplateStringsArray): Promise<T>;
}

export interface HealthRedisPort {
  ping(): Promise<string>;
}

const redisHealthPort: HealthRedisPort = {
  ping() {
    return getRedisConnection().ping();
  }
};

async function measureDependency(check: () => Promise<void>): Promise<HealthDependencyStatus> {
  const startedAt = Date.now();
  try {
    await check();
    return {
      status: "ok",
      latencyMs: Date.now() - startedAt
    };
  } catch (error) {
    return {
      status: "error",
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "Unknown healthcheck error"
    };
  }
}

function withTimeout<T>(operation: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return Promise.race([
    operation,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    })
  ]);
}

export function createHealthService(database: HealthDatabasePort = prisma, redis: HealthRedisPort = redisHealthPort) {
  return {
    async check(): Promise<HealthCheckResult> {
      const [databaseStatus, redisStatus] = await Promise.all([
        measureDependency(async () => {
          await withTimeout(database.$queryRaw`SELECT 1`, 2_000, "Database healthcheck");
        }),
        measureDependency(async () => {
          await withTimeout(redis.ping(), 2_000, "Redis healthcheck");
        })
      ]);

      return {
        status: databaseStatus.status === "ok" && redisStatus.status === "ok" ? "ok" : "error",
        checkedAt: new Date().toISOString(),
        dependencies: {
          database: databaseStatus,
          redis: redisStatus
        }
      };
    }
  };
}

export const healthService = createHealthService();
