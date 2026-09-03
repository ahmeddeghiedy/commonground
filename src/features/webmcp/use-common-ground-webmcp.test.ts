import { describe, expect, it, vi } from "vitest";
import type { WebMCPModelContext } from "./webmcp-types";
import {
  scheduleModelContextRetry,
  WEBMCP_ATTACH_RETRY_DELAYS,
} from "./use-common-ground-webmcp";

describe("late WebMCP host attachment", () => {
  it("detects an asynchronously injected model context exactly once", () => {
    const host: { context?: WebMCPModelContext } = {};
    const callbacks: Array<() => void> = [];
    const cancelled: number[] = [];
    const onAvailable = vi.fn();

    const dispose = scheduleModelContextRetry(
      () => host.context,
      onAvailable,
      (callback) => {
        callbacks.push(callback);
        return callbacks.length;
      },
      (timer) => cancelled.push(timer)
    );

    expect(callbacks).toHaveLength(WEBMCP_ATTACH_RETRY_DELAYS.length);
    callbacks[0]();
    expect(onAvailable).not.toHaveBeenCalled();

    host.context = { registerTool: vi.fn() };
    callbacks[1]();
    callbacks[2]();
    expect(onAvailable).toHaveBeenCalledTimes(1);

    dispose();
    expect(cancelled).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
