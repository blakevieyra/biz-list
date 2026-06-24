import Image from "next/image";
import Link from "next/link";

const LOGO_SIZES = {
  sm: { width: 140, height: 36, className: "h-9 w-auto max-w-[140px]" },
  md: { width: 180, height: 46, className: "h-[46px] w-auto max-w-[180px]" },
  lg: { width: 220, height: 56, className: "h-14 w-auto max-w-[220px]" },
} as const;

export function Logo({
  size = "md",
  showText = true,
  href = "/",
}: {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  href?: string;
}) {
  const dims = LOGO_SIZES[size];

  const content = (
    <Image
      src="/bizlist-logo.png"
      alt={showText ? "BizList" : "BizList home"}
      width={dims.width}
      height={dims.height}
      className={`object-contain ${dims.className}`}
      priority={size === "md"}
    />
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
    <div className={`text-center ${className}`}>
      <Image
        src="/bizlist-logo.png"
        alt="BizList"
        width={160}
        height={40}
        className="mx-auto h-12 w-auto max-w-[200px] object-contain"
      />
    </div>
  );
}
