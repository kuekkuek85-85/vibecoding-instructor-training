import { AdminDashboard } from "@/components/AdminDashboard";

export const dynamic = "force-dynamic";

function Gate({ tone, children }: { tone: "coral" | "cream"; children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <p className="t-caption mb-4 opacity-50">Instructor</p>
      <h1 className="t-display-lg mb-8">강사 대시보드</h1>
      <div className={`rounded-lg p-8 ${tone === "coral" ? "bg-coral" : "bg-cream"}`}>
        <p className="t-body">{children}</p>
      </div>
    </main>
  );
}

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
      <Gate tone="coral">
        <b>ADMIN_KEY</b>가 서버에 설정되어 있지 않습니다. <code>.env.local</code>에{" "}
        <code>ADMIN_KEY=...</code>를 추가하고 서버를 다시 시작해 주세요.
      </Gate>
    );
  }

  if (provided !== expected) {
    return (
      <Gate tone="cream">
        접근 키가 필요합니다. 주소 뒤에 <code>?key=...</code>를 붙여 접속해 주세요.
      </Gate>
    );
  }

  return <AdminDashboard />;
}
