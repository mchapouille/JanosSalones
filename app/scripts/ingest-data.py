import pandas as pd
import json
import os
import re

# Paths
EXCEL_PATH = 'data/resultados_unificado.xlsx'
OUTPUT_JSON = 'src/lib/salones_data.json'

def clean_numeric(val):
    if pd.isna(val):
        return 0
    if isinstance(val, (int, float)):
        return float(val)
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
        return float(s)
    except:
        return 0

def clean_tier(tier_str):
    if pd.isna(tier_str):
        return 0
    # Extract number from "Tier 5", "tier_3", etc.
    match = re.search(r'(\d+)', str(tier_str))
    return int(match.group(1)) if match else 0

def clean_color(situacion):
    if pd.isna(situacion):
        return 'text-slate-400'
    text = str(situacion).upper()
    if 'REVISAR' in text or '🔴' in text:
        return 'text-red-500'
    if 'ESTÁNDAR' in text or '🟡' in text:
        return 'text-yellow-500'
    if 'ÓPTIMO' in text or '🟢' in text:
        return 'text-green-500'
    return 'text-slate-400'

def ingest():
    print(f"Reading {EXCEL_PATH}...")
    df = pd.read_excel(EXCEL_PATH)
    
    # Drop empty rows (usually at the end of Excel files)
    df = df.dropna(subset=['nombre_salon'])
    
    salones = []
    
    for _, row in df.iterrows():
        # Map basic fields
        salon = {
            "id_salon": int(row['id_salon']),
            "year": 2024, # Defaulting to current year as per user context
            "nombre_salon": str(row['nombre_salon']),
            "estado_salon": str(row['estado_salon']) if not pd.isna(row['estado_salon']) else "ACTIVO",
            "direccion_salon": str(row['direccion_salon']) if not pd.isna(row['direccion_salon']) else None,
            "cp_salon": str(row['cp_salon']) if not pd.isna(row['cp_salon']) else None,
            "municipio_salon": str(row['municipio_salon']) if not pd.isna(row['municipio_salon']) else None,
            "lat_salon": float(row['lat_salon']) if not pd.isna(row['lat_salon']) else None,
            "lon_salon": float(row['lon_salon']) if not pd.isna(row['lon_salon']) else None,
            "pax_calculado": clean_numeric(row['pax_calculado']),
            "pax_formal_pista": clean_numeric(row['pax_formal_pista']),
            "pax_informal_pista": clean_numeric(row['pax_informal_pista']),
            "pax_informal_auditorio": clean_numeric(row['pax_informal_auditorio']),
            "mt2_salon": clean_numeric(row['mt2_salon']),
            "cantidad_eventos_salon": int(clean_numeric(row['cantidad_eventos_salon'])),
            "total_invitados_salon": int(clean_numeric(row['total_invitados_salon'])),
            "costos_variables_salon": clean_numeric(row['costos_variables_salon']),
            "costos_fijos_salon": clean_numeric(row['costos_fijos_salon']),
            "ventas_totales_salon": clean_numeric(row['ventas_totales_salon']),
            "rentabilidad_salon": clean_numeric(row['rentabilidad_salon']),
            "tier": clean_tier(row['TIER']),
            
            # Sub-results (Calculated in Python to match the interface)
            "performance": {
                "breakEvenPoint": 0, # Could be calculated if needed
                "marginContribution": float(clean_numeric(row['ventas_totales_salon']) - clean_numeric(row['costos_variables_salon'])),
                "rentIncidence": clean_numeric(row['incidencia_alquiler']),
                "status": "normal", # Default
                "color": clean_color(row['SITUACION'])
            },
            "benchmark": {
                "rentPerMt2": clean_numeric(row['PRECIO_MT2']),
                "medianTier": clean_numeric(row['MED_MT2']),
                "deviation": 0, # Calculated in UI mostly
                "recommendation": str(row['SITUACION'])
            },
            "efficiency": {
                "rentPerPax": clean_numeric(row['PRECIO_PAX']),
                "medianPaxTier": clean_numeric(row['MED_PAX']),
                "efficiencyScore": clean_numeric(row['INDICE_GLOBAL'])
            },
            "contractAudit": {
                "deviationPercent": 0,
                "isAlert": False,
                "suggestedAdjustment": 0
            }
        }
        salones.append(salon)
        
    # Generate multi-year data for MVP demo if necessary, otherwise just use Excel
    # For now, let's keep only what's in Excel
    
    print(f"Writing {len(salones)} records to {OUTPUT_JSON}...")
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(salones, f, indent=2, ensure_ascii=False)
    
    print("Done!")

if __name__ == "__main__":
    # Ensure current dir is app
    if os.path.exists('data/resultados_unificado.xlsx'):
        ingest()
    else:
        print("Error: data/resultados_unificado.xlsx not found. Run from app root.")
