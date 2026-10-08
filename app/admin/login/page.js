import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LoginForm from "../../../components/admin/LoginForm";
import { ADMIN_COOKIE, verifySession } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const jar = await cookies();
  if (verifySession(jar.get(ADMIN_COOKIE)?.value)) redirect("/admin");
  return <LoginForm />;
}
