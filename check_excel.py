import pandas as pd
import os

EXCEL_PATH = 'app/data/resultados_unificado.xlsx'

try:
    df = pd.read_excel(EXCEL_PATH, engine='openpyxl')
    print("Columns found:")
    for col in df.columns:
        print(f"- {col}")
except Exception as e:
    print(f"Error reading Excel: {e}")
