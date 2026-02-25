import pandas as pd
import numpy as np
import json
import os
import math

# --- CONFIGURATION ---
EXCEL_PATH = 'data/resultados_unificado.xlsx'
OUTPUT_JSON = 'src/lib/salones_data.json'
SALONES_EXCLUIDOS_IDS = [82, 102, 117, 94, 98, 129, 133, 134, 119, 99, 7, 122]

def clean_numeric(val):
    if pd.isna(val):
        return 0
    if isinstance(val, (int, float)):
        res = float(val)
        return res if math.isfinite(res) else 0
    s = str(val).strip()
    if s == '-' or s.endswith('-'):
        return 0
    # Basic cleanup for currency/formatting
    s = s.replace('$', '').strip()
    # If the string contains both commas and dots, typically the dot is the decimal separator
    # E.g. $1,234.56 or $1,234,567.89
    if ',' in s and '.' in s:
        s = s.replace(',', '')
    elif ',' in s and '.' not in s:
        # E.g. $1234,56 -> $1234.56
        s = s.replace(',', '.')
    
    s = ''.join(c for c in s if c.isdigit() or c in '.,-')
    if not s or s == '-':
        return 0
    try:
        res = float(s)
        return res if math.isfinite(res) else 0
    except:
        return 0

def clean_tier_num(tier_str):
    if pd.isna(tier_str):
        return 5
    s = str(tier_str).lower()
    if 'tier' in s:
        import re
        match = re.search(r'(\d+)', s)
        return int(match.group(1)) if match else 5
    return 5

def map_tier_to_color(tier_str):
    if pd.isna(tier_str):
        return 'gray'
    s = str(tier_str).lower()
    if 'alta' in s or 'favorable' in s or 'óptimo' in s or 'green' in s:
        return 'green'
    if 'media' in s or 'estándar' in s or 'yellow' in s:
        return 'yellow'
    if 'baja' in s or 'revisar' in s or 'red' in s:
        return 'red'
    if 'muy_baja' in s or 'crítico' in s or 'critical' in s:
        return 'critical'
    return 'gray'

def assign_tier(municipio, nombre_salon):
    TIER_MAP = {
        "sans souci": 1, "costanera": 1, "alto avellaneda": 1, "dot": 1,
        "palermo": 2, "belgrano": 2, "pilar": 2, "recoleta": 2, "nuñez": 2,
        "canning": 3, "hudson": 3, "caballito": 3, "esteban echeverria": 3,
        "ramos mejia": 4, "san martin": 4, "la plata": 4, "avellaneda": 4, "lanus": 4,
        "villa luzuriaga": 5, "merlo": 5, "moreno": 5, "gonzalez catan": 5,
    }
    normalized_name = str(nombre_salon).lower()
    for key, tier in TIER_MAP.items():
        if key in normalized_name and tier == 1:
            return 1
            
    if pd.notna(municipio):
        normalized_muni = str(municipio).lower().strip()
        for key, tier in TIER_MAP.items():
            if key in normalized_muni:
                return tier
    return 4

