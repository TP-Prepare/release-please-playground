import { defineConfig } from "tsdown";

export default defineConfig({
	entry: { index: "src/index.ts" },
	format: ["esm"],
	dts: true,
	clean: true,
	deps: { neverBundle: ["@wely674378-team/core"] },
});
