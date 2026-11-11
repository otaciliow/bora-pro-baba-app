import { describe, expect, it } from "vitest";
import { makeGuest, GUEST_RATING } from "./guests";

describe("visitantes", () => {
  it("todo visitante entra com nota 5.0", () => {
    expect(GUEST_RATING).toBe(5);
    expect(makeGuest("Zé", "Meia", "Rafael").rating).toBe(5);
  });
});
