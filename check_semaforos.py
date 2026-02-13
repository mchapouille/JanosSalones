import pandas as pd

EXCEL_PATH = 'app/data/resultados_unificado.xlsx'

try:
    df = pd.read_excel(EXCEL_PATH, engine='openpyxl')
    cols = ['semaforo_performance', 'semaforo_benchmarking', 'semaforo_indice_global']
    for col in cols:
        if col in df.columns:
            print(f"\nUnique values in {col}:")
            print(df[col].unique())
        else:
            print(f"\nColumn {col} not found!")
except Exception as e:
    print(f"Error: {e}")
