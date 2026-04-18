import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto w-20 h-20 rounded-2xl bg-brand flex items-center justify-center text-4xl shadow-lg shadow-brand/30">
            📍
          </div>
          <h1 className="mt-6 text-3xl font-bold">Mapper</h1>
          <p className="mt-2 text-slate-400">
            친구들과 약속을 만들고 지도 위에서 서로를 실시간으로 확인하세요.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/new"
            className="block w-full py-3 rounded-xl bg-brand hover:bg-brand-dark transition font-semibold text-white"
          >
            새 약속 만들기
          </Link>
          <p className="text-sm text-slate-500">
            공유 링크를 받으셨나요? 그 링크를 열면 바로 참여됩니다.
          </p>
        </div>

        <div className="pt-6 border-t border-slate-800 text-xs text-slate-500 space-y-1">
          <p>완전 무료 · 오픈소스 · OpenStreetMap 기반</p>
          <p>© {new Date().getFullYear()} Mapper</p>
        </div>
      </div>
    </main>
  );
}
