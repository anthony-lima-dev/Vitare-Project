// Resolver customizado do Jest: o cliente Prisma gerado (moduleFormat "cjs")
// importa módulos internos com sufixo ".js" apontando para arquivos ".ts" —
// padrão do emissor TypeScript. Removemos o sufixo apenas quando a versão
// sem ele resolve; caso contrário devolvemos ao resolvedor padrão.
module.exports = function resolve(specifier, options) {
  const isRelative =
    specifier.startsWith('./') || specifier.startsWith('../');
  if (isRelative && specifier.endsWith('.js')) {
    try {
      return options.defaultResolver(specifier.slice(0, -3), options);
    } catch {
      return options.defaultResolver(specifier, options);
    }
  }
  return options.defaultResolver(specifier, options);
};
