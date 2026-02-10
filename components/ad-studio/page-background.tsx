"use client";

export function PageBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-30%,rgba(139,92,246,0.12),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_20%,rgba(99,102,241,0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_20%_80%,rgba(139,92,246,0.06),transparent_50%)]" />
      <div className="absolute top-1/3 left-1/4 w-[480px] h-[480px] bg-violet-500/8 rounded-full blur-[140px]" />
      <div className="absolute bottom-1/3 right-1/4 w-[420px] h-[420px] bg-indigo-500/7 rounded-full blur-[120px]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,transparent_60%,rgba(10,10,11,0.4)_100%)]" />
    </div>
  );
}
