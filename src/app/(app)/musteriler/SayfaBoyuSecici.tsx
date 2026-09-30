"use client";

import { useRouter, useSearchParams } from "next/navigation";

const SECENEKLER = [10, 25, 50];

export function SayfaBoyuSecici({ mevcut }: { mevcut: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "10") params.delete("boyut");
    else params.set("boyut", value);
    params.delete("sayfa");
    router.push(`/musteriler?${params.toString()}`);
  }

  return (
    <label className="filter-select">
      Sayfa başına
      <select value={String(mevcut)} onChange={(e) => onChange(e.target.value)}>
        {SECENEKLER.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  );
}
