import Image from "next/image";
import Link from "next/link";

const LOGO_SIZES = {
  sm: { width: 120, height: 30, className: "h-[30px] w-auto max-w-[120px]" },
  md: { width: 148, height: 38, className: "h-[38px] w-auto max-w-[148px]" },
  lg: { width: 176, height: 44, className: "h-[44px] w-auto max-w-[176px]" },
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
        className="mx-auto h-[40px] w-auto max-w-[160px] object-contain"
      />
    </div>
  );
}
