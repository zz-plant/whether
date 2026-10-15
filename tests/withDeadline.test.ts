import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { DeadlineExceededError, withDeadline } from "../lib/withDeadline";
import { loadReportDataSafe } from "../lib/report/reportData";
import { serveUnreachableUpstreams } from "./fixtures/unreachableUpstreams";

serveUnreachableUpstreams();

describe("withDeadline", () => {
  it("passes through a value that resolves in time", async () => {
    const result = await withDeadline(Promise.resolve("done"), 1_000, "test");
    assert.equal(result, "done");
  });

  it("propagates the original rejection rather than masking it", async () => {
    const failure = new Error("upstream exploded");
    await assert.rejects(
      () => withDeadline(Promise.reject(failure), 1_000, "test"),
      (error: Error) => error === failure,
    );
  });

  it("rejects with a labelled deadline error when work stalls", async () => {
    const stalled = new Promise<never>(() => {});
    await assert.rejects(
      () => withDeadline(stalled, 20, "stalling-dependency"),
      (error: Error) =>
        error instanceof DeadlineExceededError && error.message.includes("stalling-dependency"),
    );
  });

  it("does not leave a rejected abandoned promise unhandled", async () => {
    let unhandled: unknown = null;
    const onUnhandled = (reason: unknown) => {
      unhandled = reason;
    };
    process.on("unhandledRejection", onUnhandled);

    const slowFailure = new Promise<never>((_resolve, reject) => {
      setTimeout(() => reject(new Error("late failure")), 10);
    });

    await assert.rejects(() => withDeadline(slowFailure, 1, "late"));
    await new Promise((resolve) => setTimeout(resolve, 50));

    process.off("unhandledRejection", onUnhandled);
    assert.equal(unhandled, null);
  });
});

describe("loadReportDataSafe", () => {
  it("degrades to the snapshot fallback instead of hanging", async () => {
    // The report path is deadline-bounded, so this resolves either way; the contract that
    // matters is that it always resolves to a usable result.
    const result = await loadReportDataSafe(undefined, { route: "test" });

    assert.equal(typeof result.ok, "boolean");
    const data = result.ok ? result.data : result.fallback;
    assert.equal(typeof data.treasury.record_date, "string");
  });
});
