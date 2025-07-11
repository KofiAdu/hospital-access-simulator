from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import geopandas as gpd
import osmnx as ox
import networkx as nx
import pandas as pd
import json
from shapely.geometry import Point

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

underserved = gpd.read_file("data/top_underserved.geojson").to_crs(epsg=4326)


class HospitalSimInput(BaseModel):
    lat: float
    lng: float


@app.get("/api/underserved")
def get_underserved():
    return underserved.to_json()


@app.post("/api/simulate_hospital")
def simulate_hospital(input: HospitalSimInput):
    G = ox.graph_from_place("Helsinki, Finland", network_type="drive")
    G_proj = ox.project_graph(G)

    hex_grid = underserved.copy().to_crs(G_proj.graph["crs"])

    if "center" in hex_grid.columns:
        hex_grid = hex_grid.drop(columns=["center"])
    hex_grid["center"] = hex_grid.geometry.centroid

    orig_hospitals = (
        ox.features_from_place("Helsinki, Finland", tags={"amenity": "hospital"})
        .to_crs(G_proj.graph["crs"])
    )
    orig_hospitals = orig_hospitals[orig_hospitals.geometry.type == "Point"]

    new_hosp = Point(input.lng, input.lat)
    new_hosp_gdf = (
        gpd.GeoDataFrame(geometry=[new_hosp], crs="EPSG:4326")
        .to_crs(G_proj.graph["crs"])
    )

    all_hospitals = pd.concat([orig_hospitals, new_hosp_gdf], ignore_index=True)

    def compute_network_dist(pt: Point) -> float:
        try:
            orig_node = ox.distance.nearest_nodes(G_proj, pt.x, pt.y)
            dists = []
            for h in all_hospitals.geometry:
                target_node = ox.distance.nearest_nodes(G_proj, h.x, h.y)
                d = nx.shortest_path_length(
                    G_proj, orig_node, target_node, weight="length"
                )
                dists.append(d)
            return min(dists)
        except Exception as e:
            print("Network‐distance error for", pt, "→", e)
            return None

    hex_grid["dist_to_hospital_m"] = hex_grid["center"].apply(compute_network_dist)

    hex_grid["population"] = pd.to_numeric(
        hex_grid.get("population", 0), errors="coerce"
    ).fillna(0)

    hex_grid["underserved_score"] = (
        hex_grid["population"] * hex_grid["dist_to_hospital_m"].fillna(0)
    )

    hex_grid = hex_grid.drop(columns=["center"], errors="ignore")

    return json.loads(hex_grid.to_crs(epsg=4326).to_json())

