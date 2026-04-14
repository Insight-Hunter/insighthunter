import { useState, type ReactNode } from 'react';

export function AccordionItem({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, marginBottom: 12 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{ width: '100%', textAlign: 'left', padding: 16, fontWeight: 600 }}
      >
        {title}
      </button>
      {open ? <div style={{ padding: '0 16px 16px' }}>{children}</div> : null}
    </div>
  );
}
