import pandas as pd
import json
import os
import re
import math
import requests

# Paths
EXCEL_PATH = 'data/resultados_unificado.xlsx'
OUTPUT_JSON = 'src/lib/salones_data.json'

def load_maps_key():
    # Try looking in .env.local first
    env_path = '.env.local'
    if not os.path.exists(env_path):
        env_path = os.path.join('app', env_path)
    
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                if 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY' in line:
                    return line.split('=')[1].strip().strip('"')
    return os.environ.get('GOOGLE_MAPS_API_KEY')

MAPS_API_KEY = load_maps_key()

def geocode(address):
    if not MAPS_API_KEY:
        return None, None
    try:
        url = f"https://maps.googleapis.com/maps/api/geocode/json?address={address}&key={MAPS_API_KEY}"
        r = requests.get(url).json()
        if r['status'] == 'OK':
            loc = r['results'][0]['geometry']['location']
            return loc['lat'], loc['lng']
    except:
        pass
    return None, None

def clean_numeric(val):
    if pd.isna(val):
        return 0
    if isinstance(val, (int, float)):
        res = float(val)
        return res if math.isfinite(res) else 0
    # Handle strings like "$  -" or "$ 1.234,56"
    s = str(val).strip()
    if s == '-' or s.endswith('-'):
        return 0
    # Remove currency symbols and formatting, handle Spanish decimal commas if present
    s = re.sub(r'[^\d,.-]', '', s)
    if not s:
        return 0
    try:
        # If there's a comma and it's used as a decimal separator (common in LatAm/Spain)
        if ',' in s and '.' not in s:
            s = s.replace(',', '.')
        elif ',' in s and '.' in s:
            # Assume dot is thousand separator and comma is decimal
            s = s.replace('.', '').replace(',', '.')
        res = float(s)
        return res if math.isfinite(res) else 0
    except:
        return 0

def clean_tier_num(tier_str):
    if pd.isna(tier_str):
        return 0
    match = re.search(r'(\d+)', str(tier_str))
    return int(match.group(1)) if match else 0

def map_tier_to_color(tier_str):
    if pd.isna(tier_str):
        return 'gray'
    s = str(tier_str).lower()
    if 'tier_1' in s or 'favorable' in s or 'óptimo' in s:
        return 'green'
    if 'tier_2' in s or 'estándar' in s:
        return 'yellow'
    if 'tier_3' in s or 'revisar' in s:
        return 'red'
    if 'tier_4' in s or 'crítico' in s:
        return 'critical'
    return 'gray'

