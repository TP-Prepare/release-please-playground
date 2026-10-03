import { expect, test } from "bun:test";
import { greet } from "../src/index.ts";

test("greet", () => {
	expect(greet("CDD")).toBe("Hello, CDD!");
});