def procesar_datos_dashboard(ruta_archivo):
    print(f"Reading {ruta_archivo}...")
    df = pd.read_excel(ruta_archivo)
    
    # Normalize column names
    df.columns = [str(c).strip().lower().replace(' ', '_') for c in df.columns]
    
    # Check if this is the "new" strictly raw data and alias the required benchmark columns
    # In raw data, might be named differently
    if 'precio_por_mt2' not in df.columns and 'mt2_mercado' in df.columns:
         # Needs to be generated later
         pass
    
    # If the user's base already has median benchmarking, use it, otherwise mock for now if missing
    if 'mediana_benchmarking_mt' not in df.columns:
        if 'mt2_mercado' in df.columns:
            df['mediana_benchmarking_mt'] = df['mt2_mercado']
        else:
             df['mediana_benchmarking_mt'] = 0

    # Ensure required raw columns exist
    cols_numericas = ['cantidad_eventos_salon', 'total_invitados_salon', 'costos_variables_salon',
                      'costos_fijos_salon', 'ventas_totales_salon', 'mt2_salon', 'pax_calculado',
                      'meses_activos', 'mediana_benchmarking_mt']
    
    for col in cols_numericas:
        if col not in df.columns:
            # Try to map from existing formats
            if col == 'meses_activos' and 'meses_activo' in df.columns:
                df['meses_activos'] = df['meses_activo']
            else:
                df[col] = 0
        df[col] = df[col].apply(clean_numeric)

    # Use tier_salon from Excel if available, otherwise calculate with assign_tier()
    if 'tier_salon' in df.columns:
        df['tier_salon'] = df.apply(
            lambda row: str(assign_tier(row.get('municipio_salon'), row.get('nombre_salon')))
            if pd.isna(row.get('tier_salon')) or str(row.get('tier_salon')).strip() == ''
            else str(row.get('tier_salon')),
            axis=1
        )
    else:
        df['tier_salon'] = df.apply(lambda row: str(assign_tier(row.get('municipio_salon'), row.get('nombre_salon'))), axis=1)

    # Handle missing id_salon
    if 'id_salon' not in df.columns:
        df['id_salon'] = range(1, len(df) + 1)
        
    df['id_salon'] = pd.to_numeric(df['id_salon'], errors='coerce').fillna(0).astype(int)
        
    # 2. Separar base (procesables y excluidos)
    df_excluidos = df[df['id_salon'].isin(SALONES_EXCLUIDOS_IDS)].copy()
    if not df_excluidos.empty:
        df_excluidos['orden_excluido'] = df_excluidos['id_salon'].apply(lambda x: SALONES_EXCLUIDOS_IDS.index(x) if x in SALONES_EXCLUIDOS_IDS else 999)
        df_excluidos = df_excluidos.sort_values(by='orden_excluido').drop(columns=['orden_excluido'])
    
    df_procesables = df[~df['id_salon'].isin(SALONES_EXCLUIDOS_IDS)].copy()
    
    # Replace active months zero to prevent division by zero
    df_procesables['meses_activos'] = df_procesables['meses_activos'].replace(0, 1)
    
    # --- MÓDULO 1: RENTABILIDAD ---
    # Only require ventas > 0 and meses_activos > 0; protect individual divisions below
    idx_v = (df_procesables['ventas_totales_salon'] > 0) & df_procesables['ventas_totales_salon'].notna() & (df_procesables['meses_activos'] > 0)

    # Safe divisors: replace 0 with NaN to avoid division by zero, result stays NaN → later filled to 0
    eventos_safe = df_procesables.loc[idx_v, 'cantidad_eventos_salon'].replace(0, np.nan)
    invitados_safe = df_procesables.loc[idx_v, 'total_invitados_salon'].replace(0, np.nan)
    fijos_safe = df_procesables.loc[idx_v, 'costos_fijos_salon'].replace(0, np.nan)

    df_procesables.loc[idx_v, 'venta_x_evento_promedio_anual'] = df_procesables.loc[idx_v, 'ventas_totales_salon'] / eventos_safe
    df_procesables.loc[idx_v, 'venta_promedio_invitado_anual'] = df_procesables.loc[idx_v, 'ventas_totales_salon'] / invitados_safe
    df_procesables.loc[idx_v, 'venta_mensual_promedio_meses_activo'] = df_procesables.loc[idx_v, 'ventas_totales_salon'] / df_procesables.loc[idx_v, 'meses_activos']
    
    # Retorno e incidencia solo cuando hay costos fijos
    venta_mensual_v = df_procesables.loc[idx_v, 'venta_mensual_promedio_meses_activo']
    df_procesables.loc[idx_v, 'retorno_sobre_alquiler'] = venta_mensual_v / fijos_safe
    df_procesables.loc[idx_v, 'incidencia_alquiler_sobre_facturacion_anual'] = (df_procesables.loc[idx_v, 'costos_fijos_salon'] / venta_mensual_v.replace(0, np.nan)) * 100

    df_procesables.loc[idx_v, 'margen_individual'] = (
        df_procesables.loc[idx_v, 'ventas_totales_salon']
        - df_procesables.loc[idx_v, 'costos_variables_salon']
        - (df_procesables.loc[idx_v, 'costos_fijos_salon'] * 12)
    )
    
    margen_total_empresa = df_procesables.loc[idx_v, 'margen_individual'].sum()
    if margen_total_empresa > 0:
        df_procesables.loc[idx_v, 'participacion_margen'] = (df_procesables.loc[idx_v, 'margen_individual'] / margen_total_empresa) * 100
    else:
        df_procesables.loc[idx_v, 'participacion_margen'] = 0
        
    df_procesables.loc[idx_v, 'costos_totales_salon'] = (
        df_procesables.loc[idx_v, 'costos_variables_salon']
        + (df_procesables.loc[idx_v, 'costos_fijos_salon'] * df_procesables.loc[idx_v, 'meses_activos'])
    )
    df_procesables.loc[idx_v, 'rentabilidad_salon'] = (
        (df_procesables.loc[idx_v, 'ventas_totales_salon'] - df_procesables.loc[idx_v, 'costos_totales_salon'])
        / df_procesables.loc[idx_v, 'ventas_totales_salon']
    )


    # Scores y Semáforo Performance
    mar_meta = np.percentile(df_procesables.loc[idx_v, 'margen_individual'].dropna(), 95) if df_procesables.loc[idx_v, 'margen_individual'].notna().any() else 0
    if mar_meta == 0: mar_meta = 1
    
    # Safe interpolation mapping for numpy
    def interpolate_array(arr, xp, fp):
        return np.interp(arr, xp, fp)
        
    pts_inc = interpolate_array(df_procesables.loc[idx_v, 'incidencia_alquiler_sobre_facturacion_anual'].fillna(0), [5, 30], [100, 0])
    pts_mar = interpolate_array(df_procesables.loc[idx_v, 'margen_individual'].fillna(0), [0, mar_meta], [0, 100])
    pts_eve = interpolate_array(df_procesables.loc[idx_v, 'venta_x_evento_promedio_anual'].fillna(0), [10000000, 40000000], [0, 100])
    pts_inv = interpolate_array(df_procesables.loc[idx_v, 'venta_promedio_invitado_anual'].fillna(0), [150000, 500000], [0, 100])
    
    ip_score = (pts_mar * 0.40) + (pts_inc * 0.30) + (pts_eve * 0.15) + (pts_inv * 0.15)
    df_procesables.loc[idx_v, 'ip_score'] = np.where(df_procesables.loc[idx_v, 'margen_individual'] < 0, 0, ip_score)
    
    # Asignación del Semáforo Performance
    df_procesables.loc[idx_v, 'semaforo_performance'] = np.where(df_procesables.loc[idx_v, 'ip_score'] >= 60, "alta",
                                                        np.where(df_procesables.loc[idx_v, 'ip_score'] >= 40, "media",
                                                        np.where(df_procesables.loc[idx_v, 'ip_score'] >= 5, "baja", "muy_baja")))
    
    # Formateo a decimal
    df_procesables.loc[idx_v, 'incidencia_alquiler_sobre_facturacion_anual'] = df_procesables.loc[idx_v, 'incidencia_alquiler_sobre_facturacion_anual'] / 100
    df_procesables.loc[idx_v, 'participacion_margen'] = df_procesables.loc[idx_v, 'participacion_margen'] / 100

    # --- MÓDULO 2: BENCHMARKING ---
    idx_b = (df_procesables['mt2_salon'].gt(0) & df_procesables['costos_fijos_salon'].gt(0) &
             df_procesables['mediana_benchmarking_mt'].notna() & df_procesables['mediana_benchmarking_mt'].gt(0) &
             (df_procesables['tier_salon'].str.upper() != 'TIER 1') & (df_procesables['tier_salon'] != '1'))
    
    df_procesables.loc[idx_b, 'precio_mt2'] = df_procesables.loc[idx_b, 'costos_fijos_salon'] / df_procesables.loc[idx_b, 'mt2_salon']
    df_procesables.loc[idx_b, 'semaforo_benchmarking'] = (df_procesables.loc[idx_b, 'precio_mt2'] - df_procesables.loc[idx_b, 'mediana_benchmarking_mt']) / df_procesables.loc[idx_b, 'mediana_benchmarking_mt']

    # --- MÓDULO 3: EFICIENCIA ---
    idx_ef = (df_procesables['pax_calculado'].gt(0) & df_procesables['mt2_salon'].gt(0) & df_procesables['costos_fijos_salon'].gt(0))
    
    df_procesables.loc[idx_ef, 'precio_pax'] = df_procesables.loc[idx_ef, 'costos_fijos_salon'] / df_procesables.loc[idx_ef, 'pax_calculado']
    
    # Medians per tier
    # Si calculamos medianas per tier:
    med_pax = df_procesables.loc[idx_ef].groupby('tier_salon')['precio_pax'].transform('median')
    med_mt2 = df_procesables.loc[idx_ef].groupby('tier_salon')['precio_mt2'].transform('median')
    
    df_procesables.loc[idx_ef, 'med_pax'] = med_pax
    df_procesables.loc[idx_ef, 'med_mt2'] = med_mt2
    
    # Avoid div by 0
    valid_pax = med_pax > 0
    valid_mt2 = med_mt2 > 0
    idx_ef_valid = idx_ef & valid_pax & valid_mt2

    if idx_ef_valid.any():
        df_procesables.loc[idx_ef_valid, 'indice_global_desviacion_mediana'] = ((df_procesables.loc[idx_ef_valid, 'precio_pax'] / df_procesables.loc[idx_ef_valid, 'med_pax']) + (df_procesables.loc[idx_ef_valid, 'precio_mt2'] / df_procesables.loc[idx_ef_valid, 'med_mt2'])) / 2
        df_procesables.loc[idx_ef_valid, 'semaforo_eficiencia'] = np.where(df_procesables.loc[idx_ef_valid, 'indice_global_desviacion_mediana'] > 1.25, "REVISAR",
                                                            np.where(df_procesables.loc[idx_ef_valid, 'indice_global_desviacion_mediana'] < 0.85, "FAVORABLE", "ESTANDAR"))

    # 3. Unificar Base Completa
    df_unificado = pd.concat([df_procesables, df_excluidos], ignore_index=True)
    
    cols_calc_num = ['venta_x_evento_promedio_anual', 'venta_promedio_invitado_anual', 'venta_mensual_promedio_meses_activo', 
                     'retorno_sobre_alquiler', 'incidencia_alquiler_sobre_facturacion_anual', 'margen_individual', 
                     'participacion_margen', 'costos_totales_salon', 'rentabilidad_salon', 'ip_score', 'precio_mt2', 
                     'semaforo_benchmarking', 'precio_pax', 'med_pax', 'med_mt2', 'indice_global_desviacion_mediana']
    cols_calc_texto = ['semaforo_performance', 'semaforo_eficiencia']
    
    for col in cols_calc_num:
        if col not in df_unificado.columns: df_unificado[col] = np.nan
        df_unificado[col] = df_unificado[col].fillna(0).replace([np.inf, -np.inf], 0)
        
    for col in cols_calc_texto:
        if col not in df_unificado.columns: df_unificado[col] = np.nan
        df_unificado[col] = df_unificado[col].fillna('null')

    # Convert to JSON format matching the Frontend's SalonIntegral expected structure
    salones = []
    
    for _, row in df_unificado.iterrows():
        estado_raw = str(row.get('estado_salon', 'ACTIVO')).upper()
        if estado_raw == "INACTIVO":
            estado_salon = "DEVUELTOS"
        elif "OBRA" in estado_raw:
            estado_salon = "OBRA"
        else:
            estado_salon = "ACTIVO"

        year_raw = row.get('año')
        year = int(year_raw) if not pd.isna(year_raw) else 2025

        # Get values safely
        def safe_float(val):
            return float(val) if pd.notna(val) else 0.0

        lat = safe_float(row.get('lat_salon'))
        lon = safe_float(row.get('lon_salon'))
        
        # Color mappers based on processed semantics
        perf_color = map_tier_to_color(row['semaforo_performance'])
        
        bench_score = safe_float(row['semaforo_benchmarking'])
        if bench_score <= 0: bench_color = 'green'
        elif bench_score <= 0.5: bench_color = 'yellow'
        else: bench_color = 'red'
        
        eff_index = safe_float(row['indice_global_desviacion_mediana'])
        if eff_index == 0: eff_color = 'gray'
        elif eff_index < 1.0: eff_color = 'green'
        elif eff_index <= 1.25: eff_color = 'yellow'
        else: eff_color = 'red'

        salon = {
            "id_salon": int(row['id_salon']),
            "year": year,
            "nombre_salon": str(row['nombre_salon']) if pd.notna(row.get('nombre_salon')) else f"Salon {row['id_salon']}",
            "estado_salon": estado_salon,
            "direccion_salon": str(row['direccion_salon']) if pd.notna(row.get('direccion_salon')) else None,
            "cp_salon": str(row['cp_salon']) if pd.notna(row.get('cp_salon')) else None,
            "municipio_salon": str(row['municipio_salon']) if pd.notna(row.get('municipio_salon')) else None,
            "lat_salon": lat if lat != 0 else None,
            "lon_salon": lon if lon != 0 else None,
            "pax_calculado": safe_float(row['pax_calculado']),
            "mt2_salon": safe_float(row['mt2_salon']),
            "cantidad_eventos_salon": int(safe_float(row['cantidad_eventos_salon'])),
            "total_invitados_salon": int(safe_float(row['total_invitados_salon'])),
            "costos_variables_salon": safe_float(row['costos_variables_salon']),
            "costos_fijos_salon": safe_float(row['costos_fijos_salon']),
            "costos_totales_salon": safe_float(row['costos_totales_salon']),
            "ventas_totales_salon": safe_float(row['ventas_totales_salon']),
            "rentabilidad_salon": safe_float(row['rentabilidad_salon']),
            "tier": clean_tier_num(row['tier_salon']),
            
            "performance": {
                "rentIncidence": safe_float(row['incidencia_alquiler_sobre_facturacion_anual']),
                "multiplier": safe_float(row['retorno_sobre_alquiler']),
                "marginContribution": safe_float(row['participacion_margen']),
                "score": safe_float(row['ip_score']),
                "color": perf_color,
                "classification": "normal"
            },
            "benchmark": {
                "rentPerMt2": safe_float(row['precio_mt2']),
                "marketMt2": safe_float(row['mediana_benchmarking_mt']),
                "marketDeviation": safe_float(row['semaforo_benchmarking']),
                "marketCostPerMt2": safe_float(row['mediana_benchmarking_mt']),
                "deviation": safe_float(row['semaforo_benchmarking']) * 100,
                "color": bench_color
            },
            "efficiency": {
                "rentPerPax": safe_float(row['precio_pax']),
                "paxRatio": safe_float(row['precio_pax']) / safe_float(row['med_pax']) if safe_float(row['med_pax']) > 0 else 0,
                "mt2Ratio": safe_float(row['precio_mt2']) / safe_float(row['med_mt2']) if safe_float(row['med_mt2']) > 0 else 0,
                "medianPaxTier": safe_float(row['med_pax']),
                "globalIndex": eff_index,
                "medianDeviation": (eff_index - 1) * 100 if eff_index > 0 else 0,
                "color": eff_color
            },
            "contractAudit": {
                "contractAmount": safe_float(row['costos_fijos_salon']),
                "realPayment": safe_float(row['costos_fijos_salon']),
                "deviationPercent": 0,
                "color": "green"
            },
            "extra": {
                "meses_activos": safe_float(row.get('meses_activos', 12)),
                "ticket_evento": safe_float(row['venta_x_evento_promedio_anual']),
                "ticket_persona": safe_float(row['venta_promedio_invitado_anual']),
                "venta_mensual": safe_float(row['venta_mensual_promedio_meses_activo'])
            }
        }
        salones.append(salon)
    
    print(f"Writing {len(salones)} records to {OUTPUT_JSON}...")
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(salones, f, indent=2, ensure_ascii=False)
    
    print("Data processing complete!")

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    app_dir = os.path.dirname(script_dir)
    
    abs_path = os.path.join(app_dir, EXCEL_PATH)
    OUTPUT_JSON = os.path.join(app_dir, OUTPUT_JSON)

    if os.path.exists(abs_path):
        procesar_datos_dashboard(abs_path)
    else:
        print(f"Error: {EXCEL_PATH} not found at {abs_path}.")
