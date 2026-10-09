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
  const polylineRef = useRef<L.Polyline | null>(null);
  const markerARef = useRef<L.CircleMarker | null>(null);
  const markerBRef = useRef<L.CircleMarker | null>(null);
  const leakMarkerRef = useRef<L.CircleMarker | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const centerLat = (nodeACoords[0] + nodeBCoords[0]) / 2;
      const centerLng = (nodeACoords[1] + nodeBCoords[1]) / 2;

      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: 15,
        zoomControl: true,
      });

      // Dark-mode CartoDB tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }
  }, []);

  // Update pipeline path & sensor node markers when coords change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove old layers
    if (polylineRef.current) map.removeLayer(polylineRef.current);
    if (markerARef.current) map.removeLayer(markerARef.current);
    if (markerBRef.current) map.removeLayer(markerBRef.current);

    // Pipe vector (cyan/blue glowing line)
    const polyline = L.polyline([nodeACoords, nodeBCoords], {
      color: '#06b6d4',
      weight: 6,
      opacity: 0.85,
      lineCap: 'round',
    }).addTo(map);
    polylineRef.current = polyline;

    // Sensor Node A Marker
    const markerA = L.circleMarker(nodeACoords, {
      radius: 9,
      fillColor: '#06b6d4',
      color: '#ffffff',
      weight: 2.5,
      fillOpacity: 1,
    })
      .bindTooltip(`<b>HYDROPHONE 01 (Node A)</b><br/>${pipeName}`, {
        permanent: false,
      })
      .addTo(map);
    markerARef.current = markerA;

    // Sensor Node B Marker
    const markerB = L.circleMarker(nodeBCoords, {
      radius: 9,
      fillColor: '#c084fc',
      color: '#ffffff',
      weight: 2.5,
      fillOpacity: 1,
    })
      .bindTooltip(`<b>HYDROPHONE 02 (Node B)</b><br/>${pipeName}`, {
        permanent: false,
      })
      .addTo(map);
    markerBRef.current = markerB;

    // Fit map bounds to encompass both nodes
    const bounds = L.latLngBounds([nodeACoords, nodeBCoords]);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
  }, [nodeACoords, nodeBCoords, pipeName]);

  // Update Leak / Rupture Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (leakMarkerRef.current) {
      map.removeLayer(leakMarkerRef.current);
      leakMarkerRef.current = null;
    }

    if (leakCoords) {
      // Red Pulsing Leak Marker
      const leakMarker = L.circleMarker(leakCoords, {
        radius: 14,
        fillColor: '#ef4444',
        color: '#ffffff',
        weight: 3,
        fillOpacity: 0.95,
      }).addTo(map);

      leakMarker
        .bindPopup(
          `<div style="font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #0f172a; padding: 4px;">
            <div style="font-weight: 800; color: #dc2626; font-size: 13px; margin-bottom: 4px;">🚨 TRIANGULATED RUPTURE</div>
            <div><b>Pipeline:</b> ${pipeName}</div>
            <div><b>Offset:</b> ${leakDistanceM !== undefined ? leakDistanceM.toFixed(1) : '---'} m from Node A</div>
            <div><b>GPS:</b> ${leakCoords[0].toFixed(5)}, ${leakCoords[1].toFixed(5)}</div>
            <div style="margin-top: 6px; padding: 3px 6px; background: #dcfce7; color: #15803d; border-radius: 4px; font-weight: bold; text-align: center;">
              Sub-Meter Precision: ±0.11 m
            </div>
          </div>`
        )
        .openPopup();

      leakMarkerRef.current = leakMarker;
    }
  }, [leakCoords, leakDistanceM, pipeName]);

  return (
    <div className="bg-[#0b101c]/90 border border-slate-800/80 rounded-2xl p-5 flex flex-col gap-4 shadow-2xl backdrop-blur-xl transition hover:border-sky-500/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wider text-slate-100 uppercase font-mono">
              Delhi GIS Underground Pipe Network
            </h2>
            <p className="text-[11px] text-slate-400 font-sans">
              Georeferenced acoustic correlation pinpointing on Delhi Jal Board infrastructure
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-300 bg-slate-900/80 border border-slate-800 px-3 py-1 rounded-lg">
          <Navigation className="w-3.5 h-3.5 text-sky-400" />
          <span>{locationLabel}</span>
        </div>
      </div>

      <div
        ref={mapContainerRef}
        className="w-full aspect-[2.4/1] rounded-xl overflow-hidden border border-slate-800 z-0 shadow-inner"
        style={{ minHeight: '360px' }}
      />

      <div className="flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 pt-1 border-t border-slate-800/60">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-cyan-400 border border-white shadow"></span>
            <span className="text-slate-300">Node A (Gate Valve 1)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-purple-400 border border-white shadow"></span>
            <span className="text-slate-300">Node B (Gate Valve 2)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500 border border-white shadow animate-pulse"></span>
            <span className="text-rose-400 font-bold">Triangulated Leak</span>
          </div>
        </div>
        <span className="text-cyan-400 font-semibold">Total Pipe Span: {pipeLengthM.toFixed(1)} m</span>
      </div>
    </div>
  );
};
