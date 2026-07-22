"use client";

import {
  Building2,
  Check,
  CircleDotDashed,
  ExternalLink,
  Layers3,
  Loader2,
  MapPin,
  MousePointer2,
  Pentagon,
  RotateCcw,
  Save,
  Search,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { DiscoveryMap } from "@/components/map/discovery-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { DiscoverySearchInput } from "@/features/discovery/schemas";
import type {
  DiscoveryCandidate,
  DiscoverySearchResponse,
  ImportResult,
} from "@/features/discovery/types";
import { cn } from "@/lib/utils";
import type { SavedSearchRow } from "@/types/database";

const categories = [
  "",
  "Agence de communication",
  "Cabinet d’avocats",
  "Banque",
  "Cabinet de conseil",
  "Agence immobilière",
  "Startup",
  "Siège social",
  "Agence événementielle",
  "Entreprise de luxe",
];

interface ExplorerWorkbenchProps {
  canImport: boolean;
  canSave: boolean;
  initialResponse: DiscoverySearchResponse;
  initialSearch: DiscoverySearchInput;
  savedSearches: SavedSearchRow[];
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "La requête n’a pas abouti.");
  return payload as T;
}

function CandidateRow({
  candidate,
  canImport,
  focused,
  selected,
  onFocus,
  onImport,
  onSelect,
  importing,
}: {
  candidate: DiscoveryCandidate;
  canImport: boolean;
  focused: boolean;
  selected: boolean;
  onFocus: () => void;
  onImport: () => void;
  onSelect: () => void;
  importing: boolean;
}) {
  return (
    <article
      className={cn("border-b border-border p-4 last:border-b-0", focused && "bg-accent/35")}
    >
      <div className="flex items-start gap-3">
        <label
          className="mt-1 grid size-5 shrink-0 place-items-center"
          aria-label={`Sélectionner ${candidate.tradeName}`}
        >
          <input
            type="checkbox"
            checked={selected}
            onChange={onSelect}
            className="size-4 accent-primary"
          />
        </label>
        <button
          type="button"
          onClick={onFocus}
          className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-lg font-semibold tracking-[-0.03em]">
              {candidate.tradeName}
            </h3>
            {candidate.importedCompanyId ? <Badge>Importée</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {candidate.subsector} · {candidate.employeeRange}
          </p>
          <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
            {candidate.addressLine1}, {candidate.postalCode}
          </p>
        </button>
        <div className="text-right">
          <p className="font-display text-xl font-semibold tabular-nums">
            {candidate.potentialScore}
          </p>
          <p className="font-data text-[0.55rem] uppercase tracking-[0.12em] text-muted-foreground">
            score
          </p>
        </div>
      </div>
      {focused ? (
        <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="text-xs leading-5 text-muted-foreground">
            <p>
              {candidate.phone ?? "Téléphone indisponible"} ·{" "}
              {candidate.websiteUrl ? "site disponible" : "sans site"}
            </p>
            <p>
              Distance :{" "}
              {candidate.distanceMeters
                ? `${(candidate.distanceMeters / 1000).toFixed(1)} km`
                : "zone dessinée"}
            </p>
            <p className="font-data mt-1 uppercase tracking-[0.1em]">
              Source · mock_places · {Math.round(candidate.confidence * 100)} %
            </p>
          </div>
          {candidate.importedCompanyId ? (
            <Link
              href={`/companies/${candidate.importedCompanyId}`}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-semibold"
            >
              <ExternalLink className="size-3.5" aria-hidden="true" />
              Ouvrir la fiche
            </Link>
          ) : (
            <Button size="sm" onClick={onImport} disabled={!canImport || importing}>
              {importing ? (
                <Loader2
                  className="size-3.5 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <Building2 className="size-3.5" aria-hidden="true" />
              )}
              Importer
            </Button>
          )}
        </div>
      ) : null}
    </article>
  );
}

export function ExplorerWorkbench({
  canImport,
  canSave,
  initialResponse,
  initialSearch,
  savedSearches,
}: ExplorerWorkbenchProps) {
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [response, setResponse] = useState(initialResponse);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [focusedId, setFocusedId] = useState<string | null>(
    initialResponse.results[0]?.externalId ?? null,
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");
  const [saveName, setSaveName] = useState("");
  const center = searchInput.center ?? { latitude: 48.8667, longitude: 2.3333 };
  const polygon = searchInput.polygon ?? [];
  const radiusMeters = searchInput.radiusMeters ?? 4_500;
  const selectedAvailable = useMemo(
    () =>
      response.results.filter(
        (candidate) => selectedIds.includes(candidate.externalId) && !candidate.importedCompanyId,
      ),
    [response.results, selectedIds],
  );

  async function runSearch() {
    if (searchInput.mode === "polygon" && polygon.length < 3) {
      setMessage("Ajoutez au moins trois points sur la carte avant de lancer la recherche.");
      return;
    }
    setBusy("search");
    setMessage("");
    try {
      const next = await postJson<DiscoverySearchResponse>("/api/discovery/search", searchInput);
      setResponse(next);
      setFocusedId(next.results[0]?.externalId ?? null);
      setSelectedIds([]);
      setMessage(`${next.total} société(s) fictive(s) trouvée(s).`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Recherche indisponible.");
    } finally {
      setBusy(null);
    }
  }

  function markImported(externalId: string, result: ImportResult) {
    setResponse((current) => ({
      ...current,
      results: current.results.map((candidate) =>
        candidate.externalId === externalId
          ? { ...candidate, importedCompanyId: result.companyId }
          : candidate,
      ),
    }));
  }

  async function importOne(externalId: string) {
    setBusy(externalId);
    setMessage("");
    try {
      const result = await postJson<ImportResult>("/api/discovery/import", { externalId });
      markImported(externalId, result);
      setMessage(
        result.wasCreated
          ? "Entreprise importée avec sa provenance."
          : "Doublon détecté : la fiche existante a été conservée.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import indisponible.");
    } finally {
      setBusy(null);
    }
  }

  async function importBatch() {
    if (!selectedAvailable.length) return;
    setBusy("batch");
    setMessage("");
    try {
      const results = await postJson<ImportResult[]>("/api/discovery/import-batch", {
        externalIds: selectedAvailable.map((candidate) => candidate.externalId),
      });
      results.forEach((result, index) => {
        const candidate = selectedAvailable[index];
        if (candidate) markImported(candidate.externalId, result);
      });
      setSelectedIds([]);
      setMessage(
        `${results.filter((result) => result.wasCreated).length} création(s), ${results.filter((result) => !result.wasCreated).length} doublon(s) réutilisé(s).`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import en lot indisponible.");
    } finally {
      setBusy(null);
    }
  }

  async function saveSearch() {
    if (!saveName.trim()) {
      setMessage("Donnez un nom à la recherche.");
      return;
    }
    setBusy("save");
    setMessage("");
    try {
      const saved = await postJson<{ id: string }>("/api/discovery/saved", {
        name: saveName,
        search: searchInput,
        resultCount: response.total,
      });
      setMessage("Recherche sauvegardée.");
      setSaveName("");
      window.history.replaceState(null, "", `/explore/saved/${saved.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sauvegarde indisponible.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <header className="grid gap-6 border-b border-border pb-6 xl:grid-cols-[1fr_auto] xl:items-end">
        <div>
          <p className="font-data text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Ouverture cartographique · Paris
          </p>
          <h1 className="font-display mt-3 max-w-4xl text-balance text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
            Dessinez le terrain. SURFCE garde la source.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Explorez dix sociétés fictives, resserrez la zone puis importez uniquement les cibles
            choisies.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-warning/25 bg-warning/8 px-4 py-3 text-xs">
          <Sparkles className="size-4 text-warning" aria-hidden="true" />
          <span>
            <strong>Provider mock.</strong> Coût externe estimé : 0 €.
          </span>
        </div>
      </header>

      <section
        aria-label="Paramètres de recherche"
        className="rounded-xl border border-border bg-card p-4 sm:p-5"
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_1fr_0.75fr_auto]">
          <div>
            <label
              htmlFor="discovery-query"
              className="font-data text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
            >
              Recherche libre
            </label>
            <div className="relative mt-2">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="discovery-query"
                name="discovery_query"
                autoComplete="off"
                value={searchInput.query}
                onChange={(event) =>
                  setSearchInput((current) => ({ ...current, query: event.target.value }))
                }
                placeholder="Nom, activité, secteur…"
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="discovery-category"
              className="font-data text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
            >
              Catégorie
            </label>
            <Select
              id="discovery-category"
              name="discovery_category"
              className="mt-2"
              value={searchInput.category}
              onChange={(event) =>
                setSearchInput((current) => ({ ...current, category: event.target.value }))
              }
            >
              {categories.map((category) => (
                <option key={category || "all"} value={category}>
                  {category || "Toutes les catégories"}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label
              htmlFor="discovery-district"
              className="font-data text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
            >
              Arrondissement
            </label>
            <Select
              id="discovery-district"
              name="discovery_district"
              className="mt-2"
              value={searchInput.district}
              onChange={(event) =>
                setSearchInput((current) => ({ ...current, district: event.target.value }))
              }
            >
              <option value="">Tout Paris</option>
              {Array.from({ length: 20 }, (_, index) => (
                <option key={index + 1} value={String(index + 1)}>
                  {index + 1}
                  {index === 0 ? "er" : "e"}
                </option>
              ))}
            </Select>
          </div>
          <Button className="mt-auto h-11" onClick={runSearch} disabled={busy === "search"}>
            {busy === "search" ? (
              <Loader2
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : (
              <Search className="size-4" aria-hidden="true" />
            )}
            Rechercher
          </Button>
        </div>
        <div className="mt-4 flex flex-col gap-4 border-t border-border pt-4 lg:flex-row lg:items-center">
          <div
            className="flex w-fit rounded-lg bg-muted p-1"
            aria-label="Mode de zone"
            role="group"
          >
            {(["radius", "polygon"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setSearchInput((current) => ({
                    ...current,
                    mode,
                    polygon: mode === "polygon" ? [] : current.polygon,
                  }));
                  setMessage(
                    mode === "polygon"
                      ? "Cliquez sur la carte pour poser les sommets du polygone."
                      : "",
                  );
                }}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  searchInput.mode === mode
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground",
                )}
                aria-pressed={searchInput.mode === mode}
              >
                {mode === "radius" ? (
                  <CircleDotDashed className="size-3.5" aria-hidden="true" />
                ) : (
                  <Pentagon className="size-3.5" aria-hidden="true" />
                )}
                {mode === "radius" ? "Rayon" : "Polygone"}
              </button>
            ))}
          </div>
          {searchInput.mode === "radius" ? (
            <div className="flex flex-1 items-center gap-3">
              <label htmlFor="radius" className="text-xs font-semibold">
                Rayon
              </label>
              <input
                id="radius"
                name="radius_meters"
                type="range"
                min={500}
                max={10000}
                step={500}
                value={radiusMeters}
                onChange={(event) =>
                  setSearchInput((current) => ({
                    ...current,
                    radiusMeters: Number(event.target.value),
                  }))
                }
                className="min-w-32 flex-1 accent-primary"
              />
              <span className="font-data w-16 text-right text-xs">
                {(radiusMeters / 1000).toFixed(1)} km
              </span>
            </div>
          ) : (
            <div className="flex flex-1 items-center gap-3 text-xs text-muted-foreground">
              <MousePointer2 className="size-4 text-primary" aria-hidden="true" />
              <span>{polygon.length} sommet(s) posé(s) · minimum 3</span>
              <button
                type="button"
                onClick={() => setSearchInput((current) => ({ ...current, polygon: [] }))}
                className="ml-auto inline-flex items-center gap-1 rounded font-semibold text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                Effacer
              </button>
              <button
                type="button"
                onClick={() =>
                  setSearchInput((current) => ({
                    ...current,
                    polygon: [
                      [2.305, 48.848],
                      [2.37, 48.848],
                      [2.37, 48.886],
                      [2.305, 48.886],
                    ],
                  }))
                }
                className="inline-flex items-center gap-1 rounded font-semibold text-primary hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Zone Paris centre
              </button>
            </div>
          )}
          <label className="flex items-center gap-2 text-xs font-semibold">
            <input
              name="has_website"
              type="checkbox"
              checked={searchInput.filters.hasWebsite ?? false}
              onChange={(event) =>
                setSearchInput((current) => ({
                  ...current,
                  filters: { ...current.filters, hasWebsite: event.target.checked },
                }))
              }
              className="size-4 accent-primary"
            />
            Avec site
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold">
            <input
              name="has_phone"
              type="checkbox"
              checked={searchInput.filters.hasPhone ?? false}
              onChange={(event) =>
                setSearchInput((current) => ({
                  ...current,
                  filters: { ...current.filters, hasPhone: event.target.checked },
                }))
              }
              className="size-4 accent-primary"
            />
            Avec téléphone
          </label>
        </div>
      </section>

      <section className="grid min-h-[46rem] overflow-hidden rounded-xl border border-border bg-card xl:grid-cols-[minmax(22rem,0.72fr)_minmax(0,1.28fr)]">
        <div className="flex min-h-0 flex-col border-b border-border xl:border-b-0 xl:border-r">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/35 p-4">
            <div>
              <p className="font-data text-[0.62rem] uppercase tracking-[0.13em] text-muted-foreground">
                Résultats synchronisés
              </p>
              <p className="mt-1 text-sm font-semibold">
                {response.total} société(s) · {selectedIds.length} sélectionnée(s)
              </p>
            </div>
            <Button
              size="sm"
              onClick={importBatch}
              disabled={!canImport || selectedAvailable.length === 0 || busy === "batch"}
            >
              {busy === "batch" ? (
                <Loader2
                  className="size-3.5 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <Layers3 className="size-3.5" aria-hidden="true" />
              )}
              Importer {selectedAvailable.length || "le lot"}
            </Button>
          </header>
          <div className="max-h-[35rem] flex-1 overflow-y-auto xl:max-h-none">
            {response.results.length ? (
              response.results.map((candidate) => (
                <CandidateRow
                  key={candidate.externalId}
                  candidate={candidate}
                  canImport={canImport}
                  focused={focusedId === candidate.externalId}
                  selected={selectedIds.includes(candidate.externalId)}
                  onFocus={() => setFocusedId(candidate.externalId)}
                  onSelect={() =>
                    setSelectedIds((current) =>
                      current.includes(candidate.externalId)
                        ? current.filter((id) => id !== candidate.externalId)
                        : [...current, candidate.externalId],
                    )
                  }
                  onImport={() => importOne(candidate.externalId)}
                  importing={busy === candidate.externalId}
                />
              ))
            ) : (
              <div className="grid min-h-64 place-items-center p-8 text-center">
                <div>
                  <Search className="mx-auto size-6 text-muted-foreground" aria-hidden="true" />
                  <h2 className="font-display mt-4 text-xl font-semibold">
                    Aucune société dans cette zone
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Élargissez le rayon, effacez un filtre ou redessinez le polygone.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="relative min-h-[31rem] bg-accent">
          <DiscoveryMap
            candidates={response.results}
            center={center}
            focusedId={focusedId}
            mode={searchInput.mode}
            onFocus={setFocusedId}
            onPolygonPoint={(point) =>
              setSearchInput((current) => ({
                ...current,
                polygon: [...(current.polygon ?? []), point],
              }))
            }
            polygon={polygon}
            radiusMeters={radiusMeters}
            selectedIds={selectedIds}
          />
          <div className="pointer-events-none absolute left-4 top-4 rounded-lg border border-white/70 bg-white/90 px-3 py-2 shadow-sm backdrop-blur">
            <p className="font-data text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-[#102a43]">
              Lentille active
            </p>
            <p className="mt-1 text-xs font-semibold text-[#102a43]">
              {searchInput.mode === "radius"
                ? `${(radiusMeters / 1000).toFixed(1)} km autour de Paris`
                : `${polygon.length} sommets`}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-xl border border-border bg-card p-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <label
            htmlFor="save-search"
            className="font-data text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-muted-foreground"
          >
            Sauvegarder cette ouverture
          </label>
          <div className="mt-2 flex max-w-xl gap-2">
            <Input
              id="save-search"
              name="saved_search_name"
              autoComplete="off"
              value={saveName}
              onChange={(event) => setSaveName(event.target.value)}
              placeholder="Ex. Agences Paris centre…"
              disabled={!canSave}
            />
            <Button variant="secondary" onClick={saveSearch} disabled={!canSave || busy === "save"}>
              {busy === "save" ? (
                <Loader2
                  className="size-4 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <Save className="size-4" aria-hidden="true" />
              )}
              Sauvegarder
            </Button>
          </div>
        </div>
        {savedSearches.length ? (
          <div className="text-sm">
            <p className="font-data text-[0.62rem] uppercase tracking-[0.12em] text-muted-foreground">
              Recherches récentes
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {savedSearches.slice(0, 3).map((saved) => (
                <Link
                  key={saved.id}
                  href={`/explore/saved/${saved.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold"
                >
                  <Check className="size-3 text-success" aria-hidden="true" />
                  {saved.name}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {message ? (
        <p
          className="rounded-lg border border-border bg-card px-4 py-3 text-sm font-semibold"
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
