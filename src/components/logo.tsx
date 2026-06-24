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
  const heights = { sm: 28, md: 36, lg: 44 };

  const content = (
    <Image
      src="/bizlist-logo.png"
      alt={showText ? "BizList" : "BizList home"}
      width={160}
      height={heights[size]}
      className="h-auto w-auto max-w-[140px] object-contain sm:max-w-[160px]"
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
        width={180}
        height={120}
        className="mx-auto h-auto w-[140px] object-contain"
      />
    </div>
  );
}
