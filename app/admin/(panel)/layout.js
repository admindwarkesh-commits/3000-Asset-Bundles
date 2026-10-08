import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminShell from "../../../components/admin/AdminShell";
import { ADMIN_COOKIE, verifySession } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }) {
  const jar = await cookies();
  const session = verifySession(jar.get(ADMIN_COOKIE)?.value);
  if (!session) redirect("/admin/login");
  return <AdminShell email={session.email}>{children}</AdminShell>;
}
