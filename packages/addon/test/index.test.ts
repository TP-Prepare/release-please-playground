import { expect, test } from "bun:test";
import { greetAll } from "../src/index.ts";

test("greetAll", () => {
	expect(greetAll(["a", "b"])).toEqual(["Hello, a!", "Hello, b!"]);
});
