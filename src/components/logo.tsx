import Image from "next/image";
import Link from "next/link";

const LOGO_SIZES = {
  sm: { width: 160, height: 42, className: "h-10 w-auto max-w-[160px]" },
  md: { width: 200, height: 52, className: "h-12 w-auto max-w-[200px]" },
  lg: { width: 260, height: 68, className: "h-16 w-auto max-w-[260px]" },
  xl: { width: 300, height: 78, className: "h-20 w-auto max-w-[300px]" },
} as const;

export function Logo({
  size = "md",
  showText = true,
  href = "/",
}: {
  size?: "sm" | "md" | "lg" | "xl";
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

const MARK_SIZES = {
  md: { width: 240, height: 62, className: "h-16 w-auto max-w-[280px]" },
  lg: { width: 300, height: 78, className: "h-20 w-auto max-w-[320px]" },
  xl: { width: 340, height: 88, className: "h-24 w-auto max-w-[360px]" },
} as const;

export function LogoMark({
  className = "",
  size = "lg",
}: {
  className?: string;
  size?: keyof typeof MARK_SIZES;
}) {
  const dims = MARK_SIZES[size];

  return (
    <div className={`text-center ${className}`}>
      <Image
        src="/bizlist-logo.png"
        alt="BizList"
        width={dims.width}
        height={dims.height}
        className={`mx-auto object-contain ${dims.className}`}
        priority
      />
    </div>
  );
}
