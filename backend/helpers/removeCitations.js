module.exports = function removerCitacoes(texto) {
    return texto.replace(/【\d+:\d+†[^】]+】/g, '')
}