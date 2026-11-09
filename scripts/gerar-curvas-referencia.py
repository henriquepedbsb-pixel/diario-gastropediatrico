#!/usr/bin/env python3
"""
Gera src/lib/curvasReferencia.js a partir das tabelas publicadas:

  • OMS — WHO Child Growth Standards (2006), tabelas diárias LMS 0–1856 dias
    (peso/idade, comprimento-estatura/idade, perímetro cefálico/idade).
  • INTERGROWTH-21st — International Postnatal Growth Standards for Preterm
    Infants (Villar J et al. Lancet Glob Health 2015;3:e681-91), 27–64 semanas
    de idade pós-menstrual, centis e escores-z.

Cópias digitais das tabelas: repositório rOpenSci/gigs (data-raw/tables),
conferidas contra as publicações oficiais (OMS: 245/245 valores; INTERGROWTH:
38/38 linhas, peso masculino) antes do uso.

Uso: python3 scripts/gerar-curvas-referencia.py <caminho>/gigs/data-raw/tables
"""
import sys, os, json
import openpyxl

base = sys.argv[1]
DIAS_POR_MES = 30.4375

def who_lms(arquivo):
    ws = openpyxl.load_workbook(os.path.join(base, 'who_gs', arquivo), read_only=True).active
    rows = list(ws.iter_rows(values_only=True))
    hdr = {h: i for i, h in enumerate(rows[0])}
    by = {r[0]: r for r in rows[1:]}
    out = []
    for mes in range(0, 61):
        dia = mes * DIAS_POR_MES
        a = int(dia); f = dia - a
        ra, rb = by[a], by[min(a + 1, 1856)]
        L, M, S = (ra[hdr[k]] + (rb[hdr[k]] - ra[hdr[k]]) * f for k in ('L', 'M', 'S'))
        out.append([mes, round(L, 4), round(M, 4), round(S, 5)])
    return out

def ig_tabela(arquivo):
    linhas = []
    for l in open(os.path.join(base, 'ig_png', arquivo), encoding='utf-8-sig'):
        p = l.split()
        if p: linhas.append([int(p[0])] + [float(x) for x in p[1:]])
    return linhas

WHO = {
  'M': {'peso': who_lms('who_gs_wfa_male_percentiles.xlsx'),
        'comprimento': who_lms('who_gs_lhfa_male_percentiles.xlsx'),
        'pc': who_lms('who_gs_hcfa_male_percentiles.xlsx')},
  'F': {'peso': who_lms('who_gs_wfa_female_percentiles.xlsx'),
        'comprimento': who_lms('who_gs_lhfa_female_percentiles.xlsx'),
        'pc': who_lms('who_gs_hcfa_female_percentiles.xlsx')},
}
def ig(sexo, med):
    return {'centis': ig_tabela(f'ig_png_{med}_{sexo}_percentiles.csv'),
            'z': ig_tabela(f'ig_png_{med}_{sexo}_zscores.csv')}
IG = {
  'M': {'peso': ig('male', 'weight'), 'comprimento': ig('male', 'len'), 'pc': ig('male', 'hc')},
  'F': {'peso': ig('female', 'weight'), 'comprimento': ig('female', 'len'), 'pc': ig('female', 'hc')},
}

cab = '''/* ══════════════════════════════════════════════════════════════════════
   ARQUIVO GERADO — não editar à mão.
   Gerador: scripts/gerar-curvas-referencia.py

   OMS_LMS — WHO Child Growth Standards (2006). Parâmetros LMS mensais
     (0–60 meses), interpolados na idade exata em dias (mês = 30,4375 d)
     a partir das tabelas diárias oficiais. Formato: [mes, L, M, S].
     peso: peso/idade · comprimento: comprimento (<24 m) / estatura (≥24 m)
     · pc: perímetro cefálico/idade.
     Conferido: 245/245 valores da tabela oficial OMS peso/idade meninas
     (P3, P15, P50, P85, P97; 0–60 m) idênticos após arredondamento.

   IG_PNG — INTERGROWTH-21st International Postnatal Growth Standards for
     Preterm Infants. Villar J et al. Lancet Glob Health 2015;3:e681-91.
     27–64 semanas de idade pós-menstrual (IPM).
     centis: [ipm, P3, P5, P10, P50, P90, P95, P97]
     z:      [ipm, -3, -2, -1, 0, +1, +2, +3]
     Conferido: 38/38 linhas da tabela oficial (peso, meninos) idênticas.
   ══════════════════════════════════════════════════════════════════════ */
'''
js = cab + '\nexport const OMS_LMS = ' + json.dumps(WHO, separators=(',', ':')) + '\n\n' \
         + 'export const IG_PNG = ' + json.dumps(IG, separators=(',', ':')) + '\n'
destino = os.path.join(os.path.dirname(__file__), '..', 'src', 'lib', 'curvasReferencia.js')
open(destino, 'w', encoding='utf-8').write(js)
print('gerado:', os.path.normpath(destino), f'{len(js)/1024:.1f} KB')
