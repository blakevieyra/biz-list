import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-sm text-muted">
        The page you&apos;re looking for doesn&apos;t exist or was removed.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent-hover"
      >
        Go home
      </Link>
    </div>
  );
}
