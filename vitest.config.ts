import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * اختبارات الوحدة — منطق خالص بلا قاعدة بيانات ولا متصفّح.
 * اختبارات المتصفّح (playwright) في e2e/ وتُشغَّل بسكربت منفصل (npm run test:e2e).
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
    },
  },
});
