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
  ExternalLink,
  FileDown,
  AlertTriangle,
  Code,
  Gamepad2,
  Fingerprint,
  Link2,
  CircleCheck,
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
  | "nom" | "prenoms" | "email" | "username"
  | "telActuel" | "telAncien" | "ville" | "employeur" | "relations"

type Field = { key: FieldKey; label: string; placeholder: string; icon: LucideIcon; span?: 1 | 2; type?: string }

const FIELDS: Field[] = [
  { key: "nom", label: "Nom", placeholder: "Dupont", icon: User },
  { key: "prenoms", label: "Prénom(s)", placeholder: "Jean, Pierre", icon: Users },
  { key: "email", label: "E-mail", placeholder: "jean@exemple.fr", icon: Mail, type: "email" },
  { key: "username", label: "Pseudo / Username", placeholder: "jdupont", icon: AtSign },
  { key: "telActuel", label: "Téléphone actuel", placeholder: "+33 6 12 34 56 78", icon: Phone, type: "tel" },
  { key: "telAncien", label: "Téléphone ancien", placeholder: "ancien numéro", icon: History, type: "tel" },
  { key: "ville", label: "Ville / Pays", placeholder: "Lyon, France", icon: MapPin },
  { key: "employeur", label: "Employeur / École", placeholder: "Société, université…", icon: Building2 },
  { key: "relations", label: "Éléments liés (proches, relations)", placeholder: "Parent, conjoint… (un par ligne)", icon: Network, span: 2 },
]

const CAT_ICON: Record<string, LucideIcon> = {
  Dev: Code, Social: Users, Jeux: Gamepad2, Identité: Fingerprint, Autre: Link2,
}

type Hit = {
  platform: string; category: string; url: string; source: string
  found: boolean; confidence: string | null; signal: string
}
type Report = {
  subject: string; found: number; total: number; durationMs: number; ranAt: string
  methodology: string; identityNote: string; results: Hit[]
}

const EMPTY: Record<FieldKey, string> = {
  nom: "", prenoms: "", email: "", username: "",
  telActuel: "", telAncien: "", ville: "", employeur: "", relations: "",
}

const API_BASE =
  typeof window !== "undefined" && /localhost|127\.0\.0\.1/.test(window.location.host)
    ? "https://limier.kdl-tech.fr"
    : ""

function confBadge(c: string | null) {
  if (c === "confirmé") return <Badge variant="success">confirmé</Badge>
  if (c === "probable") return <Badge variant="warning">probable</Badge>
  return <Badge variant="outline">à vérifier</Badge>
}

