import { useState } from 'react';

export function ImageWithFallback(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={props.alt || 'Image unavailable'}
        style={{
          display: 'grid',
          placeItems: 'center',
          background: '#f3f4f6',
          color: '#6b7280',
          minHeight: 120,
          borderRadius: 12,
        }}
      >
        Image unavailable
      </div>
    );
  }

  return <img {...props} onError={() => setFailed(true)} />;
}
