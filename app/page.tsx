"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Dashboard from "./dashboard";

export default function Home() {
  const supabase = createClient();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) window.location.assign("/login");
      else setReady(true);
    });
  }, [supabase]);

  if (!ready) return <main style={{minHeight:"100vh",display:"grid",placeItems:"center"}}>Loading Inbux...</main>;
  return <Dashboard />;
}
