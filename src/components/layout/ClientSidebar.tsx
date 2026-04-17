"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "./Sidebar";
import { createClient } from "@/lib/supabase/client";

const BASE_NAV = [
  { label: "Citas", href: "/client/appointments", icon: "calendar" },
  { label: "Notificaciones", href: "/client/notifications", icon: "bell" },
  { label: "Mi Perfil", href: "/client/profile", icon: "user" },
];

export default function ClientSidebar() {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchCount = useCallback(async () => {
    const supabase = createClient();
    let userId: string | null = null;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      userId = user.id;
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      userId = session?.user?.id ?? null;
    }
    if (!userId) return;

    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false);

    setUnreadCount(count || 0);
  }, []);

  useEffect(() => {
    fetchCount();

    const supabase = createClient();
    const channel = supabase
      .channel("client-sidebar-badge")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => { fetchCount(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchCount]);

  const items = BASE_NAV.map((item) =>
    item.icon === "bell" && unreadCount > 0
      ? { ...item, badge: unreadCount }
      : item
  );

  return <Sidebar items={items} />;
}
