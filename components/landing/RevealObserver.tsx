"use client";

import { useEffect } from "react";

/**
 * One observer for the whole page: elements with `data-reveal` fade up the
 * first time they enter the viewport. Hidden state only applies once JS runs
 * (`.cb-js`), so the page is fully visible without it.
 */
export function RevealObserver() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("cb-js");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.setAttribute("data-shown", "");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      root.classList.remove("cb-js");
    };
  }, []);
  return null;
}
