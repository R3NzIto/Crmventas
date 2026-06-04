import { describe, expect, it, vi } from "vitest";
import { createHealthService, type HealthDatabasePort, type HealthRedisPort } from "@/services/health.service";

function databaseMock(success = true): HealthDatabasePort {
  return {
    $queryRaw: vi.fn().mockImplementation(() => (success ? Promise.resolve([{ "?column?": 1 }]) : Promise.reject(new Error("db down"))))
  };
}

function redisMock(success = true): HealthRedisPort {
  return {
    ping: vi.fn().mockImplementation(() => (success ? Promise.resolve("PONG") : Promise.reject(new Error("redis down"))))
  };
}

describe("health service", () => {
  it("returns ok when database and redis respond", async () => {
    const database = databaseMock();
    const redis = redisMock();
    const service = createHealthService(database, redis);

    const result = await service.check();

    expect(result.status).toBe("ok");
    expect(result.dependencies.database.status).toBe("ok");
    expect(result.dependencies.redis.status).toBe("ok");
    expect(database.$queryRaw).toHaveBeenCalled();
    expect(redis.ping).toHaveBeenCalled();
  });

  it("returns error when one dependency fails", async () => {
    const service = createHealthService(databaseMock(false), redisMock());

    const result = await service.check();

    expect(result.status).toBe("error");
    expect(result.dependencies.database.status).toBe("error");
    expect(result.dependencies.redis.status).toBe("ok");
  });
});
