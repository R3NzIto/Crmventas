import { afterEach, describe, expect, it } from "vitest";
import { workflowRedisConnectionOptions } from "@/modules/workflows/workflow.queue";

describe("workflow redis connection options", () => {
  const originalRedisUrl = process.env.REDIS_URL;

  afterEach(() => {
    process.env.REDIS_URL = originalRedisUrl;
  });

  it("parses rediss URLs for Upstash-compatible TLS connections", () => {
    process.env.REDIS_URL = "rediss://default:secret@example.upstash.io:6379";

    expect(workflowRedisConnectionOptions()).toEqual({
      host: "example.upstash.io",
      port: 6379,
      username: "default",
      password: "secret",
      tls: {}
    });
  });

  it("keeps local redis URLs without TLS", () => {
    process.env.REDIS_URL = "redis://localhost:6379/1";

    expect(workflowRedisConnectionOptions()).toEqual({
      host: "localhost",
      port: 6379,
      db: 1
    });
  });
});
