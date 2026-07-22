"use client";

import { useEffect, useRef } from "react";
import {
  AttributionControl,
  type GeoJSONSource,
  LngLatBounds,
  Map as MapLibreMap,
  type MapLayerMouseEvent,
  type MapMouseEvent,
  NavigationControl,
} from "maplibre-gl";

import {
  closePolygonRing,
  createCircleRing,
  type GeoPoint,
  type PolygonRing,
} from "@/lib/geo/geometry";
import type { DiscoveryCandidate } from "@/features/discovery/types";

interface DiscoveryMapProps {
  candidates: DiscoveryCandidate[];
  center: GeoPoint;
  focusedId: string | null;
  mode: "radius" | "polygon";
  onFocus: (externalId: string) => void;
  onPolygonPoint: (point: [number, number]) => void;
  polygon: PolygonRing;
  radiusMeters: number;
  selectedIds: string[];
}

type GeoJSONData = Exclude<Parameters<GeoJSONSource["setData"]>[0], string>;

const guideData = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { kind: "water" },
      geometry: {
        type: "LineString",
        coordinates: [
          [2.274, 48.85],
          [2.304, 48.851],
          [2.326, 48.855],
          [2.348, 48.853],
          [2.372, 48.846],
          [2.396, 48.839],
        ],
      },
    },
    ...[2.29, 2.315, 2.34, 2.365, 2.39].map((longitude) => ({
      type: "Feature" as const,
      properties: { kind: "street" },
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [longitude, 48.835],
          [longitude, 48.895],
        ],
      },
    })),
    ...[48.845, 48.857, 48.869, 48.881, 48.893].map((latitude) => ({
      type: "Feature" as const,
      properties: { kind: "street" },
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [2.265, latitude],
          [2.41, latitude],
        ],
      },
    })),
  ],
} as GeoJSONData;

function sourceData(
  candidates: DiscoveryCandidate[],
  selectedIds: string[],
  focusedId: string | null,
): GeoJSONData {
  return {
    type: "FeatureCollection",
    features: candidates.map((candidate) => ({
      type: "Feature",
      properties: {
        externalId: candidate.externalId,
        imported: Boolean(candidate.importedCompanyId),
        selected: selectedIds.includes(candidate.externalId),
        focused: focusedId === candidate.externalId,
      },
      geometry: {
        type: "Point",
        coordinates: [candidate.location.longitude, candidate.location.latitude],
      },
    })),
  } as GeoJSONData;
}

function areaData(
  mode: "radius" | "polygon",
  center: GeoPoint,
  radiusMeters: number,
  polygon: PolygonRing,
): GeoJSONData {
  const ring =
    mode === "radius" ? createCircleRing(center, radiusMeters) : closePolygonRing(polygon);
  if (ring.length < 4) return { type: "FeatureCollection", features: [] } as GeoJSONData;
  return {
    type: "FeatureCollection",
    features: [
      { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } },
    ],
  } as GeoJSONData;
}

function verticesData(polygon: PolygonRing): GeoJSONData {
  return {
    type: "FeatureCollection",
    features: polygon.map((coordinates, index) => ({
      type: "Feature",
      properties: { index },
      geometry: { type: "Point", coordinates },
    })),
  } as GeoJSONData;
}

