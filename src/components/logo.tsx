import Image from "next/image";
import Link from "next/link";

export function Logo({
  size = "md",
  showText = true,
  href = "/",
}: {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  href?: string;
}) {
  const heights = { sm: 28, md: 36, lg: 48 };
  const h = heights[size];

  const content = (
    <span className="inline-flex items-center gap-2">
      <Image
        src="/allconnect-logo.png"
        alt="AllConnect"
        width={Math.round(h * 2.2)}
        height={h}
        className="h-auto w-auto object-contain"
        priority
      />
      {!showText && <span className="sr-only">AllConnect</span>}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex shrink-0 items-center">
        {content}
      </Link>
    );
  }

  return content;
}

export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/allconnect-logo.png"
      alt="AllConnect"
      width={160}
      height={72}
      className={`mx-auto h-auto w-40 max-w-full object-contain ${className}`}
      priority
    />
  );
}
