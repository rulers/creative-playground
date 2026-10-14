"use client";

import { useEffect } from "react";
import { useShareInit } from "@/components/use-share-init";
import { getWorkById } from "@/data/works";

/** Opens the section a shared link points at (`?work=liminal|life`). Renders nothing. */
export function ShareScroll() {
  const { work } = useShareInit();

  useEffect(() => {
    if (!work) return;
    const section = getWorkById(work);
    if (!section) return;
    document.getElementById(section.sectionId)?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [work]);

  return null;
}
