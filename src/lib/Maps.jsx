import React from 'react';
import { GoogleMap, useLoadScript } from '@react-google-maps/api';

const MAPS_API_KEY = 'AIzaSyBKL_jxWNgABqicf8y-GDutFih91zdsghk';

const defaultContainerStyle = {
  width: '100%',
  height: '100%',
};

const libraries = ["places"];

export default function Maps({
  center = { lat: 4.8133, lng: -75.6967 },
  zoom = 12,
  children,
  mapContainerStyle = defaultContainerStyle,
  onClick,
  onLoad,
  mapId,
}) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: MAPS_API_KEY,
    libraries,
  });

  if (loadError) return <div>Error loading maps</div>;
  if (!isLoaded) return <div>Loading Maps...</div>;

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={zoom}
      onClick={onClick}
      onLoad={onLoad}
      mapId={mapId}
    >
      {children}
    </GoogleMap>
  );
}