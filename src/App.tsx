import { useMemo, useState } from "react"
import {
  Radar, Search, ShieldAlert, RotateCcw, User, Users, Mail, AtSign, Phone,
  Globe, MapPin, Building2, Loader2, ExternalLink, Copy, FileDown, AlertTriangle,
  Info, Eye, EyeOff, CircleCheck, X, type LucideIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ConsentGate, type LegalBasis } from "@/components/ConsentGate"

/* ---------- Types (miroir du backend) ---------- */
type Item = {
  id: string; collector: string; type: string; title: string
  url: string | null; excerpt: string | null; detail: string[]
  source: string; collectedAt: string
  confidence: "fort" | "moyen" | "faible"
  reason: string; sensitivity: "public" | "potentiellement_personnel" | "sensible"
  found: boolean; status: string; recommendation: string
}
type Module = { id: string; label: string; input: string; found: number; total: number; items: Item[] }
type Report = { subject: Record<string, string | null>; ranAt: string; durationMs: number; methodology: string; identityNote: string; modules: Module[] }

type FieldKey = "nom" | "prenoms" | "username" | "email" | "telActuel" | "domaine" | "ville" | "employeur"
const FIELDS: { key: FieldKey; label: string; placeholder: string; icon: LucideIcon; type?: string }[] = [
  { key: "nom", label: "Nom", placeholder: "Dupont", icon: User },
  { key: "prenoms", label: "Prénom(s)", placeholder: "Jean", icon: Users },
  { key: "username", label: "Pseudo / Username", placeholder: "jdupont", icon: AtSign },
  { key: "email", label: "E-mail", placeholder: "jean@exemple.fr", icon: Mail, type: "email" },
  { key: "telActuel", label: "Téléphone", placeholder: "+33 6 12 34 56 78", icon: Phone, type: "tel" },
  { key: "domaine", label: "Domaine / site", placeholder: "exemple.fr", icon: Globe },
  { key: "ville", label: "Ville / Pays", placeholder: "Lyon, France", icon: MapPin },
  { key: "employeur", label: "Employeur / École", placeholder: "Société…", icon: Building2 },
]
const EMPTY = Object.fromEntries(FIELDS.map((f) => [f.key, ""])) as Record<FieldKey, string>

const BASIS_LABEL: Record<LegalBasis, string> = {
  self: "Ma propre empreinte numérique",
  consent: "Personne ayant donné son consentement",
  genealogy: "Recherche généalogique / familiale",
  professional: "Investigation professionnelle encadrée",
}

const API_BASE = typeof window !== "undefined" && /localhost|127\.0\.0\.1/.test(window.location.host) ? "https://limier.kdl-tech.fr" : ""

function confBadge(c: Item["confidence"]) {
  const v = c === "fort" ? "success" : c === "moyen" ? "warning" : "outline"
  return <Badge variant={v as "success" | "warning" | "outline"}>confiance {c}</Badge>
}
function sensBadge(s: Item["sensitivity"]) {
  if (s === "sensible") return <Badge variant="destructive">sensible</Badge>
  if (s === "potentiellement_personnel") return <Badge variant="warning">perso. possible</Badge>
  return <Badge variant="outline">public</Badge>
}

