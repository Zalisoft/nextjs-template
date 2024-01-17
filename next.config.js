const { PHASE_DEVELOPMENT_SERVER } = require("next/constants");

module.exports = (phase, { defaultConfig }) => {
  const isDevelopment = phase === PHASE_DEVELOPMENT_SERVER;

  /** @type {import('next').NextConfig} */
  const nextConfig = {
    images: {
      remotePatterns: [
        {
          hostname: "*",
        },
      ],
      dangerouslyAllowSVG: true,
      contentDispositionType: "attachment",
      contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    },
    experimental: {
      // typedRoutes: true,
      swcPlugins: [
        // https://tanstack.com/query/latest/docs/react/guides/ssr#serialization
        // https://github.com/blitz-js/superjson#using-with-nextjs
        [
          "next-superjson-plugin",
          {
            excluded: [],
          },
        ],

        ...(isDevelopment
          ? [
              // https://jotai.org/docs/tools/swc#swc-jotai-debug-label
              ["@swc-jotai/debug-label", {}],
              // https://jotai.org/docs/tools/swc#swc-jotai-react-refresh
              ["@swc-jotai/react-refresh", {}],
            ]
          : []),
      ],
    },
    // Jotai Devtools: required for UI css to be transpiled correctly 👇
    // https://nextjs.org/docs/advanced-features/compiler#module-transpilation
    transpilePackages: ["jotai-devtools"],
    ...(isDevelopment
      ? {
          logging: {
            fetches: {
              fullUrl: true,
            },
          },
          // Update devIndicator's position hidden by other devtools
          devIndicators: {
            buildActivityPosition: "top-right",
          },
        }
      : {}),
    webpack(config) {
      // https://react-svgr.com/docs/next/

      // Grab the existing rule that handles SVG imports
      const fileLoaderRule = config.module.rules.find((rule) =>
        rule.test?.test?.(".svg"),
      );

      config.module.rules.push(
        // Reapply the existing rule, but only for svg imports ending in ?url
        {
          ...fileLoaderRule,
          test: /\.svg$/i,
          resourceQuery: /url/, // *.svg?url
        },
        // Convert all other *.svg imports to React components
        {
          test: /\.svg$/i,
          issuer: /\.[jt]sx?$/,
          resourceQuery: { not: /url/ }, // exclude if *.svg?url
          use: [
            {
              loader: "@svgr/webpack",
              options: {
                svgoConfig: {
                  plugins: [
                    {
                      name: "preset-default",
                      params: {
                        overrides: {
                          // Keep viewBoxes on svg files
                          removeViewBox: false,
                        },
                      },
                    },
                  ],
                },
                typescript: true,
              },
            },
          ],
        },
      );

      // Modify the file loader rule to ignore *.svg, since we have it handled now.
      fileLoaderRule.exclude = /\.svg$/i;

      return config;
    },
  };

  return nextConfig;
};
