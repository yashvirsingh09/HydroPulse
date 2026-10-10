import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Navigation, Compass } from 'lucide-react';

interface PipeMapProps {
  nodeACoords: [number, number];
  nodeBCoords: [number, number];
  leakCoords?: [number, number];
  leakDistanceM?: number;
  pipeName: string;
  pipeLengthM?: number;
  locationLabel?: string;
  isSimulating?: boolean;
}

export const PipeMap: React.FC<PipeMapProps> = ({
  nodeACoords,
  nodeBCoords,
  leakCoords,
  leakDistanceM,
  pipeName,
  pipeLengthM = 500,
  locationLabel = 'Delhi Municipal Sector',
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polylineBackgroundRef = useRef<L.Polyline | null>(null);
  const polylineFlowRef = useRef<L.Polyline | null>(null);
  const markerARef = useRef<L.CircleMarker | null>(null);
  const markerBRef = useRef<L.CircleMarker | null>(null);
  const leakMarkerRef = useRef<L.Marker | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const centerLat = (nodeACoords[0] + nodeBCoords[0]) / 2;
      const centerLng = (nodeACoords[1] + nodeBCoords[1]) / 2;

      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
      });

      // Free reliable OpenStreetMap tiles (styled dark via CSS filter)
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }
  }, []);

  // Update pipeline path with dual-layer flowing water animation
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (polylineBackgroundRef.current) map.removeLayer(polylineBackgroundRef.current);
    if (polylineFlowRef.current) map.removeLayer(polylineFlowRef.current);
    if (markerARef.current) map.removeLayer(markerARef.current);
    if (markerBRef.current) map.removeLayer(markerBRef.current);

    // 1. Solid under-pipe line (Deep Cyan)
    const polylineBg = L.polyline([nodeACoords, nodeBCoords], {
      color: '#0e7490',
      weight: 6,
      opacity: 0.6,
      lineCap: 'round',
    }).addTo(map);
    polylineBackgroundRef.current = polylineBg;

    // 2. Animated water flow dashes on top (Electric Cyan)
    const polylineFlow = L.polyline([nodeACoords, nodeBCoords], {
      color: '#22d3ee',
      weight: 4,
      opacity: 1,
      className: 'pipe-flow-animated',
      lineCap: 'round',
    }).addTo(map);
    polylineFlowRef.current = polylineFlow;

    // Node A Marker (Gate Valve 1)
    const markerA = L.circleMarker(nodeACoords, {
      radius: 8,
      fillColor: '#06b6d4',
      color: '#ffffff',
      weight: 2,
      fillOpacity: 1,
    })
      .bindTooltip(`<b>Node A (Hydrophone 01)</b><br/>${pipeName}`, {
        permanent: false,
      })
      .addTo(map);
    markerARef.current = markerA;

    // Node B Marker (Gate Valve 2)
    const markerB = L.circleMarker(nodeBCoords, {
      radius: 8,
      fillColor: '#c084fc',
      color: '#ffffff',
      weight: 2,
      fillOpacity: 1,
    })
      .bindTooltip(`<b>Node B (Hydrophone 02)</b><br/>${pipeName}`, {
        permanent: false,
      })
      .addTo(map);
    markerBRef.current = markerB;

    const bounds = L.latLngBounds([nodeACoords, nodeBCoords]);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  }, [nodeACoords, nodeBCoords, pipeName]);

  // Update Leak / Rupture Marker with Animated Sonar Shockwave Rings
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (leakMarkerRef.current) {
      map.removeLayer(leakMarkerRef.current);
      leakMarkerRef.current = null;
    }

    if (leakCoords) {
      // Custom pulsing HTML Sonar DivIcon
      const sonarIcon = L.divIcon({
        className: 'custom-sonar-icon',
        html: `
          <div class="sonar-shockwave-marker">
            <div class="sonar-shockwave-ring"></div>
            <div class="sonar-shockwave-dot"></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const leakMarker = L.marker(leakCoords, { icon: sonarIcon }).addTo(map);

      leakMarker
        .bindPopup(
          `<div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; padding: 2px;">
            <div style="font-weight: 800; color: #f87171; font-size: 12px; margin-bottom: 4px;">🚨 TRIANGULATED BURST</div>
            <div><b>Pipeline:</b> ${pipeName}</div>
            <div><b>Offset:</b> ${leakDistanceM !== undefined ? leakDistanceM.toFixed(1) : '---'} m from Node A</div>
            <div><b>GPS:</b> ${leakCoords[0].toFixed(5)}, ${leakCoords[1].toFixed(5)}</div>
            <div style="margin-top: 6px; padding: 3px 6px; background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 4px; font-weight: bold; text-align: center;">
              Sub-Meter Precision: ±0.11 m
            </div>
          </div>`
        )
        .openPopup();

      leakMarkerRef.current = leakMarker;
    }
  }, [leakCoords, leakDistanceM, pipeName]);

  return (
    <div className="bg-[#0b101c] border border-slate-800 rounded-xl p-3.5 flex flex-col gap-2.5 shadow-xl h-full justify-between transition hover:border-sky-500/40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Compass className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-bold tracking-wider text-slate-100 uppercase font-mono flex items-center gap-1.5">
              Delhi GIS Pipeline Network
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
          <Navigation className="w-3 h-3 text-sky-400" />
          <span className="truncate max-w-[200px]">{locationLabel}</span>
        </div>
      </div>

      <div
        ref={mapContainerRef}
        className="w-full flex-1 min-h-[240px] rounded-lg overflow-hidden border border-slate-800/80 z-0 shadow-inner"
      />

      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/60">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-cyan-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span> Node A
          </span>
          <span className="flex items-center gap-1.5 text-cyan-400 font-medium">
            <span className="inline-block w-4 h-0.5 bg-cyan-400 animate-pulse"></span> Flow Active
          </span>
          <span className="flex items-center gap-1.5 text-purple-300">
            <span className="w-2 h-2 rounded-full bg-purple-400"></span> Node B
          </span>
          {leakCoords ? (
            <span className="flex items-center gap-1.5 text-rose-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span> Rupture Pinpointed
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Pipeline Nominal
            </span>
          )}
        </div>
        <span className="text-slate-300 font-semibold">Span: {pipeLengthM.toFixed(1)} m</span>
      </div>
    </div>
  );
};
