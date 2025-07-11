# Mapping Healthcare Accessibility in Helsinki

This project maps underserved areas in Helsinki using a combination of machine learning and network-based spatial analysis.

It includes:

- A **Random Forest Regressor** that predicts travel distance to the nearest hospital based on population and location features.
- A **WebGIS application** built with React, Mapbox, and FastAPI for interactive simulation of new hospital placements.
- A full **hex-based underserved score** map that dynamically updates in the browser.

---

## Features

-  **Machine Learning Model**: Trained on real Helsinki hospital data to predict access gaps.
-  **Interactive Map**: Visualizes underserved areas and lets users simulate adding new hospitals.
-  **Fullstack Architecture**: FastAPI backend + React frontend + GeoPandas + Mapbox GL JS.
-  **Network Analysis**: Uses OpenStreetMap data and NetworkX to calculate real travel distances.

---

## How to Run

### 1. Clone the Repo

```bash
git clone https://github.com/KofiAdu/hospital-access-simulator.git
cd hospital-access-simulator 
```

---

### 2. Backend & ML Setup (Python)

Ensure you have **Python 3.9+** installed.

```bash
cd backend
python -m venv env
source env/bin/activate 
pip install -r requirements.txt
```

This installs all libraries required for both:

- Running the FastAPI backend
- Training and running the ML model

---

### 3. Start the Backend Server

```bash
uvicorn main:app --reload
```

Once running, visit: [http://localhost:8000/docs](http://localhost:8000/docs) for the interactive API.

---

### 4. Frontend Setup (React + Mapbox)

Ensure **Node.js v16+** and **npm** are installed.

```bash
cd frontend
npm install
npm run dev
```

>  Set your **Mapbox token** inside `App.tsx` or configure it using a `.env` file.
>  Then visit: [http://localhost:5173](http://localhost:5173)

---

### 5. (Optional) Run ML Prediction Scripts

You can generate your own underserved map prediction via:

```bash
cd analysis
python generate_underserved_map.py
```

This outputs a `top_underserved.geojson` file for use in the app.

---

## Project Structure

```             
├── backend/               
│   ├── main.py
│   └── requirements.txt
├── data/  
├── frontend/             
│   └── App.tsx
├── notebooks/              
├── screenshots/          
└── README.md
```

---

## Libraries Used

### Python

- FastAPI
- GeoPandas
- NetworkX
- OSMnx
- scikit-learn
- Shapely
- Uvicorn
- Pandas
- Matplotlib (for visual inspection)

### TypeScript

- React
- Axios
- Mapbox GL JS
- Vite

---

## Results

- I identified underserved areas by computing the network-based travel distance to the nearest hospital and combining that with population.
- The ML model learned to approximate travel distance from geographic and demographic features, helping fill in coverage gaps.
- Users can click anywhere on the map to simulate placing a new hospital and see underserved scores and color scale adjust in real-time.
- **RMSE**:  1943.53 meters, roughly 2km off
- **$R^2$ Score**: 0.945

---

## License

MIT License. You are free to use, modify, and share this project.
