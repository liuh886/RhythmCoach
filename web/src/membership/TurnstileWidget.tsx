import './TurnstileWidget.css';
import { useEffect, useRef, useState } from 'react';

const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

type VerificationState = 'loading' | 'challenge' | 'verified' | 'error';

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
  const [state, setState] = useState<VerificationState>('loading');
  const [attempt, setAttempt] = useState(0);
  onTokenRef.current = onToken;
  onUnavailableRef.current = onUnavailable;

  useEffect(() => {
    let active = true;
    let widgetId: string | null = null;
    setState('loading');

    void loadTurnstile()
      .then((turnstile) => {
        if (!active || !hostRef.current) return;
        setState('challenge');
        widgetId = turnstile.render(hostRef.current, {
          sitekey: siteKey,
          theme: 'auto',
          callback: (token) => {
            if (!active) return;
            setState(token ? 'verified' : 'challenge');
            onTokenRef.current(token);
          },
          'expired-callback': () => {
            if (!active) return;
            setState('challenge');
            onTokenRef.current('');
          },
          'error-callback': () => {
            if (!active) return;
            setState('error');
            onTokenRef.current('');
            onUnavailableRef.current('Turnstile verification failed.');
          }
        });
      })
      .catch((error: unknown) => {
        if (!active) return;
        const message = error instanceof Error ? error.message : 'Turnstile unavailable.';
        setState('error');
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
  }, [attempt, siteKey]);

  const isChinese = document.documentElement.lang.toLowerCase().startsWith('zh');
  const loadingLabel = isChinese ? '正在完成安全验证…' : 'Completing security verification…';
  const verifiedLabel = isChinese ? '安全验证已完成' : 'Security verification complete';
  const retryLabel = isChinese ? '重试安全验证' : 'Retry security verification';

  return (
    <div
      className={`membership-turnstile is-${state}`}
      aria-label={isChinese ? '安全验证' : 'Security verification'}
      aria-live="polite"
      aria-busy={state === 'loading'}
    >
      <div ref={hostRef} className="turnstile-host" />
      {state === 'loading' && <span className="turnstile-status">{loadingLabel}</span>}
      {state === 'verified' && <span className="turnstile-status is-verified">✓ {verifiedLabel}</span>}
      {state === 'error' && (
        <button type="button" className="turnstile-retry" onClick={() => setAttempt((value) => value + 1)}>
          {retryLabel}
        </button>
      )}
    </div>
  );
}
