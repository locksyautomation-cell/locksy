"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const DealershipsMap = dynamic(() => import("./DealershipsMap"), { ssr: false });

export default function DealershipsMapWrapper() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {visible ? (
        <DealershipsMap />
      ) : (
        <div className="flex items-center justify-center h-[480px] rounded-xl border border-border bg-muted/30">
          <div className="animate-spin h-8 w-8 border-2 border-navy border-t-transparent rounded-full" />
        </div>
      )}
    </div>
  );
}
