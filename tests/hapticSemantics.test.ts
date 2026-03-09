import { describe, expect, it } from "bun:test";
import { hapticSemanticMap, resolveHapticSemantic } from "../app/components/hapticSemantics";

describe("haptic semantic mapping", () => {
  it("keeps copy outcomes tied to explicit result signals", () => {
    expect(resolveHapticSemantic("copySucceeded")).toBe("success");
    expect(resolveHapticSemantic("copyUnavailable")).toBe("warning");
    expect(resolveHapticSemantic("copyFailed")).toBe("error");
  });

  it("provides stable mapping for shared interaction intents", () => {
    expect(hapticSemanticMap.toggleChanged).toBe("selection");
    expect(hapticSemanticMap.panelOpened).toBe("light");
    expect(hapticSemanticMap.navigationTap).toBe("light");
  });
});
