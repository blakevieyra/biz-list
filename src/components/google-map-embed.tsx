export function GoogleMapEmbed({
  name,
  city,
  state,
  zipCode,
}: {
  name: string;
  city: string;
  state: string;
  zipCode?: string;
}) {
  const query = encodeURIComponent(
    [name, city, state, zipCode].filter(Boolean).join(", "),
  );

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <iframe
        title={`Map for ${name}`}
        src={`https://maps.google.com/maps?q=${query}&z=14&output=embed`}
        className="h-64 w-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${query}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block border-t border-border bg-slate-50 px-4 py-2 text-center text-sm font-medium text-accent hover:underline"
      >
        Open in Google Maps
      </a>
    </div>
  );
}
