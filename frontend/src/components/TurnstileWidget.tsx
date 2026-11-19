import { useEffect, useRef } from "react";

type TurnstileRenderOptions = {
  sitekey: string;
  action: string;
  theme: "dark" | "light" | "auto";
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
};

declare global {
  interface Window {
    turnstile?: {
      render(container: HTMLElement, options: TurnstileRenderOptions): string;
      remove(widgetId: string): void;
    };
  }
}

const SCRIPT_ID = "cloudflare-turnstile-script";
const SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type Props = {
  siteKey: string;
  onToken: (token: string) => void;
  onError: () => void;
};

export function TurnstileWidget({ siteKey, onToken, onError }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    let widgetId: string | undefined;
    let disposed = false;
    const container = containerRef.current;
    const render = () => {
      if (disposed || widgetId || !window.turnstile) return;
      widgetId = window.turnstile.render(container, {
        sitekey: siteKey,
        action: "deploy",
        theme: "dark",
        callback: onToken,
        "expired-callback": () => onToken(""),
        "error-callback": onError,
      });
    };

    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.addEventListener("error", onError, { once: true });
      document.head.appendChild(script);
    }
    script.addEventListener("load", render);
    render();

    return () => {
      disposed = true;
      script?.removeEventListener("load", render);
      if (widgetId) window.turnstile?.remove(widgetId);
    };
  }, [siteKey, onToken, onError]);

  return <div ref={containerRef} aria-label="Anti-bot verification" />;
}