function App() {
  const [form, setForm] = useState<Record<FieldKey, string>>(EMPTY)
  const [basis, setBasis] = useState<LegalBasis | null>(() => {
    try { const raw = localStorage.getItem("osint_consent"); return raw ? (JSON.parse(raw).basis as LegalBasis) : null } catch { return null }
  })
  const [scanning, setScanning] = useState(false)
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState<string | null>(null)

  const confirmBasis = (b: LegalBasis) => {
    localStorage.setItem("osint_consent", JSON.stringify({ basis: b, ts: new Date().toISOString() }))
    setBasis(b)
  }

  const hasQuery = useMemo(() => Object.values(form).some((v) => v.trim().length > 0), [form])
  const setField = (key: FieldKey, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const reset = () => { setForm(EMPTY); setReport(null); setError(null); setScanning(false) }

  const launch = async () => {
    const u = form.username.trim().replace(/^@/, "")
    if (!u) { setError("Renseigne un PSEUDO pour lancer la recherche réelle (les autres modules — e-mail, téléphone — arrivent ensuite)."); return }
    setScanning(true); setError(null); setReport(null)
    try {
      const r = await fetch(`${API_BASE}/api/search`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || `Erreur ${r.status}`)
      setReport(j as Report)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de la requête (réseau ?)")
    } finally { setScanning(false) }
  }

  const exportReport = () => {
    if (!report) return
    const found = report.results.filter((r) => r.found)
    const lines = [
      "LIMIER — RAPPORT D'ENQUÊTE (sources ouvertes)",
      "============================================",
      `Sujet (pseudo)   : ${report.subject}`,
      `Date             : ${new Date(report.ranAt).toLocaleString("fr-FR")}`,
      `Plateformes      : ${report.found} compte(s) confirmé(s) / ${report.total} vérifiées`,
      `Base légale      : ${basis}`,
      "",
      "MÉTHODOLOGIE",
      report.methodology,
      "",
      "NIVEAU DE CONFIANCE / IDENTITÉ",
      report.identityNote,
      "",
      "COMPTES TROUVÉS (avec source vérifiable)",
      ...found.map((r) => `- [${r.category}] ${r.platform} (${r.confidence})\n    profil : ${r.url}\n    source : ${r.source}  (${r.signal})`),
      "",
      "PLATEFORMES SANS COMPTE",
      report.results.filter((r) => !r.found).map((r) => r.platform).join(", "),
      "",
      "— Généré par Limier · https://limier.kdl-tech.fr",
    ]
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `limier_rapport_${report.subject}.txt`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const grouped = useMemo(() => {
    if (!report) return []
    const found = report.results.filter((r) => r.found)
    const cats = [...new Set(found.map((r) => r.category))]
    return cats.map((c) => ({ category: c, hits: found.filter((r) => r.category === c) }))
  }, [report])

  if (!basis) return <ConsentGate onConfirm={confirmBasis} />

  return (
    <div className="min-h-svh">
      {/* En-tête */}
      <header className="grid-scan border-b border-border/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-7 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="relative grid size-11 place-items-center rounded-xl bg-gradient-to-br from-primary/30 to-primary/5 ring-1 ring-primary/30">
              <Radar className="size-6 text-primary" />
              <span className="absolute inset-0 animate-ping rounded-xl ring-1 ring-primary/20" />
            </div>
            <div>
              <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
                Limier <span className="font-mono text-xs text-muted-foreground">v0.1</span>
              </h1>
              <p className="text-sm text-muted-foreground">Assistant d'enquête en sources ouvertes</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success">Open-source</Badge>
            <Badge variant="outline" className="font-mono">MIT</Badge>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-5 py-7 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          {/* Bandeau légal */}
          <div className="flex items-start gap-3 rounded-lg border border-chart-3/30 bg-chart-3/10 px-4 py-3 text-sm">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-chart-3" />
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Usage responsable.</span> Recherches licites
              uniquement (soi-même, personne consentante, cadre pro légitime). Sources publiques · RGPD.
            </p>
          </div>

          {/* Formulaire */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2"><Search className="size-4 text-primary" /> Éléments de recherche</CardTitle>
              <CardDescription>Module actif : <strong>pseudo</strong> (présence réelle sur plateformes publiques). Les autres arrivent.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {FIELDS.map((f) => {
                  const Icon = f.icon
                  const active = f.key === "username"
                  return (
                    <div key={f.key} className={cn("flex flex-col gap-1.5", f.span === 2 && "sm:col-span-2")}>
                      <Label htmlFor={f.key} className={active ? "text-primary" : undefined}>
                        <Icon className="size-3.5" /> {f.label}{active && " · actif"}
                      </Label>
                      <Input id={f.key} type={f.type ?? "text"} placeholder={f.placeholder}
                        value={form[f.key]} onChange={(e) => setField(f.key, e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") launch() }}
                        className={active ? "border-primary/40" : undefined} />
                    </div>
                  )
                })}
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button onClick={launch} disabled={scanning} size="lg">
                  {scanning ? (<><Loader2 className="animate-spin" /> Enquête en cours…</>) : (<><Search /> Lancer l'enquête</>)}
                </Button>
                <Button variant="outline" onClick={reset} disabled={!hasQuery && !report}><RotateCcw /> Réinitialiser</Button>
              </div>
            </CardContent>
          </Card>

          {/* Rapport */}
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2"><Network className="size-4 text-primary" /> Rapport d'enquête</CardTitle>
                  <CardDescription>Résultats classés, sourcés et notés en confiance.</CardDescription>
                </div>
                {report && (<Button variant="secondary" size="sm" onClick={exportReport}><FileDown /> Exporter</Button>)}
              </div>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" /><span>{error}</span>
                </div>
              )}

              {!error && !report && !scanning && (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                  <div className="grid size-12 place-items-center rounded-full bg-muted"><Radar className="size-6 text-muted-foreground" /></div>
                  <p className="text-sm text-muted-foreground">Saisis un pseudo et lance l'enquête. Le rapport s'affichera ici.</p>
                </div>
              )}

              {scanning && (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                  <Loader2 className="size-7 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Interrogation des sources publiques…</p>
                </div>
              )}

              {report && !scanning && (
                <div className="flex flex-col gap-5">
                  {/* Synthèse */}
                  <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-background/40 px-4 py-3">
                    <CircleCheck className="size-5 text-chart-2" />
                    <span className="text-sm">
                      <strong>{report.found}</strong> compte(s) confirmé(s) sur <strong>{report.total}</strong> plateformes ·{" "}
                      <span className="text-muted-foreground">pseudo « {report.subject} » · {report.durationMs} ms</span>
                    </span>
                  </div>

                  {/* Note d'identité (confiance) */}
                  <div className="flex items-start gap-2 rounded-lg border border-chart-3/30 bg-chart-3/10 px-4 py-3 text-sm">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-chart-3" />
                    <p className="text-muted-foreground">{report.identityNote}</p>
                  </div>

                  {/* Résultats groupés par catégorie */}
                  {grouped.length === 0 && (
                    <p className="text-sm text-muted-foreground">Aucun compte public trouvé pour ce pseudo sur les plateformes vérifiées.</p>
                  )}
                  {grouped.map((g) => {
                    const Icon = CAT_ICON[g.category] ?? Link2
                    return (
                      <div key={g.category} className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          <Icon className="size-3.5" /> {g.category} <span className="text-muted-foreground/60">· {g.hits.length}</span>
                        </div>
                        {g.hits.map((h) => (
                          <div key={h.platform} className="flex flex-col gap-1 rounded-md border border-border/60 bg-background/40 px-3 py-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium">{h.platform}</span>
                              <div className="flex items-center gap-2">
                                {confBadge(h.confidence)}
                                <a href={h.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                                  ouvrir <ExternalLink className="size-3.5" />
                                </a>
                              </div>
                            </div>
                            <div className="font-mono text-xs text-muted-foreground">
                              source : <span className="break-all">{h.source}</span> <span className="text-muted-foreground/60">({h.signal})</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })}

                  {/* Plateformes sans compte */}
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Sans compte :</span>{" "}
                    {report.results.filter((r) => !r.found).map((r) => r.platform).join(", ") || "—"}
                  </div>

                  {/* Méthodologie */}
                  <p className="border-t border-border/60 pt-3 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Méthodologie :</span> {report.methodology}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar : sources */}
        <aside className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sources interrogées</CardTitle>
              <CardDescription>Plateformes publiques vérifiées par le moteur.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              {["Dev", "Social", "Jeux", "Identité", "Autre"].map((c) => {
                const Icon = CAT_ICON[c] ?? Link2
                return (
                  <div key={c} className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-2">
                    <div className="grid size-7 place-items-center rounded-md bg-primary/10 text-primary"><Icon className="size-4" /></div>
                    <span className="font-medium">{c}</span>
                  </div>
                )
              })}
              <p className="pt-1 text-xs text-muted-foreground">14 plateformes · API/endpoints publics, sans authentification.</p>
            </CardContent>
          </Card>
        </aside>
      </main>

      <footer className="mx-auto max-w-6xl px-5 py-6 text-xs text-muted-foreground">
        <div className="flex flex-col items-center justify-between gap-2 border-t border-border/60 pt-5 sm:flex-row">
          <span>Limier — open-source (MIT) · KDL</span>
          <span className="flex items-center gap-1.5"><Fingerprint className="size-3.5" /> Traitement local, sources publiques, RGPD.</span>
        </div>
      </footer>
    </div>
  )
}

export default App
