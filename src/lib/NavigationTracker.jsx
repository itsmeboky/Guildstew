import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function NavigationTracker() {
  const location = useLocation();

  useEffect(() => {
    // Future: track page views, analytics, etc.
    console.log("Page:", location.pathname);
  }, [location]);

  return null;
}