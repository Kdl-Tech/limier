import { useMemo, useState } from "react"
import {
  Radar,
  Search,
  ShieldAlert,
  RotateCcw,
  User,
  Users,
  Mail,
  AtSign,
  Phone,
  History,
  MapPin,
  Building2,
  Network,
  Loader2,
  CircleCheck,
  Clock,
  Hourglass,
  Globe,
  Image as ImageIcon,
  Database,
  Fingerprint,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ConsentGate, type LegalBasis } from "@/components/ConsentGate"

type FieldKey =
  | "nom"
  | "prenoms"
  | "email"
  | "username"
  | "telActuel"
  | "telAncien"
  | "ville"
  | "employeur"
  | "relations"

type Field = {
  key: FieldKey
  label: string
  placeholder: string
  icon: LucideIcon
  span?: 1 | 2
  type?: string
}

const FIELDS: Field[] = [
  { key: "nom", label: "Nom", placeholder: "Dupont", icon: User },
  { key: "prenoms", label: "Prénom(s)", placeholder: "Jean, Pierre", icon: Users },
  { key: "email", label: "E-mail", placeholder: "jean@exemple.fr", icon: Mail, type: "email" },
  { key: "username", label: "Pseudo / Username", placeholder: "jdupont", icon: AtSign },
  { key: "telActuel", label: "Téléphone actuel", placeholder: "+33 6 12 34 56 78", icon: Phone, type: "tel" },
  { key: "telAncien", label: "Téléphone ancien", placeholder: "ancien numéro", icon: History, type: "tel" },
  { key: "ville", label: "Ville / Pays", placeholder: "Lyon, France", icon: MapPin },
  { key: "employeur", label: "Employeur / École", placeholder: "Société, université…", icon: Building2 },
  {
    key: "relations",
    label: "Éléments liés (proches, relations)",
    placeholder: "Parent, conjoint, frère/sœur… (un par ligne)",
    icon: Network,
    span: 2,
  },
]

type ModuleKey =
  | "usernames"
  | "email"
  | "phone"
  | "domains"
  | "social"
  | "images"
  | "engines"

type Module = {
  key: ModuleKey
  label: string
  desc: string
  icon: LucideIcon
}

const MODULES: Module[] = [
  { key: "usernames", label: "Pseudos", desc: "Présence sur +400 plateformes", icon: Fingerprint },
  { key: "email", label: "E-mail & fuites", desc: "Comptes liés, bases compromises", icon: Mail },
  { key: "phone", label: "Téléphone (actuel/ancien)", desc: "Opérateur, comptes, annuaires", icon: Phone },
  { key: "domains", label: "Domaines / WHOIS", desc: "Sites, enregistrements", icon: Globe },
  { key: "social", label: "Réseaux sociaux", desc: "Profils publics reliés", icon: Users },
  { key: "images", label: "Recherche d'images", desc: "Reconnaissance inversée", icon: ImageIcon },
  { key: "engines", label: "Moteurs & archives", desc: "Google/Bing, Wayback", icon: Database },
]

type Status = "idle" | "queued" | "running" | "pending"

const STATUS_META: Record<Status, { label: string; icon: LucideIcon; cls: string }> = {
  idle: { label: "en veille", icon: Clock, cls: "text-muted-foreground" },
  queued: { label: "en file", icon: Hourglass, cls: "text-chart-3" },
  running: { label: "analyse…", icon: Loader2, cls: "text-primary" },
  pending: { label: "collecteur à brancher", icon: CircleCheck, cls: "text-chart-2" },
}

const EMPTY: Record<FieldKey, string> = {
  nom: "",
  prenoms: "",
  email: "",
  username: "",
  telActuel: "",
  telAncien: "",
  ville: "",
  employeur: "",
  relations: "",
}

