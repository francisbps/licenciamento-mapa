// Obras-exemplo com a resposta certa conhecida. Corre com: node testes/obras-exemplo.test.js
// Cada exemplo diz o tipo de obra, as respostas e o que a app tem de concluir:
// o procedimento (p) e um artigo que tem de aparecer na base legal (ref).
// Procedimentos: isento, isentoTermo, cp (comunicação prévia), cpPrazo, cpUtil, lic (licença), pedido.
// Quando a lei mudar, corrija aqui a resposta certa primeiro e depois a regra em regras.js.
const path = require("path");
const R = require(path.join(__dirname, "..", "regras.js"));

const EXEMPLOS = [
  // Obras num edifício existente
  { nome: "Remodelar a cozinha sem mexer na estrutura", s: { tipoSel: "interior", q: { predio: "apartamento", estrutura: "nao", fachada: "nao", comuns: "nao", classificado: "nao" } }, p: "isento", ref: "art. 6.º, n.º 1, al. b)" },
  { nome: "Deitar abaixo uma parede resistente", s: { tipoSel: "interior", q: { predio: "apartamento", estrutura: "sim", fachada: "nao", comuns: "nao", classificado: "nao" } }, p: "isentoTermo", ref: "art. 6.º, n.º 1, al. b)" },
  { nome: "Pintar e reparar só o interior", s: { tipoSel: "conservacao", q: { predio: "moradia", onde: "interior", classificado: "nao" } }, p: "isento", ref: "art. 6.º, n.º 1, al. a)" },
  { nome: "Reparar a fachada tirando azulejos", s: { tipoSel: "conservacao", q: { predio: "edificio", onde: "fachada", azulejos: "sim", classificado: "nao" } }, p: "lic", ref: "art. 4.º, n.º 2, al. i)" },
  { nome: "Trocar janelas por outras iguais", s: { tipoSel: "vaos", q: { predio: "apartamento", vaosIgual: "sim", classificado: "nao" } }, p: "isento", ref: "art. 6.º-A, n.º 1, al. j)" },
  { nome: "Mudar a fachada em zona urbana consolidada, sem subir a altura", s: { tipoSel: "fachada", q: { predio: "moradia", revIgual: "nao", loteamento: "nao", zuc: "sim", cercea: "sim", classificado: "nao" } }, p: "cp", ref: "art. 4.º, n.º 4, al. e)" },
  { nome: "Mudar a fachada fora de zona consolidada e de loteamento", s: { tipoSel: "fachada", q: { predio: "moradia", revIgual: "nao", loteamento: "nao", zuc: "nao", classificado: "nao" } }, p: "lic", ref: "art. 4.º, n.º 2, al. c)" },
  { nome: "Ampliar uma moradia num lote de loteamento", s: { tipoSel: "ampliacao", q: { predio: "moradia", loteamento: "sim", classificado: "nao" } }, p: "cp", ref: "art. 4.º, n.º 4, al. d)" },
  { nome: "Ampliar uma moradia em REN (encontrada no mapa)", s: { tipoSel: "ampliacao", condMapa: ["ren"], doMapa: true, q: { predio: "moradia", loteamento: "nao", zuc: "sim", cercea: "sim", classificado: "nao" } }, p: "lic", ref: "art. 4.º, n.º 2, al. h)" },
  { nome: "Reconstruir repondo fachadas e cobertura", s: { tipoSel: "reconstrucao", q: { predio: "moradia", reconstFiel: "sim", classificado: "nao" } }, p: "isento", ref: "art. 6.º, n.º 1, al. e)" },
  { nome: "Painéis solares e carregador", s: { tipoSel: "equipamentos", q: { predio: "moradia", equip: ["solar", "carregador"], classificado: "nao" } }, p: "isento", ref: "art. 6.º-A, n.º 1, al. g)" },
  { nome: "Só um carregador de carro elétrico", s: { tipoSel: "equipamentos", q: { predio: "apartamento", equip: ["carregador"], classificado: "nao" } }, p: "isento", ref: "art. 2.º, al. j)" },
  { nome: "Demolir só, sem obra a seguir", s: { tipoSel: "demolicao", q: { predio: "moradia", demoTipo: "so", loteamento: "nao", classificado: "nao" } }, p: "lic", ref: "art. 4.º, n.º 2, al. f)" },
  { nome: "Demolir uma construção ilegal", s: { tipoSel: "demolicao", q: { predio: "moradia", demoTipo: "ilegal", classificado: "nao" } }, p: "isento", ref: "art. 6.º, n.º 1, al. i)" },
  // Construção nova e espaço exterior
  { nome: "Casa nova com PIP completo favorável", s: { tipoSel: "nova", q: { pip: "sim", classificado: "nao" } }, p: "isento", ref: "art. 6.º, n.º 1, al. h)" },
  { nome: "Casa nova fora de loteamento e de zona consolidada", s: { tipoSel: "nova", q: { pip: "nao", loteamento: "nao", zuc: "nao", classificado: "nao" } }, p: "lic", ref: "art. 4.º, n.º 2, al. c)" },
  { nome: "Anexo até 10 m²", s: { tipoSel: "anexo", q: { predio: "moradia", anexoArea: "ate10", classificado: "nao" } }, p: "isento", ref: "art. 6.º-A" },
  { nome: "Muro de vedação até 1,8 m sem confinar com a rua", s: { tipoSel: "muro", q: { predio: "moradia", muroAlt: "ate", muroVia: "nao", classificado: "nao" } }, p: "isento", ref: "art. 6.º-A" },
  { nome: "Piscina de uma moradia", s: { tipoSel: "piscina", q: { predio: "moradia", piscinaAssoc: "sim", pip: "nao", loteamento: "nao", classificado: "nao" } }, p: "cp", ref: "art. 4.º, n.º 4, al. j)" },
  // Uso e utilização
  { nome: "Habitação para alojamento local, sem obras", s: { tipoSel: "uso", q: { predio: "apartamento", usoAtual: "habitacao", usoNovo: "al", classificado: "nao" } }, p: "cpPrazo", ref: "art. 4.º, n.º 5" },
  { nome: "Utilização depois de obra licenciada", s: { tipoSel: "utilizacao", q: { predio: "moradia", utilObra: "controlada", classificado: "nao" } }, p: "cpUtil", ref: "art. 62.º-A" },
  { nome: "Edifício anterior a 1951 sem licença de utilização", s: { tipoSel: "utilizacao", q: { predio: "edificio", utilObra: "anterior1951", classificado: "nao" } }, p: "pedido", ref: "RGEU" },
  // Terrenos, processos em curso
  { nome: "Destaque dentro do perímetro urbano, sem frente para arruamento", s: { tipoSel: "destaque", q: { destPerim: "dentro", destVia: "nao" } }, p: "lic", ref: "art. 6.º, n.º 4" },
  { nome: "Destaque fora do perímetro urbano", s: { tipoSel: "destaque", q: { destPerim: "fora" } }, p: "isento", ref: "art. 6.º, n.º 1, al. d)" },
  { nome: "Legalizar uma ampliação feita sem licença", s: { tipoSel: "legalizacao", q: { predio: "moradia", legalTipo: "ampliacao", classificado: "nao" } }, p: "lic", ref: "art. 102.º-A" },
  { nome: "Prorrogar o prazo da obra", s: { tipoSel: "prazoObra", q: { prazoTipo: "prorrogar" } }, p: "pedido", ref: "art. 58.º" },
  // Património
  { nome: "Remodelar o interior de um imóvel classificado", s: { tipoSel: "interior", q: { predio: "edificio", estrutura: "nao", fachada: "nao", classificado: "sim" } }, p: "lic", ref: "art. 4.º, n.º 2, al. d)" },
  { nome: "Conservar um imóvel classificado", s: { tipoSel: "conservacao", q: { predio: "edificio", onde: "interior", classificado: "sim" } }, p: "isento", ref: "art. 6.º, n.º 1, al. k)" },
  { nome: "Anexo pequeno na zona de proteção de um monumento", s: { tipoSel: "anexo", q: { predio: "moradia", anexoArea: "ate10", classificado: "zp" } }, p: "lic", ref: "art. 4.º, n.º 2, al. d)" },
  { nome: "Janelas iguais na zona de proteção de um monumento", s: { tipoSel: "vaos", q: { predio: "apartamento", vaosIgual: "sim", classificado: "zp" } }, p: "isento", ref: "art. 6.º-A, n.º 1, al. j)" },
];

let falhas = 0;
for (const ex of EXEMPLOS) {
  const s = structuredClone(ex.s);
  R.sync(s);
  const r = R.decide(s);
  const okP = r.p === ex.p, okRef = r.refs.some((x) => x.includes(ex.ref));
  if (okP && okRef) console.log(`ok    ${ex.nome}`);
  else {
    falhas++;
    console.log(`FALHA ${ex.nome}\n      esperado: ${ex.p} com "${ex.ref}"\n      obtido:   ${r.p} com ${JSON.stringify(r.refs)}`);
  }
}
console.log(`\n${EXEMPLOS.length - falhas} de ${EXEMPLOS.length} obras-exemplo certas.`);
process.exit(falhas ? 1 : 0);
