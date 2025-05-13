import { useEffect, useRef } from 'react';

export function AdvancedMarker({ position, map }) {
  const markerRef = useRef(null);

  useEffect(() => {
    if (!map || !window.google || !window.google.maps.marker) return;

    // Limpia el marcador anterior
    if (markerRef.current) {
      markerRef.current.map = null;
    }

    // Crea el nuevo AdvancedMarkerElement
    markerRef.current = new window.google.maps.marker.AdvancedMarkerElement({
      position,
      map,
      title: 'Ubicación seleccionada',
    });

    return () => {
      // Limpia el marcador al desmontar
      if (markerRef.current) {
        markerRef.current.map = null;
      }
    };
  }, [position, map]);

  return null; // Este componente no devuelve JSX
}
