import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

function findPrompterTopbar(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.prompter-topbar');
}

export function PrompterTopbarPortal({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(findPrompterTopbar);

  useEffect(() => {
    if (target && document.body.contains(target)) return;

    const syncTarget = () => {
      const nextTarget = findPrompterTopbar();
      if (nextTarget) setTarget(nextTarget);
    };

    syncTarget();
    const observer = new MutationObserver(syncTarget);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [target]);

  if (!target || !document.body.contains(target)) return null;
  return createPortal(children, target);
}
