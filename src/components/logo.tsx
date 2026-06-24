import Image from "next/image";
import Link from "next/link";

const LOGO_SIZES = {
  sm: { width: 72, height: 18, className: "h-[18px] w-auto max-w-[72px]" },
  md: { width: 88, height: 22, className: "h-[22px] w-auto max-w-[88px]" },
  lg: { width: 104, height: 26, className: "h-[26px] w-auto max-w-[104px]" },
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
        width={96}
        height={24}
        className="mx-auto h-[24px] w-auto max-w-[96px] object-contain"
      />
    </div>
  );
}
