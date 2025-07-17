import type { NextConfig } from "next";
import { IgnorePlugin, ProvidePlugin } from "webpack";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config) => {
    config.plugins.push(
      new IgnorePlugin({
        resourceRegExp: /^oracledb|pg-query-stream$/,
      }),
      new ProvidePlugin({
        React: "react",
      })
    );

    config.resolve.alias = {
      ...config.resolve.alias,
      "_wp/settings": path.resolve(__dirname, "./src/_wp/settings.ts"),
    };

    config.ignoreWarnings = [
      {
        module:
          /node_modules\/knex\/lib\/migrations\/util\/import-file\.js|node_modules\/fluent-ffmpeg\/lib\/options\/misc.js/,
      },
    ];
    // Important: return the modified config
    return config;
  },
};

export default nextConfig;
