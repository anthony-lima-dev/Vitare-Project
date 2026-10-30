#!/usr/bin/env node
/**
 * Teste de regressão do contexto de build Docker (T-04).
 *
 * Validações:
 * 1. Todos os Dockerfiles ativam a MESMA versão do pnpm declarada em
 *    `packageManager` no package.json raiz (evita drift lockfile/build).
 * 2. Toda dependência `workspace:*` referenciada pelos apps tem seu
 *    package.json copiado no stage de dependências de cada Dockerfile.
 * 3. Dockerfiles de frontend copiam E constroem os pacotes workspace antes
 *    dos apps (seus `dist` são ignorados pelo git e não existem no contexto).
 * 4. O comando de produção da API aponta para o artefato realmente gerado
 *    por `nest build` (dist/src/main.js), igual ao script `start:prod`.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

const failures = [];
const check = (ok, message) => {
  if (ok) console.log(`ok  - ${message}`);
  else failures.push(message), console.error(`FAIL - ${message}`);
};

const rootPkg = JSON.parse(read("package.json"));
const pnpmVersion = rootPkg.packageManager.split("@")[1];

const dockerfiles = [
  "infra/local/Dockerfile.api",
  "infra/local/Dockerfile.web",
  "infra/public/Dockerfile.api",
  "infra/public/Dockerfile.web",
];
const contents = Object.fromEntries(dockerfiles.map((d) => [d, read(d)]));

// 1. Versão do pnpm consistente com packageManager.
for (const d of dockerfiles) {
  check(
    contents[d].includes(`corepack prepare pnpm@${pnpmVersion} --activate`),
    `${d} usa pnpm@${pnpmVersion} (igual ao packageManager)`,
  );
}

// 2. Manifests dos pacotes workspace presentes no stage de deps.
for (const pkg of ["packages/core-typings/package.json", "packages/ui-components/package.json"]) {
  for (const d of dockerfiles) {
    check(contents[d].includes(`COPY ${pkg}`), `${d} copia ${pkg}`);
  }
}

// 3. Dockerfiles web constroem os pacotes workspace antes dos apps.
for (const d of dockerfiles.filter((d) => d.endsWith(".web"))) {
  check(contents[d].includes("pnpm --filter @vitare/core-typings build"), `${d} constrói @vitare/core-typings`);
  check(contents[d].includes("pnpm --filter @vitare/ui-components build"), `${d} constrói @vitare/ui-components`);
  check(contents[d].includes("COPY packages packages"), `${d} copia o fonte de packages/`);
}

// 4. CMD de produção da API bate com o artefato do nest build.
const apiPkg = JSON.parse(read("apps/api/package.json"));
for (const d of dockerfiles.filter((d) => d.endsWith(".api"))) {
  const cmd = contents[d].match(/CMD \["node", "([^"]+)"\]/)?.[1];
  check(cmd === apiPkg.scripts["start:prod"].replace(/^node /, ""), `${d} CMD (${cmd}) == start:prod`);
}
check(
  read("apps/api/nest-cli.json").includes('"sourceRoot": "src"') && apiPkg.scripts["start:prod"] === "node dist/src/main.js",
  "nest build (sourceRoot src) + start:prod apontam para dist/src/main.js",
);

if (failures.length > 0) {
  console.error(`\n${failures.length} verificação(ões) falharam.`);
  process.exit(1);
}
console.log("\nContexto de build Docker verificado com sucesso.");
