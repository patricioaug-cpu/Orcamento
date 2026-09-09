import {
  consultarItemPorDescricao,
  executarValidacaoCatalogo,
  getCatalogStats,
  normalizeItemDescription,
} from "./itemCatalogService";

console.log("=================================================");
console.log("=== TESTES DE VALIDAÇÃO: CATÁLOGO OFICIAL DE ITENS ===");
console.log("=================================================\n");

// 1. Verificar Carregamento das Estatísticas do Catálogo
const stats = getCatalogStats();
console.log("Estatísticas do Catálogo:");
console.log(`- Total de Registros: ${stats.totalRegistros}`);
console.log(`- Descrições Únicas: ${stats.totalDescricoesUnicas}`);
console.log(`- Descrições Ambíguas: ${stats.totalDescricoesAmbiguas}`);
console.log(`- Fonte: ${stats.fonte}`);
console.log(`- Versão: ${stats.versao}\n`);

if (stats.totalRegistros !== 1558) {
  console.error(`ERRO: Total de registros esperado 1558, obtido ${stats.totalRegistros}`);
  process.exit(1);
}

// 2. Teste de Normalização Segura
console.log("Teste de Normalização Segura:");
const rawSample = "   cabo   al 1x 50mm²  15kv  protegido   ";
const normalizedSample = normalizeItemDescription(rawSample);
console.log(`- Original: "${rawSample}"`);
console.log(`- Normalizado: "${normalizedSample}"`);
if (normalizedSample !== "CABO AL 1X50MM2 15KV PROTEGIDO") {
  console.error("ERRO na função de normalização!");
  process.exit(1);
}
console.log("Normalização aprovada.\n");

// 3. Execução da Bateria de Testes
console.log("Executando Bateria de Testes:");
const validacao = executarValidacaoCatalogo();

for (const res of validacao.resultados) {
  const icon = res.sucesso ? "✅" : "❌";
  console.log(`${icon} [${res.nomeTeste}]`);
  console.log(`   Entrada: "${res.entrada}"`);
  console.log(`   ${res.mensagem}`);
}

console.log("\n-------------------------------------------------");
console.log(`Resultado Final: ${validacao.testesPassaram}/${validacao.totalTestes} testes passaram.`);

if (!validacao.todosPassaram) {
  console.error("❌ FALHA EM UM OU MAIS TESTES DE VALIDAÇÃO!");
  process.exit(1);
} else {
  console.log("✅ TODOS OS TESTES PASSARAM COM SUCESSO!");
}
