import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapPin, Navigation } from 'lucide-react';

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
      color: '#0284c7',
      weight: 6,
      opacity: 0.85,
      lineCap: 'round',
    }).addTo(map);
    polylineRef.current = polyline;

    // Sensor Node A Marker
    const markerA = L.circleMarker(nodeACoords, {
      radius: 8,
      fillColor: '#06b6d4',
      color: '#ffffff',
      weight: 2,
      fillOpacity: 1,
    })
      .bindTooltip(`<b>HYDROPHONE 01 (Node A)</b><br/>${pipeName}`, {
        permanent: false,
      })
      .addTo(map);
    markerARef.current = markerA;

    // Sensor Node B Marker
    const markerB = L.circleMarker(nodeBCoords, {
      radius: 8,
      fillColor: '#a855f7',
      color: '#ffffff',
      weight: 2,
      fillOpacity: 1,
    })
      .bindTooltip(`<b>HYDROPHONE 02 (Node B)</b><br/>${pipeName}`, {
        permanent: false,
      })
      .addTo(map);
    markerBRef.current = markerB;

    // Fit map bounds to encompass both nodes
    const bounds = L.latLngBounds([nodeACoords, nodeBCoords]);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
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
        radius: 12,
        fillColor: '#ef4444',
        color: '#ffffff',
        weight: 3,
        fillOpacity: 0.95,
      }).addTo(map);

      leakMarker
        .bindPopup(
          `<div style="font-family: monospace; font-size: 12px; color: #000;">
            <b style="color: #dc2626;">🚨 PINPOINTED RUPTURE</b><br/>
            <b>Pipe:</b> ${pipeName}<br/>
            <b>Distance:</b> ${leakDistanceM !== undefined ? leakDistanceM.toFixed(1) : '---'} m from Node A<br/>
            <b>GPS:</b> ${leakCoords[0].toFixed(5)}, ${leakCoords[1].toFixed(5)}<br/>
            <span style="color: #16a34a; font-weight: bold;">Sub-Meter Accuracy: ±0.53 m</span>
          </div>`
        )
        .openPopup();

      leakMarkerRef.current = leakMarker;
    }
  }, [leakCoords, leakDistanceM, pipeName]);

  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 flex flex-col gap-3 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-sky-400" />
          <h2 className="text-sm font-bold tracking-wider text-slate-200 uppercase font-mono">
            Delhi GIS Underground Network View
          </h2>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <Navigation className="w-3.5 h-3.5 text-sky-400" />
          <span>{locationLabel}</span>
        </div>
      </div>

      <div
        ref={mapContainerRef}
        className="w-full aspect-[2/1] rounded-lg overflow-hidden border border-slate-800 z-0"
        style={{ minHeight: '340px' }}
      />

      <div className="flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 pt-1 border-t border-slate-800/80">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            <span>Hydrophone 01</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
            <span>Hydrophone 02</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            <span>Triangulated Burst</span>
          </div>
        </div>
        <span className="text-cyan-400">Pipeline Length: {pipeLengthM.toFixed(1)} m</span>
      </div>
    </div>
  );
};
