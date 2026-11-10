/* Pequenas preferências guardadas no aparelho (avisos já vistos/dispensados).
   O armazenamento pode estar indisponível (modo privado etc.), então nunca lança erro. */
const PREFIXO = 'peddiario:'

export const lerPreferencia = (chave) => {
  try { return window.localStorage.getItem(PREFIXO + chave) } catch { return null }
}

export const gravarPreferencia = (chave, valor = '1') => {
  try { window.localStorage.setItem(PREFIXO + chave, valor) } catch { /* sem armazenamento */ }
}
