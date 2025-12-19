import type { NextConfig } from "next";
import { IgnorePlugin, ProvidePlugin } from "webpack";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  outputFileTracingRoot: path.join(__dirname, "../../"),
  webpack: (config, { isServer }) => {
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

    // Externalize native modules for server-side
    if (isServer) {
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push("sodium-native", "require-addon");
      }
    } else {
      // For client-side, ignore native modules completely
      config.plugins.push(
        new IgnorePlugin({
          resourceRegExp: /^sodium-native|require-addon$/,
        })
      );
    }

    config.ignoreWarnings = [
      {
        module:
          /node_modules\/knex\/lib\/migrations\/util\/import-file\.js|node_modules\/fluent-ffmpeg\/lib\/options\/misc.js/,
      },
      // Ignore warnings from native addon dependencies
      {
        module: /node_modules\/require-addon\/lib\/node\.js/,
      },
      {
        module: /node_modules\/sodium-native\/binding\.js/,
      },
    ];
    // Important: return the modified config
    return config;
  },
};

export default nextConfig;
