import resolve from "@rollup/plugin-node-resolve";
import ts from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";
import dts from "rollup-plugin-dts";
// 基础配置
const main = {
  input: "src/index.ts", // 入口文件
  output: [
    {
      file: "dist/index.js", // CommonJS
      format: "cjs",
      sourcemap: true,
    },
  ],
  plugins: [resolve(), commonjs(), ts()]
};
const Dts = {
  input: "src/index.ts",
  output: {
    file: "dist/index.d.ts",
    format: "es",
  },
  plugins: [dts()],
};
export default [main, Dts];
