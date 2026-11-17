import { useEffect, useRef, useState } from 'react';
import { resolveVideoBlobUrl } from '../lib/videoStorage';

interface LoopingVideoProps {
  videoId?: string;
  directSrc?: string;
  fallbackImgSrc?: string;
  fallbackAlt?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function LoopingVideo({
  videoId,
  directSrc,
  fallbackImgSrc,
  fallbackAlt = '',
  className = 'w-full h-full object-cover',
  style,
}: LoopingVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(directSrc || null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);

    if (directSrc) {
      setResolvedUrl(directSrc);
      return;
    }

    if (!videoId) {
      setResolvedUrl(null);
      return;
    }

    resolveVideoBlobUrl(videoId).then((url) => {
      if (!cancelled) {
        setResolvedUrl(url);
        if (!url) setFailed(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [videoId, directSrc]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !resolvedUrl || failed) return;
    el.muted = true;
    el.defaultMuted = true;
    const playPromise = el.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        el.muted = true;
        el.play().catch(() => {
          setFailed(true);
        });
      });
    }
  }, [resolvedUrl, failed]);

  if ((!resolvedUrl || failed) && fallbackImgSrc) {
    return (
      <img
        src={fallbackImgSrc}
        alt={fallbackAlt}
        referrerPolicy="no-referrer"
        style={style}
        className={className}
      />
    );
  }

  if (!resolvedUrl) {
    return <div className="w-full h-full bg-[#F5F5F5]" />;
  }

  return (
    <video
      ref={videoRef}
      key={resolvedUrl}
      src={resolvedUrl}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      onCanPlay={(e) => {
        const vid = e.currentTarget;
        vid.muted = true;
        if (vid.paused) {
          vid.play().catch(() => {
            setFailed(true);
          });
        }
      }}
      onError={() => setFailed(true)}
      style={style}
      className={className}
    />
  );
}
