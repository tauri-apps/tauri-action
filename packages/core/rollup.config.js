import typescript from "@rollup/plugin-typescript";
import pkg from "./package.json";

export default {
  treeshake: true,
  perf: true,
  input: { index: "index.ts" },
  output: {
    dir: "dist",
    format: "cjs",
    entryFileNames: "[name].js",
    exports: "named",
  },
  plugins: [typescript({
    tsconfig: './tsconfig.json'
  })],
  external: [
    ...Object.keys(pkg.dependencies || {}),
    "path",
  ],
  watch: {
    chokidar: true,
    include: "src/**",
    exclude: "node_modules/**",
  },
};
