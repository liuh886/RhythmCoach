import { useEffect, useRef } from 'react';

const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

interface TurnstileApi {
  render: (container: HTMLElement, options: {
    sitekey: string;
    theme: 'auto';
    callback: (token: string) => void;
    'expired-callback': () => void;
    'error-callback': () => void;
  }) => string;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loader: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile?.render) return Promise.resolve(window.turnstile);
  if (loader) return loader;

  loader = new Promise<TurnstileApi>((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>('script[data-rhythmcoach-turnstile]');
    const finish = () => {
      if (window.turnstile?.render) resolve(window.turnstile);
      else reject(new Error('Turnstile API did not initialize.'));
    };
    const fail = () => reject(new Error('Turnstile API failed to load.'));

    if (!script) {
      script = document.createElement('script');
      script.src = TURNSTILE_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.dataset.rhythmcoachTurnstile = '';
      script.addEventListener('load', finish, { once: true });
      script.addEventListener('error', fail, { once: true });
      document.head.appendChild(script);
    } else {
      script.addEventListener('load', finish, { once: true });
      script.addEventListener('error', fail, { once: true });
    }
  }).catch((error) => {
    loader = null;
    throw error;
  });

  return loader;
}

export function TurnstileWidget({
  siteKey,
  onToken,
  onUnavailable
}: {
  siteKey: string;
  onToken: (token: string) => void;
  onUnavailable: (message: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);
  const onUnavailableRef = useRef(onUnavailable);
  onTokenRef.current = onToken;
  onUnavailableRef.current = onUnavailable;

  useEffect(() => {
    let active = true;
    let widgetId: string | null = null;

    void loadTurnstile()
      .then((turnstile) => {
        if (!active || !hostRef.current) return;
        widgetId = turnstile.render(hostRef.current, {
          sitekey: siteKey,
          theme: 'auto',
          callback: (token) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(''),
          'error-callback': () => onTokenRef.current('')
        });
      })
      .catch((error: unknown) => {
        if (!active) return;
        const message = error instanceof Error ? error.message : 'Turnstile unavailable.';
        onTokenRef.current('');
        onUnavailableRef.current(message);
      });

    return () => {
      active = false;
      onTokenRef.current('');
      if (widgetId && window.turnstile?.remove) {
        try {
          window.turnstile.remove(widgetId);
        } catch {
          // The widget may already have been removed with its host node.
        }
      }
    };
  }, [siteKey]);

  return <div ref={hostRef} className="membership-turnstile" aria-label="Security verification" />;
}
