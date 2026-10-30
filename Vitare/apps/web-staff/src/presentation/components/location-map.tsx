import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import type { Icon } from "leaflet"
import markerIconUrl from "leaflet/dist/images/marker-icon.png"
import markerIconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png"
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png"

interface LocationMapProps {
  latitude: number
  longitude: number
  patientName: string
}

export function LocationMap({ latitude, longitude, patientName }: LocationMapProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [customIcon, setCustomIcon] = useState<Icon | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true)
    
    import("leaflet").then((L) => {
      const icon = new L.Icon({
        iconUrl: markerIconUrl,
        iconRetinaUrl: markerIconRetinaUrl,
        shadowUrl: markerShadowUrl,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      })
      setCustomIcon(icon)
    })
  }, [])

  if (!isMounted || !customIcon) {
    return (
      <div className="w-full h-62.5 md:h-75 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-gray-500 text-sm">Carregando mapa...</div>
      </div>
    )
  }

  return (
    <div className="w-full h-62.5 md:h-75 rounded-lg overflow-hidden border border-gray-200">
      <MapContainer
        center={[latitude, longitude]}
        zoom={15}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[latitude, longitude]} icon={customIcon}>
          <Popup>
            <div className="text-sm font-medium">{patientName}</div>
            <div className="text-xs text-gray-500">Localização atual</div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  )
}
