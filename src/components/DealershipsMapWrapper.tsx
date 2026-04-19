"use client";

import dynamic from "next/dynamic";

const DealershipsMap = dynamic(() => import("./DealershipsMap"), { ssr: false });

export default function DealershipsMapWrapper() {
  return <DealershipsMap />;
}
