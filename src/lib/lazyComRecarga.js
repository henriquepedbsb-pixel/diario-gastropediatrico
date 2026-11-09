import { lazy } from 'react'

const CHAVE = 'peddiario:recarregou-por-atualizacao'

/**
 * React.lazy com proteção para atualização do app.
 * Depois de uma nova publicação, quem está com o app aberto ainda aponta para
 * os arquivos antigos; ao tentar abrir uma tela, o download falha. Nesse caso
 * recarregamos a página uma única vez para buscar a versão nova.
 */
export default function lazyComRecarga(importar) {
  return lazy(() =>
    importar()
      .then(mod => {
        try { sessionStorage.removeItem(CHAVE) } catch { /* sem storage */ }
        return mod
      })
      .catch(erro => {
        let jaRecarregou = true
        try {
          jaRecarregou = sessionStorage.getItem(CHAVE) === '1'
          if (!jaRecarregou) sessionStorage.setItem(CHAVE, '1')
        } catch { /* sem storage: não arrisca laço de recarga */ }
        if (!jaRecarregou) {
          window.location.reload()
          return new Promise(() => {})   // segura a tela até recarregar
        }
        throw erro
      })
  )
}
