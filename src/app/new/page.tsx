"use client";

import { useRouter } from "next/navigation";
import NewMeetingForm from "@/components/Meeting/NewMeetingForm";

export default function NewMeetingPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen p-6 max-w-md mx-auto">
      <button
        onClick={() => router.push("/")}
        className="text-slate-400 text-sm mb-4"
      >
        ← 뒤로
      </button>
      <h1 className="text-2xl font-bold mb-6">새 약속 만들기</h1>
      <NewMeetingForm />
    </main>
  );
}
