import Link from "next/link";

export type HomeHubView = "overview" | "activity";

export function HomeHubNav({ active }: { active: HomeHubView }) {
  const tabs: { id: HomeHubView; label: string; href: string }[] = [
    { id: "overview", label: "Overview", href: "/home" },
    { id: "activity", label: "Activity", href: "/home?view=activity" },
  ];

  return (
    <nav className="mb-8 flex gap-1 border-b border-border">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition ${
            active === tab.id
              ? "border-accent text-accent"
              : "border-transparent text-muted hover:border-border hover:text-foreground"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