/* ---------- Carte de résultat ---------- */
function ResultCard({ it }: { it: Item }) {
  const [revealed, setRevealed] = useState(false)
  const sensitive = it.sensitivity === "sensible"
  const hidden = sensitive && !revealed
  const date = new Date(it.collectedAt).toLocaleString("fr-FR")
  const citation = `${it.title} — ${it.url ?? "(pas d'URL)"} — source : ${it.source} — collecté le ${date} — confiance ${it.confidence}`
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{it.title}</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {it.found && <Badge variant="success">{it.status}</Badge>}
          {!it.found && it.status !== "non trouvé" && <Badge variant="outline">{it.status}</Badge>}
          {confBadge(it.confidence)}
          {sensBadge(it.sensitivity)}
        </div>
      </div>

      {(it.excerpt || it.detail.length > 0) && (
        <div className="text-sm text-muted-foreground">
          {hidden ? (
            <span className="italic">Contenu sensible masqué — affichage à la demande.</span>
          ) : (
            <>
              {it.excerpt && <div>{it.excerpt}</div>}
              {it.detail.map((d, i) => (<div key={i} className="font-mono text-xs break-all">{d}</div>))}
            </>
          )}
        </div>
      )}

      <div className="font-mono text-xs text-muted-foreground">
        <span className="break-all">source : {it.source}</span> · <span>collecté {date}</span>
      </div>
      <div className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Pourquoi :</span> {it.reason}</div>
      <div className="text-xs"><span className="font-medium text-primary">Action :</span> {it.recommendation}</div>

      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        {it.url && !hidden && (
          <a href={it.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            Ouvrir la source <ExternalLink className="size-3.5" />
          </a>
        )}
        {sensitive && (
          <Button variant="ghost" size="sm" onClick={() => setRevealed((v) => !v)}>
            {revealed ? <><EyeOff /> Masquer</> : <><Eye /> Afficher (sensible)</>}
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => navigator.clipboard?.writeText(citation)}>
          <Copy /> Copier la citation
        </Button>
      </div>
    </div>
  )
}

/* ---------- À propos / Sources & limites ---------- */
function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="max-h-[85svh] w-full max-w-lg overflow-auto rounded-2xl border bg-card p-6 text-sm" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">À propos & usage responsable</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X /></Button>
        </div>
        <p className="mb-3 text-muted-foreground">
          <strong className="text-foreground">Limier</strong> est un assistant d'enquête en
          <strong className="text-foreground"> sources ouvertes</strong>, open-source (MIT). Il agrège uniquement de
          l'information <strong className="text-foreground">publique et légale</strong>, dans le respect du RGPD.
        </p>
        <h3 className="mb-1 mt-4 font-semibold">Ce que Limier fait</h3>
        <ul className="mb-3 list-disc pl-5 text-muted-foreground">
          <li>Présence d'un pseudo sur des plateformes publiques (API officielles).</li>
          <li>Domaine : RDAP/WHOIS, DNS (A/NS/TXT/MX) publics.</li>
          <li>E-mail : validation de syntaxe, MX du domaine, Gravatar public.</li>
          <li>Téléphone : normalisation E.164 uniquement (pays probable).</li>
          <li>Nom : requêtes légales prêtes à ouvrir (pas de scraping).</li>
        </ul>
        <h3 className="mb-1 mt-4 font-semibold">Ce que Limier ne fait pas</h3>
        <ul className="mb-3 list-disc pl-5 text-muted-foreground">
          <li>Pas de doxxing, surveillance, ni recherche d'adresse/téléphone privé d'un tiers.</li>
          <li>Pas de bases volées, pas de contournement de connexion, pas de reconnaissance faciale.</li>
          <li>Pas de profilage d'enfants.</li>
        </ul>
        <p className="text-xs text-muted-foreground">
          Limier <strong className="text-foreground">ne garantit pas l'identité</strong> : un même pseudo n'implique pas
          la même personne. Vérifiez toujours les sources.
        </p>
      </div>
    </div>
  )
}

