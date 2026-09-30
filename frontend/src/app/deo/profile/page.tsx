"use client";

import { useMe } from "@/components/layout/dashboard-shell";
import { ProfileView } from "@/features/users/profile-view";

export default function DeoProfilePage() {
  const me = useMe();
  return <ProfileView userId={me.id} withBank />;
}
