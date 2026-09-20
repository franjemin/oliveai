import { ScrollViewStyleReset } from "expo-router/html";
import type { ReactNode } from "react";

import { PERFORMANCE_MEASURE_PATCH_SCRIPT } from "@/src/web/patchPerformance";

export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          // React 19.2 DEV clones component props into performance.measure detail → OOM.
          // Must run before the bundle. Keep timing; drop detail.
          dangerouslySetInnerHTML={{ __html: PERFORMANCE_MEASURE_PATCH_SCRIPT }}
        />
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>Olive</title>
        <script
          // React 19.2 DEV clones component props into performance.measure detail → OOM.
          // Must run before the bundle. Keep timing; drop detail.
          dangerouslySetInnerHTML={{ __html: PERFORMANCE_MEASURE_PATCH_SCRIPT }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Nunito:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: css }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const css = `
html, body, #root {
  height: 100%;
}
body {
  background-color: #E8E6DF;
  margin: 0;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}
textarea, input {
  outline: none;
}
`;