function App() {
  const [form, setForm] = useState<Record<FieldKey, string>>(EMPTY)
  const [basis, setBasis] = useState<LegalBasis | null>(() => {
    try { const raw = localStorage.getItem("osint_consent"); return raw ? (JSON.parse(raw).basis as LegalBasis) : null } catch { return null }
  })
  const [scanning, setScanning] = useState(false)
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [about, setAbout] = useState(false)
  const [onlyFound, setOnlyFound] = useState(false)
  const [confFilter, setConfFilter] = useState<"tous" | "fort" | "moyen">("tous")

  const confirmBasis = (b: LegalBasis) => {
    localStorage.setItem("osint_consent", JSON.stringify({ basis: b, ts: new Date().toISOString() }))
    setBasis(b)
  }
  const setField = (k: FieldKey, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const hasQuery = useMemo(() => Object.values(form).some((v) => v.trim()), [form])
  const reset = () => { setForm(EMPTY); setReport(null); setError(null) }

  const launch = async () => {
    const payload = {
      username: form.username, email: form.email, domain: form.domaine, phone: form.telActuel,
      name: [form.nom, form.prenoms].filter(Boolean).join(" "), city: form.ville, employer: form.employeur,
    }
    if (!Object.values(payload).some((v) => v.trim())) { setError("Renseigne au moins un élément (pseudo, e-mail, domaine, téléphone ou nom)."); return }
    setScanning(true); setError(null); setReport(null)
    try {
      const r = await fetch(`${API_BASE}/api/search`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || `Erreur ${r.status}`)
      setReport(j as Report)
    } catch (e) { setError(e instanceof Error ? e.message : "Échec de la requête") }
    finally { setScanning(false) }
  }

  const filterItems = (items: Item[]) => items.filter((it) => {
    if (onlyFound && !it.found) return false
    if (confFilter !== "tous" && it.confidence !== confFilter) return false
    return true
  })

  const exportMarkdown = () => {
    if (!report) return
    const subj = Object.entries(report.subject).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(" · ")
    const lines = [
      "# Limier — Rapport d'enquête OSINT", "",
      `**Base légale déclarée :** ${basis ? BASIS_LABEL[basis] : "—"}`,
      `**Date de collecte :** ${new Date(report.ranAt).toLocaleString("fr-FR")}`,
      `**Sujet :** ${subj || "—"}`, "",
      `> ${report.identityNote}`, "",
      `**Méthodologie :** ${report.methodology}`, "",
      ...report.modules.flatMap((m) => [
        `## ${m.label} — ${m.found}/${m.total} trouvé(s)`,
        ...m.items.map((it) =>
          `- **${it.title}** — ${it.status} · confiance ${it.confidence} · sensibilité ${it.sensitivity}\n` +
          `  - URL : ${it.url ?? "—"}\n  - Source : ${it.source}\n  - Collecté : ${it.collectedAt}\n` +
          `  - Raison : ${it.reason}\n  - Action : ${it.recommendation}`),
        "",
      ]),
      "---", "*Limier ne garantit pas l'identité — vérifiez les sources. Sources publiques & légales uniquement (RGPD).*",
    ]
    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob); a.download = `limier_rapport_${Date.now()}.md`; a.click()
    URL.revokeObjectURL(a.href)
  }

  if (!basis) return <ConsentGate onConfirm={confirmBasis} />

  return (
    <div className="min-h-svh">
      {about && <AboutModal onClose={() => setAbout(false)} />}

      <header className="grid-scan border-b border-border/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-7 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="relative grid size-11 place-items-center rounded-xl bg-gradient-to-br from-primary/30 to-primary/5 ring-1 ring-primary/30">
              <Radar className="size-6 text-primary" />
              <span className="absolute inset-0 animate-ping rounded-xl ring-1 ring-primary/20" />
            </div>
            <div>
              <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">Limier <span className="font-mono text-xs text-muted-foreground">v1</span></h1>
              <p className="text-sm text-muted-foreground">Recherche OSINT légale en sources ouvertes</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success">Open-source</Badge>
            <Badge variant="outline" className="font-mono">MIT</Badge>
            <Button variant="ghost" size="sm" onClick={() => setAbout(true)}><Info /> À propos</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-5 py-7 lg:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-6">
          <div className="flex items-start gap-3 rounded-lg border border-chart-3/30 bg-chart-3/10 px-4 py-3 text-sm">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-chart-3" />
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Base légale :</span> {basis ? BASIS_LABEL[basis] : "—"}.
              Sources publiques uniquement · RGPD. <button className="underline" onClick={() => { localStorage.removeItem("osint_consent"); setBasis(null) }}>changer</button>
            </p>
          </div>

          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2"><Search className="size-4 text-primary" /> Éléments de recherche</CardTitle>
              <CardDescription>Pseudo, e-mail et domaine donnent de vrais résultats. Téléphone = normalisation. Nom = requêtes prêtes.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {FIELDS.map((f) => {
                  const Icon = f.icon
                  return (
                    <div key={f.key} className="flex flex-col gap-1.5">
                      <Label htmlFor={f.key}><Icon className="size-3.5" /> {f.label}</Label>
                      <Input id={f.key} type={f.type ?? "text"} placeholder={f.placeholder} value={form[f.key]}
                        onChange={(e) => setField(f.key, e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") launch() }} />
                    </div>
                  )
                })}
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button onClick={launch} disabled={scanning} size="lg">
                  {scanning ? (<><Loader2 className="animate-spin" /> Enquête…</>) : (<><Search /> Lancer l'enquête</>)}
                </Button>
                <Button variant="outline" onClick={reset} disabled={!hasQuery && !report}><RotateCcw /> Réinitialiser</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2"><CircleCheck className="size-4 text-primary" /> Rapport d'enquête</CardTitle>
                  <CardDescription>Résultats sourcés, datés, notés (confiance + sensibilité).</CardDescription>
                </div>
                {report && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant={onlyFound ? "secondary" : "ghost"} size="sm" onClick={() => setOnlyFound((v) => !v)}>Trouvés</Button>
                    <Button variant={confFilter === "fort" ? "secondary" : "ghost"} size="sm" onClick={() => setConfFilter((c) => c === "fort" ? "tous" : "fort")}>Confiance forte</Button>
                    <Button variant="secondary" size="sm" onClick={exportMarkdown}><FileDown /> Export .md</Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {error && (<div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" /><span>{error}</span></div>)}
              {!error && !report && !scanning && (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                  <div className="grid size-12 place-items-center rounded-full bg-muted"><Radar className="size-6 text-muted-foreground" /></div>
                  <p className="text-sm text-muted-foreground">Lance une enquête : le rapport sourcé s'affichera ici.</p>
                </div>
              )}
              {scanning && (<div className="flex flex-col items-center justify-center gap-3 py-12 text-center"><Loader2 className="size-7 animate-spin text-primary" /><p className="text-sm text-muted-foreground">Interrogation des sources publiques…</p></div>)}

              {report && !scanning && (
                <div className="flex flex-col gap-5">
                  <div className="flex items-start gap-2 rounded-lg border border-chart-3/30 bg-chart-3/10 px-4 py-3 text-sm">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-chart-3" /><p className="text-muted-foreground">{report.identityNote}</p>
                  </div>
                  {report.modules.map((m) => {
                    const items = filterItems(m.items)
                    if (items.length === 0) return null
                    return (
                      <div key={m.id} className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {m.label} <span className="text-muted-foreground/60">· {m.found}/{m.total} trouvé(s)</span>
                        </div>
                        {items.map((it) => (<ResultCard key={it.id} it={it} />))}
                      </div>
                    )
                  })}
                  <p className="border-t border-border/60 pt-3 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Méthodologie :</span> {report.methodology}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="flex flex-col gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Sources & limites</CardTitle><CardDescription>14 plateformes + DNS/RDAP.</CardDescription></CardHeader>
            <CardContent className="flex flex-col gap-2 text-xs text-muted-foreground">
              <p>✅ Pseudo (API publiques), domaine (RDAP/DNS), e-mail (syntaxe/MX/Gravatar).</p>
              <p>🟡 Téléphone : normalisation seule. Nom : requêtes à ouvrir.</p>
              <p>🚫 Pas de doxxing, bases volées, reconnaissance faciale, profilage d'enfants.</p>
              <Button variant="outline" size="sm" className="mt-1" onClick={() => setAbout(true)}><Info /> En savoir plus</Button>
            </CardContent>
          </Card>
        </aside>
      </main>

      <footer className="mx-auto max-w-6xl px-5 py-6 text-xs text-muted-foreground">
        <div className="flex flex-col items-center justify-between gap-2 border-t border-border/60 pt-5 sm:flex-row">
          <span>Limier — open-source (MIT) · KDL</span>
          <span>Sources publiques & légales · RGPD · ne garantit pas l'identité</span>
        </div>
      </footer>
    </div>
  )
}

export default App
