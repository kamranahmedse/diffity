import type { Config } from "@react-router/dev/config";

export default {
  ssr: false,
  appDirectory: "src",
  buildDirectory: "../cli/dist/ui",
} satisfies Config;
