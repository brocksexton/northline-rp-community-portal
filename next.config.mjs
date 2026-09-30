// Set only by scripts/static-demo/build.mjs, which snapshots the demo for GitHub Pages
// (served from a sub-path, one build per demo view). Normal builds ignore these.
const staticBasePath = process.env.NORTHLINE_STATIC_BASE_PATH?.trim();
const staticDistDir = process.env.NORTHLINE_STATIC_DIST_DIR?.trim();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  ...(staticBasePath ? { basePath: staticBasePath } : {}),
  ...(staticDistDir ? { distDir: staticDistDir } : {}),
};

export default nextConfig;
