import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="border-b border-gray-800 bg-claw-darker/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-claw-orange font-bold text-xl hover:opacity-80 transition-opacity"
        >
          <span className="text-2xl">🦞</span>
          <span>ClawChess</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/leaderboard"
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            Leaderboard
          </Link>
          <Link
            href="/SKILL.md"
            target="_blank"
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            API Docs
          </Link>
        </div>
      </div>
    </nav>
  );
}
