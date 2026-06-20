import type { RecommendedPhone } from "@/src/types/recommendation";

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
}

function formatScore(score: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
  }).format(score);
}

type RecommendationCardProps = {
  phone: RecommendedPhone;
  rank: number;
};

const rankStyles = [
  "from-violet-500/20 to-fuchsia-500/10 ring-violet-500/30 text-violet-200",
  "from-emerald-500/20 to-cyan-500/10 ring-emerald-500/30 text-emerald-200",
  "from-amber-500/20 to-orange-500/10 ring-amber-500/30 text-amber-200",
];

export function RecommendationCard({ phone, rank }: RecommendationCardProps) {
  const rankStyle = rankStyles[rank - 1] ?? rankStyles[0];

  return (
    <article className="group rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 backdrop-blur-sm transition hover:-translate-y-1 hover:border-zinc-700 hover:shadow-xl hover:shadow-violet-950/20">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ring-1 ${rankStyle}`}
          >
            #{rank}
          </span>
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-violet-300">
              {phone.brand}
            </p>
            <h3 className="mt-1 text-xl font-semibold text-white">{phone.model}</h3>
          </div>
        </div>
        <span className="rounded-full bg-violet-500/15 px-3 py-1 text-sm font-semibold text-violet-200">
          {formatPrice(phone.price)}
        </span>
      </div>

      {phone.image_url && phone.image_url.trim() !== "" && (
        <div className="relative w-full h-40 mb-4 rounded-xl overflow-hidden bg-zinc-950/40 border border-zinc-800/80 p-2 flex items-center justify-center">
          <img
            src={phone.image_url}
            alt={`${phone.brand} ${phone.model}`}
            loading="lazy"
            className="h-full w-auto object-contain transition duration-300 group-hover:scale-105"
          />
        </div>
      )}

      <dl className="space-y-3 text-sm">
        <div className="flex items-center justify-between gap-4 border-t border-zinc-800 pt-3">
          <dt className="text-zinc-500">Chipset</dt>
          <dd className="text-right font-medium text-zinc-200">{phone.chipset}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-zinc-800 pt-3">
          <dt className="text-zinc-500">Battery</dt>
          <dd className="text-right font-medium text-zinc-200">{phone.battery}</dd>
        </div>
        {phone.camera && (
          <div className="flex items-center justify-between gap-4 border-t border-zinc-800 pt-3">
            <dt className="text-zinc-500">Camera Specs</dt>
            <dd className="text-right font-medium text-zinc-200">{phone.camera}</dd>
          </div>
        )}
        {phone.display && (
          <div className="flex items-center justify-between gap-4 border-t border-zinc-800 pt-3">
            <dt className="text-zinc-500">Display</dt>
            <dd className="text-right font-medium text-zinc-200">{phone.display}</dd>
          </div>
        )}
        <div className="flex items-center justify-between gap-4 border-t border-zinc-800 pt-3">
          <dt className="text-zinc-500">Total Score</dt>
          <dd className="text-right text-base font-semibold text-fuchsia-300">
            {formatScore(phone.recommendationScore)}
          </dd>
        </div>
      </dl>
    </article>
  );
}