export function DiscoveryMap({
  candidates,
  center,
  focusedId,
  mode,
  onFocus,
  onPolygonPoint,
  polygon,
  radiusMeters,
  selectedIds,
}: DiscoveryMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const modeRef = useRef(mode);
  const onFocusRef = useRef(onFocus);
  const onPolygonPointRef = useRef(onPolygonPoint);
  const candidateKeyRef = useRef("");
  const initialStateRef = useRef({
    candidates,
    center,
    focusedId,
    mode,
    polygon,
    radiusMeters,
    selectedIds,
  });

  useEffect(() => {
    modeRef.current = mode;
    onFocusRef.current = onFocus;
    onPolygonPointRef.current = onPolygonPoint;
  }, [mode, onFocus, onPolygonPoint]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const initial = initialStateRef.current;
    const map = new MapLibreMap({
      container: containerRef.current,
      center: [initial.center.longitude, initial.center.latitude],
      zoom: 11.7,
      attributionControl: false,
      style: {
        version: 8,
        sources: {},
        layers: [
          { id: "background", type: "background", paint: { "background-color": "#eaf1f5" } },
        ],
      },
    });

    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.addControl(
      new AttributionControl({
        compact: true,
        customAttribution: "Données fictives · fond local SURFCE",
      }),
    );
    map.on("load", () => {
      map.addSource("guides", { type: "geojson", data: guideData });
      map.addLayer({
        id: "streets",
        type: "line",
        source: "guides",
        filter: ["==", ["get", "kind"], "street"],
        paint: { "line-color": "#cbd9df", "line-width": 1 },
      });
      map.addLayer({
        id: "water",
        type: "line",
        source: "guides",
        filter: ["==", ["get", "kind"], "water"],
        paint: { "line-color": "#9bcfd3", "line-width": 13, "line-opacity": 0.6 },
      });
      map.addSource("search-area", {
        type: "geojson",
        data: areaData(initial.mode, initial.center, initial.radiusMeters, initial.polygon),
      });
      map.addLayer({
        id: "search-area-fill",
        type: "fill",
        source: "search-area",
        paint: { "fill-color": "#315cf5", "fill-opacity": 0.1 },
      });
      map.addLayer({
        id: "search-area-line",
        type: "line",
        source: "search-area",
        paint: { "line-color": "#315cf5", "line-width": 2, "line-dasharray": [2, 2] },
      });
      map.addSource("polygon-vertices", {
        type: "geojson",
        data: verticesData(initial.polygon),
      });
      map.addLayer({
        id: "polygon-vertices",
        type: "circle",
        source: "polygon-vertices",
        paint: {
          "circle-radius": 5,
          "circle-color": "#ffffff",
          "circle-stroke-color": "#315cf5",
          "circle-stroke-width": 2,
        },
      });
      map.addSource("candidates", {
        type: "geojson",
        data: sourceData(initial.candidates, initial.selectedIds, initial.focusedId),
      });
      map.addLayer({
        id: "candidate-halo",
        type: "circle",
        source: "candidates",
        paint: {
          "circle-radius": ["case", ["boolean", ["get", "focused"], false], 17, 12],
          "circle-color": ["case", ["boolean", ["get", "selected"], false], "#f06a4d", "#315cf5"],
          "circle-opacity": 0.16,
        },
      });
      map.addLayer({
        id: "candidates",
        type: "circle",
        source: "candidates",
        paint: {
          "circle-radius": ["case", ["boolean", ["get", "focused"], false], 9, 7],
          "circle-color": [
            "case",
            ["boolean", ["get", "imported"], false],
            "#102a43",
            ["boolean", ["get", "selected"], false],
            "#f06a4d",
            "#315cf5",
          ],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });
    });

    map.on("click", "candidates", (event: MapLayerMouseEvent) => {
      const externalId = event.features?.[0]?.properties.externalId;
      if (typeof externalId === "string") onFocusRef.current(externalId);
    });
    map.on("mouseenter", "candidates", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "candidates", () => {
      map.getCanvas().style.cursor = modeRef.current === "polygon" ? "crosshair" : "";
    });
    map.on("click", (event: MapMouseEvent) => {
      if (modeRef.current !== "polygon") return;
      const candidate = map.queryRenderedFeatures(event.point, { layers: ["candidates"] });
      if (candidate.length === 0) onPolygonPointRef.current([event.lngLat.lng, event.lngLat.lat]);
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    (map.getSource("candidates") as GeoJSONSource | undefined)?.setData(
      sourceData(candidates, selectedIds, focusedId),
    );
    (map.getSource("search-area") as GeoJSONSource | undefined)?.setData(
      areaData(mode, center, radiusMeters, polygon),
    );
    (map.getSource("polygon-vertices") as GeoJSONSource | undefined)?.setData(
      verticesData(polygon),
    );
    map.getCanvas().style.cursor = mode === "polygon" ? "crosshair" : "";

    const candidateKey = candidates.map((candidate) => candidate.externalId).join("|");
    if (candidateKey !== candidateKeyRef.current && candidates.length > 0) {
      const bounds = new LngLatBounds();
      candidates.forEach((candidate) =>
        bounds.extend([candidate.location.longitude, candidate.location.latitude]),
      );
      map.fitBounds(bounds, { padding: 80, maxZoom: 13.5, duration: 450 });
      candidateKeyRef.current = candidateKey;
    }
  }, [candidates, center, focusedId, mode, polygon, radiusMeters, selectedIds]);

  useEffect(() => {
    const map = mapRef.current;
    const focused = candidates.find((candidate) => candidate.externalId === focusedId);
    if (map && focused)
      map.easeTo({
        center: [focused.location.longitude, focused.location.latitude],
        duration: 350,
      });
  }, [candidates, focusedId]);

  return (
    <div
      ref={containerRef}
      className="h-full min-h-[31rem] w-full"
      aria-label="Carte des sociétés fictives et de la zone de recherche"
      role="region"
    />
  );
}
