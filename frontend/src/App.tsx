import { useEffect, useRef, useState } from "react";
import mapboxgl, { Map } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import axios from "axios";

mapboxgl.accessToken =
  "mapbox-api-key";

function App() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(
    null
  );

  const [isSimulating, setIsSimulating] = useState(false);
  const [simText, setSimText] = useState("Simulating");
  const simInterval = useRef<number | null>(null);

  useEffect(() => {
    if (isSimulating) {
      simInterval.current = window.setInterval(() => {
        setSimText((txt) => (txt.length >= 12 ? "Simulating" : txt + "."));
      }, 500);
    } else {
      clearInterval(simInterval.current!);
      setSimText("Simulating");
    }
    return () => clearInterval(simInterval.current!);
  }, [isSimulating]);

  useEffect(() => {
    axios.get("http://localhost:8000/api/underserved").then((res) => {
      setGeojson(JSON.parse(res.data));
    });
  }, []);

  useEffect(() => {
    if (!mapContainer.current || !geojson || mapRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current!,
      //style: "mapbox://styles/mapbox/light-v10",
      style: "mapbox://styles/mapbox/standard",
      center: [24.941, 60.169], // Helsinki
      zoom: 10,
    });

    mapRef.current.on("load", () => {
      mapRef.current!.resize();

      mapRef.current!.addSource("underserved", {
        type: "geojson",
        data: geojson,
      });

      mapRef.current!.addLayer({
        id: "underserved-fill",
        type: "fill",
        source: "underserved",
        paint: {
          "fill-color": [
            "interpolate",
            ["linear"],
            ["get", "underserved_score"],
            0,
            "#006837",
            100000,
            "#31a354",
            500000,
            "#78c679",
            1000000,
            "#c2e699",
            2500000,
            "#ffffcc",
            5000000,
            "#fee08b",
            10000000,
            "#fdae61",
            15000000,
            "#f46d43",
            20000000,
            "#d73027",
            30000000,
            "#a50026",
            40000000,
            "#800026",
          ],
          "fill-opacity": 0.6,
        },
      });

      mapRef.current!.addLayer({
        id: "underserved-outline",
        type: "line",
        source: "underserved",
        paint: {
          "line-color": "#c0392b",
          "line-width": 1,
        },
      });

      const tooltipEl = document.createElement("div");
      tooltipEl.className = "map-tooltip";
      tooltipEl.style.position = "absolute";
      tooltipEl.style.pointerEvents = "none";
      tooltipEl.style.background = "white";
      tooltipEl.style.color = "black";
      tooltipEl.style.padding = "6px 10px";
      tooltipEl.style.borderRadius = "4px";
      tooltipEl.style.boxShadow = "0 1px 4px rgba(0,0,0,0.3)";
      tooltipEl.style.fontSize = "13px";
      tooltipEl.style.zIndex = "1000";
      tooltipEl.style.display = "none";
      document.body.appendChild(tooltipEl);
      tooltipRef.current = tooltipEl;

      mapRef.current!.on("mousemove", "underserved-fill", (e) => {
        mapRef.current!.getCanvas().style.cursor = "pointer";
        const props = e.features?.[0].properties;
        //console.log("Hovered properties:", props);
        if (!props) return;

        const population = parseFloat(props.population ?? "0")
        const predicted = parseFloat(props.dist_to_hospital_m ?? "0") / 1000
        const score = parseFloat(props.underserved_score ?? "0") 

        const html = `
    <strong>Population:</strong> ${population.toLocaleString()}<br/>
    <strong>Distance:</strong> ${predicted.toFixed(0)} km<br/>
    <strong>Score:</strong> ${score.toLocaleString()}
  `;

        tooltipEl.innerHTML = html;
        tooltipEl.style.left = `${e.originalEvent.clientX + 15}px`;
        tooltipEl.style.top = `${e.originalEvent.clientY + 15}px`;
        tooltipEl.style.display = "block";
      });

      mapRef.current!.on("mouseleave", "underserved-fill", () => {
        tooltipEl.style.display = "none";
      });


      mapRef.current!.on("click", (e) => {
        const { lng, lat } = e.lngLat;
        //console.log(e.lngLat)

        mapRef.current!.flyTo({
          center: [lng, lat],
          //zoom: 13,
          speed: 1.2,
        });

        if (markerRef.current) {
          markerRef.current.remove();
        }

        const marker = new mapboxgl.Marker({
          color: "#2ecc71",
          anchor: "bottom",
        })
          .setLngLat([lng, lat])
          .addTo(mapRef.current!);

        const markerEl = marker.getElement();

        const mapCanvas = mapRef.current?.getCanvasContainer();
        if (mapCanvas && markerEl.parentElement !== mapCanvas) {
          mapCanvas.appendChild(markerEl);
        }

        markerRef.current = marker;

        console.log("Marker at:", lat, lng);
        setIsSimulating(true);

        axios
          .post("http://localhost:8000/api/simulate_hospital", { lng, lat })
          .then((res) => {
            const updatedGeojson = res.data;
            console.log("Updated hexes from backend:", updatedGeojson);
            console.log(typeof updatedGeojson);

            setGeojson(updatedGeojson);

            const source = mapRef.current?.getSource(
              "underserved"
            ) as mapboxgl.GeoJSONSource;
            //alert("Simulation completed");
            if (source) source.setData(updatedGeojson);
          })
          .catch((err) => {
            console.error("Simulation failed:", err);
            alert("Simulation error — check console");
          })
          .finally(() => {
            setIsSimulating(false);
          });
      });
    });
  }, [geojson]);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        margin: 0,
        padding: 0,
      }}
    >
      <div
        ref={mapContainer}
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          width: "100%",
          height: "100vh",
        }}
      />

      {isSimulating && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            color: "white",
            fontSize: "20px",
            fontFamily: "sans-serif",
          }}
        >
          {simText}
        </div>
      )}

      <div
        style={{
          position: "absolute",
          top: "12px",
          right: "12px",
          background: "white",
          borderRadius: "10px",
          boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
          fontFamily: "'Segoe UI', sans-serif",
          fontSize: "13px",
          zIndex: 10,
          width: "280px",
          pointerEvents: "auto",
        }}
      >
        <div
          style={{
            background: "linear-gradient(to right, #a50026, #006837)",
            color: "white",
            padding: "10px 14px",
            fontWeight: "bold",
            fontSize: "14px",
          }}
        >
          Underserved Areas (Score)
        </div>

        <div style={{ padding: "12px 14px", color: "#333" }}>
          <div style={{ marginBottom: "10px" }}>
            <strong>Score</strong> = population × travel distance (m)
          </div>

          <div style={{ marginBottom: "6px", fontWeight: "bold" }}>
            Color Scale
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {[
              { color: "#006837", label: "0" },
              { color: "#31a354", label: "100K" },
              { color: "#78c679", label: "500K" },
              { color: "#c2e699", label: "1M" },
              { color: "#ffffcc", label: "2.5M" },
              { color: "#fee08b", label: "5M" },
              { color: "#fdae61", label: "10M" },
              { color: "#f46d43", label: "15M" },
              { color: "#d73027", label: "20M" },
              { color: "#a50026", label: "30M" },
              { color: "#800026", label: "40M+" },
            ].map((entry, i) => (
              <div
                key={i}
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <div
                  style={{
                    width: "24px",
                    height: "12px",
                    backgroundColor: entry.color,
                    border: "1px solid #ccc",
                    borderRadius: "2px",
                  }}
                />
                <span style={{ fontSize: "12px", color: "#555" }}>
                  {entry.label}
                </span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: "11px", marginTop: "8px", color: "#555" }}>
            → Redder = more underserved
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
