import Image from "next/image";
import Link from "next/link";

const LOGO_SIZES = {
  sm: { width: 160, height: 42, className: "h-10 w-auto max-w-[160px]" },
  md: { width: 220, height: 58, className: "h-14 w-auto max-w-[220px]" },
  lg: { width: 280, height: 74, className: "h-[4.5rem] w-auto max-w-[280px]" },
  xl: { width: 340, height: 88, className: "h-24 w-auto max-w-[340px]" },
  "2xl": { width: 400, height: 104, className: "h-28 w-auto max-w-[400px]" },
} as const;

export function Logo({
  size = "md",
  showText = true,
  href = "/",
}: {
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  showText?: boolean;
  href?: string;
}) {
  const dims = LOGO_SIZES[size];

  const content = (
    <Image
      src="/BizList-logo.png"
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
  md: { width: 280, height: 74, className: "h-[4.5rem] w-auto max-w-[320px]" },
  lg: { width: 340, height: 88, className: "h-24 w-auto max-w-[380px]" },
  xl: { width: 400, height: 104, className: "h-28 w-auto max-w-[420px]" },
  "2xl": { width: 460, height: 120, className: "h-32 w-auto max-w-[480px]" },
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
        src="/BizList-logo.png"
        alt="BizList"
        width={dims.width}
        height={dims.height}
        className={`mx-auto object-contain ${dims.className}`}
        priority
      />
    </div>
  );
}
