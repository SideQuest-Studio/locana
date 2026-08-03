import { redirect } from "next/navigation";
import { getUserProfile, getPostLoginPath } from "@/src/lib/auth/get-profile";

export default async function AuthRedirectPage() {
  const profile = await getUserProfile();
  if (!profile) redirect("/login");
  redirect(getPostLoginPath(profile));
}
