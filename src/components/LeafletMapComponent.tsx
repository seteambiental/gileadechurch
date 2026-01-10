import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in Leaflet with bundlers
// This needs to be done before any markers are created
const fixLeafletIcons = () => {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });
};

// Call the fix immediately when this module loads
fixLeafletIcons();

interface Casa {
  id: string;
  name: string;
  address?: string;
  numero?: string;
  lideres?: string;
  dias?: string;
  frequencia?: string;
  latitude?: number;
  longitude?: number;
}

interface LeafletMapComponentProps {
  casas: Casa[];
  center: [number, number];
  onSelectCasa: (id: string) => void;
}

// Component to handle map center changes
const MapCenterHandler = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  
  return null;
};

const LeafletMapComponent = ({ casas, center, onSelectCasa }: LeafletMapComponentProps) => {
  return (
    <MapContainer
      center={center}
      zoom={12}
      style={{ height: "400px", width: "100%" }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapCenterHandler center={center} />
      {casas.map((casa) => (
        <Marker
          key={casa.id}
          position={[casa.latitude!, casa.longitude!]}
          eventHandlers={{
            click: () => onSelectCasa(casa.id),
          }}
        >
          <Popup>
            <div className="space-y-1">
              <h4 className="font-bold text-sm">{casa.name}</h4>
              {casa.lideres && (
                <p className="text-xs text-gray-600">
                  <strong>Líderes:</strong> {casa.lideres}
                </p>
              )}
              {casa.dias && (
                <p className="text-xs text-gray-600">
                  <strong>Dia:</strong> {casa.dias} ({casa.frequencia?.toLowerCase()})
                </p>
              )}
              {casa.address && (
                <p className="text-xs text-gray-600">
                  {casa.address}, {casa.numero}
                </p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default LeafletMapComponent;