function App() {
  const [form, setForm] = useState<Record<FieldKey, string>>(EMPTY)
  const [statuses, setStatuses] = useState<Record<ModuleKey, Status>>(
    () => Object.fromEntries(MODULES.map((m) => [m.key, "idle"])) as Record<ModuleKey, Status>
  )
  const [scanning, setScanning] = useState(false)
  const [basis, setBasis] = useState<LegalBasis | null>(() => {
    try {
      const raw = localStorage.getItem("osint_consent")
      return raw ? (JSON.parse(raw).basis as LegalBasis) : null
    } catch {
      return null
    }
  })

  const confirmBasis = (b: LegalBasis) => {
    localStorage.setItem(
      "osint_consent",
      JSON.stringify({ basis: b, ts: new Date().toISOString() })
    )
    setBasis(b)
  }

  const hasQuery = useMemo(
    () => Object.values(form).some((v) => v.trim().length > 0),
    [form]
  )

  const setField = (key: FieldKey, value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

  const reset = () => {
    setForm(EMPTY)
    setStatuses(Object.fromEntries(MODULES.map((m) => [m.key, "idle"])) as Record<ModuleKey, Status>)
    setScanning(false)
  }

  const launch = () => {
    if (!hasQuery || scanning) return
    setScanning(true)
    setStatuses(Object.fromEntries(MODULES.map((m) => [m.key, "queued"])) as Record<ModuleKey, Status>)

    MODULES.forEach((m, i) => {
      window.setTimeout(() => {
        setStatuses((s) => ({ ...s, [m.key]: "running" }))
      }, 350 + i * 550)
      window.setTimeout(() => {
        setStatuses((s) => ({ ...s, [m.key]: "pending" }))
        if (i === MODULES.length - 1) setScanning(false)
      }, 350 + i * 550 + 500)
    })
  }

  if (!basis) return <ConsentGate onConfirm={confirmBasis} />

  return (
    <div className="min-h-svh">
      {/* ---------- En-tête ---------- */}
      <header className="grid-scan border-b border-border/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-7 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="relative grid size-11 place-items-center rounded-xl bg-gradient-to-br from-primary/30 to-primary/5 ring-1 ring-primary/30">
              <Radar className="size-6 text-primary" />
              <span className="absolute inset-0 animate-ping rounded-xl ring-1 ring-primary/20" />
            </div>
            <div>
              <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
                Limier
                <span className="font-mono text-xs text-muted-foreground">v0.1</span>
              </h1>
              <p className="text-sm text-muted-foreground">
                Recherche d'empreinte numérique en sources ouvertes
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success">Open-source</Badge>
            <Badge variant="outline" className="font-mono">MIT</Badge>
            <Badge variant="outline" className="gap-1.5">
              <span className="size-1.5 rounded-full bg-chart-2" /> local-first
            </Badge>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-5 py-7 lg:grid-cols-[1fr_340px]">
        {/* ---------- Colonne principale ---------- */}
        <div className="flex flex-col gap-6">
          {/* Bandeau usage légal */}
          <div className="flex items-start gap-3 rounded-lg border border-chart-3/30 bg-chart-3/10 px-4 py-3 text-sm">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-chart-3" />
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Usage responsable.</span>{" "}
              Réservé aux recherches licites : votre propre empreinte, généalogie,
              ou investigation avec base légale. Le profilage d'un tiers sans
              consentement est interdit (RGPD).
            </p>
          </div>

          {/* Formulaire de recherche */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <Search className="size-4 text-primary" /> Éléments de recherche
              </CardTitle>
              <CardDescription>
                Renseignez un ou plusieurs éléments. Plus il y en a, plus le
                recoupement est précis.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {FIELDS.map((f) => {
                  const Icon = f.icon
                  return (
                    <div
                      key={f.key}
                      className={cn("flex flex-col gap-1.5", f.span === 2 && "sm:col-span-2")}
                    >
                      <Label htmlFor={f.key}>
                        <Icon className="size-3.5" /> {f.label}
                      </Label>
                      <Input
                        id={f.key}
                        type={f.type ?? "text"}
                        placeholder={f.placeholder}
                        value={form[f.key]}
                        onChange={(e) => setField(f.key, e.target.value)}
                      />
                    </div>
                  )
                })}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button onClick={launch} disabled={!hasQuery || scanning} size="lg">
                  {scanning ? (
                    <>
                      <Loader2 className="animate-spin" /> Analyse en cours…
                    </>
                  ) : (
                    <>
                      <Search /> Lancer la recherche
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={reset} disabled={!hasQuery && !scanning}>
                  <RotateCcw /> Réinitialiser
                </Button>
                {!hasQuery && (
                  <span className="text-sm text-muted-foreground">
                    Saisissez au moins un élément pour démarrer.
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Journal / résultats */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <Network className="size-4 text-primary" /> Journal d'investigation
              </CardTitle>
              <CardDescription>
                Suivi en temps réel des collecteurs interrogés.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!scanning && Object.values(statuses).every((s) => s === "idle") ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                  <div className="grid size-12 place-items-center rounded-full bg-muted">
                    <Radar className="size-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Aucune recherche lancée. Les résultats apparaîtront ici.
                  </p>
                </div>
              ) : (
                <ul className="flex flex-col gap-2 font-mono text-sm">
                  {MODULES.map((m) => {
                    const st = statuses[m.key]
                    const meta = STATUS_META[st]
                    const StIcon = meta.icon
                    return (
                      <li
                        key={m.key}
                        className="flex items-center justify-between rounded-md border border-border/60 bg-background/40 px-3 py-2"
                      >
                        <span className="flex items-center gap-2 text-foreground">
                          <m.icon className="size-4 text-muted-foreground" />
                          {m.label}
                        </span>
                        <span className={cn("flex items-center gap-1.5", meta.cls)}>
                          <StIcon className={cn("size-3.5", st === "running" && "animate-spin")} />
                          {meta.label}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ---------- Colonne latérale : modules ---------- */}
        <aside className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Collecteurs</CardTitle>
              <CardDescription>Sources interrogées par le moteur.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2.5">
              {MODULES.map((m) => (
                <div
                  key={m.key}
                  className="flex items-start gap-3 rounded-lg border border-border/60 p-3"
                >
                  <div className="grid size-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                    <m.icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{m.label}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.desc}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>
      </main>

      <footer className="mx-auto max-w-6xl px-5 py-6 text-xs text-muted-foreground">
        <div className="flex flex-col items-center justify-between gap-2 border-t border-border/60 pt-5 sm:flex-row">
          <span>Limier — open-source (MIT) · KDL</span>
          <span className="flex items-center gap-1.5">
            <Fingerprint className="size-3.5" /> Données traitées localement, dans le respect du RGPD.
          </span>
        </div>
      </footer>
    </div>
  )
}

export default App
