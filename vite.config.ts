import { cloudflare } from "@cloudflare/vite-plugin";
import { sites } from "@openai/sites-vite-plugin";
import tailwindcss from "@tailwindcss/postcss";
import vinext from "vinext";
import { defineConfig } from "vite";
import hostingConfig from "./.openai/hosting.json";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const { d1, r2 } = hostingConfig;

function singleFlightSitesPlugin() {
  const plugin = sites();
  const originalCloseBundle = plugin.closeBundle;
  let packaging: Promise<unknown> | undefined;

  // vinext builds several Vite environments. On Windows, their closeBundle
  // hooks can race while replacing dist/.openai, producing an EBUSY failure.
  // Run the Sites packaging step once and share that promise across environments.
  plugin.closeBundle = async function closeBundle() {
    if (!packaging) {
      packaging = Promise.resolve(
        typeof originalCloseBundle === "function"
          ? originalCloseBundle.call(this)
          : originalCloseBundle?.handler.call(this),
      );
    }
    await packaging;
  };

  return plugin;
}

const localBindingConfig = {
  main: "vinext/server/fetch-handler",
  compatibility_flags: ["nodejs_compat"],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "site-creator-d1",
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [{ binding: r2, bucket_name: "site-creator-r2" }]
    : [],
};

export default defineConfig({
  css: { postcss: { plugins: [tailwindcss()] } },
  plugins: [
    vinext(),
    singleFlightSitesPlugin(),
    cloudflare({
      viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
      config: localBindingConfig,
    }),
  ],
});
