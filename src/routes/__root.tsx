import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  useNavigate,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { DesktopHeader } from "@/components/DesktopHeader";
import { AppSidebar, MobileBottomBar, MobileTopBar } from "@/components/AppNav";
import { AuthProvider, useAuth } from "@/lib/auth";
import { PendingCard } from "@/components/Auth";
import { LoaderCircle } from "lucide-react";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Bora pro Baba" },
      { name: "description", content: "Organize seu baba: presenças, mensalidades e atletas." },
            { property: "og:title", content: "Bora pro Baba" },
      { property: "og:description", content: "Organize seu baba: presenças, mensalidades e atletas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600;700&display=swap" },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Gate />
      </AuthProvider>
      <Toaster richColors />
    </QueryClientProvider>
  );
}

function Gate() {
  const { ready, status, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const isAuthPage = pathname === "/login" || pathname.startsWith("/convite/");

  useEffect(() => {
    if (ready && status === "anonymous" && !isAuthPage) navigate({ to: "/login", replace: true });
  }, [ready, status, isAuthPage, navigate]);

  if (isAuthPage) return <Outlet />;
  if (!ready || status === "anonymous") {
    return (
    <div className="grid min-h-screen place-items-center text-muted-foreground">
      <div className="flex gap-2 items-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
        <span className="text-xl">Carregando…</span>
      </div>
    </div>
  );
  }
  if (status === "pending") {
    return (
      <div className="mx-auto grid min-h-screen max-w-xl place-items-center px-4">
        <PendingCard
          onLogout={() => {
            signOut();
            navigate({ to: "/login", replace: true });
          }}
        />
      </div>
    );
  }
  return (
    <>
      <DesktopHeader />
      <MobileTopBar />
      {/* Required: nested routes render here. */}
      <div className="pb-20 md:pb-0">
        <Outlet />
      </div>
      <MobileBottomBar />
    </>
  );
}