def ingest():
    print(f"Reading {EXCEL_PATH}...")
    df = pd.read_excel(EXCEL_PATH)
    
    # Drop empty rows (usually at the end of Excel files)
    df = df.dropna(subset=['nombre_salon'])
    
    salones = []
    
    for _, row in df.iterrows():
        # Map basic fields
        estado_raw = str(row.get('estado_salon', 'ACTIVO')).upper()
        if estado_raw == "INACTIVO":
            estado_salon = "DEVUELTOS"
        elif "OBRA" in estado_raw:
            estado_salon = "OBRA"
        else:
            estado_salon = "ACTIVO"

        # Year handling
        year_raw = row.get('año')
        year = int(year_raw) if not pd.isna(year_raw) else 2025

        # Coordinate handling with geocoding fallback
        lat = float(row.get('lat_salon')) if not pd.isna(row.get('lat_salon')) else None
        lon = float(row.get('lon_salon')) if not pd.isna(row.get('lon_salon')) else None
        
        # If missing coords, try to geocode
        if (lat is None or lon is None or lat == 0) and MAPS_API_KEY:
            addr_part = str(row.get('direccion_salon', '')) if not pd.isna(row.get('direccion_salon')) else ''
            muni_part = str(row.get('municipio_salon', '')) if not pd.isna(row.get('municipio_salon')) else ''
            
            if addr_part or muni_part:
                address = f"{addr_part}, {muni_part}, Argentina".strip(', ')
                print(f"Geocoding: {address}...")
                g_lat, g_lon = geocode(address)
                if g_lat and g_lon:
                    lat, lon = g_lat, g_lon
                    print(f"  Success: {lat}, {lon}")

        salon = {
            "id_salon": int(row['id_salon']),
            "year": year,
            "nombre_salon": str(row['nombre_salon']),
            "estado_salon": estado_salon,
            "direccion_salon": str(row.get('direccion_salon')) if not pd.isna(row.get('direccion_salon')) else None,
            "cp_salon": str(row.get('cp_salon')) if not pd.isna(row.get('cp_salon')) else None,
            "municipio_salon": str(row.get('municipio_salon')) if not pd.isna(row.get('municipio_salon')) else None,
            "lat_salon": lat,
            "lon_salon": lon,
            "pax_calculado": clean_numeric(row.get('pax_calculado')),
            "mt2_salon": clean_numeric(row.get('mt2_salon')),
            "cantidad_eventos_salon": int(clean_numeric(row.get('cantidad_eventos_salon'))),
            "total_invitados_salon": int(clean_numeric(row.get('total_invitados_salon'))),
            "costos_variables_salon": clean_numeric(row.get('costos_variables_salon')),
            "costos_fijos_salon": clean_numeric(row.get('costos_fijos_salon')),
            "ventas_totales_salon": clean_numeric(row.get('ventas_totales_salon')),
            "rentabilidad_salon": clean_numeric(row.get('rentabilidad_salon')),
            "tier": clean_tier_num(row.get('semaforo_tipo_salon')),
            
            # Sub-results
            "performance": {
                "rentIncidence": clean_numeric(row.get('incidencia_alquiler_sobre_facturacion_anual')) * 100,
                "multiplier": clean_numeric(row.get('retorno_sobre_alquiler (x)')),
                "marginContribution": clean_numeric(row.get('ventas_totales_salon')) - clean_numeric(row.get('costos_totales_salon')),
                "color": map_tier_to_color(row.get('semaforo_incidencia_aliquiler')),
                "classification": "normal"
            },
            "benchmark": {
                "rentPerMt2": clean_numeric(row.get('precio_por_mt2')),
                "marketCostPerMt2": clean_numeric(row.get('mt2_mercado')),
                "deviation": clean_numeric(row.get('desvio_salon_vs_mercado')) * 100,
                "color": "yellow" if clean_numeric(row.get('desvio_salon_vs_mercado')) > 0.5 else "green" # simple logic
            },
            "efficiency": {
                "rentPerPax": clean_numeric(row.get('precio_pax')),
                "medianPaxTier": clean_numeric(row.get('med_pax')),
                "globalIndex": clean_numeric(row.get('semaforo_indice_global_desviacion_mediana')),
                "color": map_tier_to_color(row.get('semaforo_indice_global'))
            },
            "contractAudit": {
                "contractAmount": clean_numeric(row.get('alquiler_pactado_usd')) * 1470 if clean_numeric(row.get('alquiler_pactado_usd')) > 0 else clean_numeric(row.get('precio_alquiler')),
                "realPayment": clean_numeric(row.get('costos_fijos_salon')),
                "deviationPercent": 0, # Will be recalculated in frontend but good to have context
                "color": "green"
            },
            "extra": {
                "meses_activos": clean_numeric(row.get('meses_activos')),
                "ticket_evento": clean_numeric(row.get('venta_x_evento_promedio_anual')),
                "ticket_persona": clean_numeric(row.get('venta_promedio_invitado_anual')),
                "venta_mensual": clean_numeric(row.get('venta_mensual_promedio_meses_activo'))
            }
        }
        salones.append(salon)
    
    print(f"Writing {len(salones)} records to {OUTPUT_JSON}...")
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(salones, f, indent=2, ensure_ascii=False)
    
    print("Done!")

if __name__ == "__main__":
    if os.path.exists(EXCEL_PATH):
        ingest()
    else:
        # Fallback to absolute path if relative fails
        abs_path = os.path.join(os.getcwd(), 'app', EXCEL_PATH)
        if os.path.exists(abs_path):
             EXCEL_PATH = abs_path
             ingest()
        else:
            print(f"Error: {EXCEL_PATH} not found.")
