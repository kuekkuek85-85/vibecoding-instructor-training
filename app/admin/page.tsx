import { AdminDashboard } from "@/components/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = params.key;
  const provided = Array.isArray(raw) ? raw[0] : raw;
  const expected = process.env.ADMIN_KEY;

  if (!expected) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <h1 className="mb-3 text-xl font-bold">강사 대시보드</h1>
        <p className="rounded-lg border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
          <b>ADMIN_KEY</b>가 서버에 설정되어 있지 않습니다. <code>.env.local</code>에
          <code> ADMIN_KEY=...</code>를 추가하고 서버를 다시 시작해 주세요.
        </p>
      </main>
    );
  }

  if (provided !== expected) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <h1 className="mb-3 text-xl font-bold">강사 대시보드</h1>
        <p className="rounded-lg border border-warn/40 bg-warn/10 p-4 text-sm text-warn">
          접근 키가 필요합니다. 주소 뒤에 <code>?key=...</code>를 붙여 접속해 주세요.
        </p>
      </main>
    );
  }

  return <AdminDashboard />;
}
