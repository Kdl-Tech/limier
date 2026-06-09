import { useState } from "react"
import { Scale, ShieldCheck, User, UserCheck, Users, Briefcase, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export type LegalBasis = "self" | "consent" | "genealogy" | "professional"

const OPTIONS: { key: LegalBasis; label: string; desc: string; icon: LucideIcon }[] = [
  { key: "self", label: "Ma propre empreinte numérique", desc: "Je recherche des informations qui me concernent moi-même.", icon: User },
  { key: "consent", label: "Personne ayant donné son consentement", desc: "La personne concernée m'a donné son accord explicite.", icon: UserCheck },
  { key: "genealogy", label: "Recherche généalogique / familiale non intrusive", desc: "Retrouver de la famille, ascendance — sans surveillance ni intrusion.", icon: Users },
  { key: "professional", label: "Investigation professionnelle encadrée", desc: "Journalisme, conformité, enquête avec base légale (RGPD, art. 6).", icon: Briefcase },
]

export function ConsentGate({ onConfirm }: { onConfirm: (basis: LegalBasis) => void }) {
  const [basis, setBasis] = useState<LegalBasis | null>(null)
  const [agreed, setAgreed] = useState(false)

  return (
    <div className="grid min-h-svh place-items-center p-5">
      <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-2xl">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-primary/15 text-primary">
            <Scale className="size-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Base légale de la recherche</h2>
            <p className="text-sm text-muted-foreground">
              Obligatoire avant toute recherche (RGPD).
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          {OPTIONS.map((o) => {
            const Icon = o.icon
            const active = basis === o.key
            return (
              <button
                key={o.key}
                type="button"
                onClick={() => setBasis(o.key)}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors cursor-pointer",
                  active
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-accent/40"
                )}
              >
                <Icon className={cn("mt-0.5 size-5 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                <div>
                  <p className="text-sm font-medium">{o.label}</p>
                  <p className="text-xs text-muted-foreground">{o.desc}</p>
                </div>
              </button>
            )
          })}
        </div>

        <label className="mt-4 flex items-start gap-2.5 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 size-4 accent-primary"
          />
          <span>
            Je confirme avoir une <strong className="text-foreground">base légale</strong> pour cette recherche et je
            m'engage à ne pas utiliser Limier pour <strong className="text-foreground">harceler, profiler illégalement,
            doxxer ou surveiller</strong> une personne.
          </span>
        </label>

        <Button
          className="mt-5 w-full"
          size="lg"
          disabled={!basis || !agreed}
          onClick={() => basis && onConfirm(basis)}
        >
          <ShieldCheck /> Confirmer et accéder
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Votre choix est horodaté et journalisé localement.
        </p>
      </div>
    </div>
  )
}
