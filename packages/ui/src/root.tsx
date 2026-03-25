import { useEffect, useRef } from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useNavigation } from "react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import NProgress from "nprogress";
import { queryClient } from "./lib/query-client";
import "nprogress/nprogress.css";
import "./styles/app.css";

export function Layout(props: { children: React.ReactNode }) {
  const { children } = props;

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>diffity</title>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function NavigationProgress() {
  const navigation = useNavigation();
  const active = useRef(false);

  useEffect(() => {
    NProgress.configure({ showSpinner: false, minimum: 0.2, trickleSpeed: 100 });
  }, []);

  useEffect(() => {
    if (navigation.state === "loading" && !active.current) {
      active.current = true;
      NProgress.start();
    } else if (navigation.state === "idle" && active.current) {
      active.current = false;
      NProgress.done();
    }
  }, [navigation.state]);

  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NavigationProgress />
      <Outlet />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "var(--color-bg-secondary)",
            color: "var(--color-text)",
            border: "1px solid var(--color-border)",
            fontSize: "13px",
          },
        }}
      />
    </QueryClientProvider>
  );
}

export function HydrateFallback() {
  return (
    <div className="flex items-center justify-center h-screen bg-bg">
      <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
    </div>
  );
}
