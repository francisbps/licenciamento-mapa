// Regras de enquadramento das obras no RJUE (versão DL 108/2026, em vigor desde 1-10-2026).
// Só lógica, sem ecrãs: a app (index.html) e os testes (testes/) usam este mesmo ficheiro.
// Para mudar uma regra da lei, mexa aqui e corra os testes: node testes/obras-exemplo.test.js
(function (root) {
  "use strict";
  // Tipos de intervenção: [valor, texto, grupo]. O grupo organiza a lista de escolha.
  const G_EXIST = "Obras num edifício existente", G_NOVA = "Construção nova e espaço exterior", G_USO = "Uso e utilização", G_TERR = "Terrenos e loteamentos", G_CURSO = "Processo em curso ou obra já feita";
  const TIPOS = [
    ["conservacao", "Conservação e reparação (pinturas, telhado, impermeabilização, canalizações)", G_EXIST],
    ["interior", "Remodelação interior (cozinha, casas de banho, paredes interiores, pavimentos)", G_EXIST],
    ["fracoes", "Dividir ou juntar frações, ou mudar o número de fogos", G_EXIST],
    ["acess", "Acessibilidade (elevador, plataforma elevatória, rampa)", G_EXIST],
    ["fachada", "Alteração da fachada (cor, revestimento, azulejos, varandas, marquises)", G_EXIST],
    ["vaos", "Substituição ou alteração de janelas e portas exteriores", G_EXIST],
    ["cobertura", "Alteração da cobertura (telhado, terraço, claraboias, mansardas)", G_EXIST],
    ["equipamentos", "Equipamentos (painéis solares, ar condicionado, antenas, carregador, chaminé, toldo)", G_EXIST],
    ["ampliacao", "Ampliação (mais área, mais pisos ou mais volume)", G_EXIST],
    ["reconstrucao", "Reconstrução de um edifício existente", G_EXIST],
    ["demolicao", "Demolição", G_EXIST],
    ["nova", "Construção nova (moradia ou edifício)", G_NOVA],
    ["modular", "Casa modular, pré-fabricada, de madeira ou contentor", G_NOVA],
    ["agricola", "Construção agrícola (armazém, estábulo, estufa)", G_NOVA],
    ["anexo", "Anexo, telheiro, pérgula, garagem, estufa de jardim ou parque infantil", G_NOVA],
    ["muro", "Muro, vedação, portão ou muro de suporte", G_NOVA],
    ["piscina", "Piscina", G_NOVA],
    ["uso", "Mudança de uso sem obras (ex.: habitação para alojamento local)", G_USO],
    ["usoObras", "Mudança de uso com obras (ex.: loja para restaurante)", G_USO],
    ["utilizacao", "Título de utilização (obra acabada, ou edifício sem licença de utilização)", G_USO],
    ["ph", "Constituição de propriedade horizontal", G_USO],
    ["terreno", "Movimentação de terras ou remodelação de terreno", G_TERR],
    ["destaque", "Destaque de parcela (dividir um terreno em dois)", G_TERR],
    ["loteamento", "Loteamento", G_TERR],
    ["altLoteamento", "Alteração de um loteamento já aprovado", G_TERR],
    ["urbanizacao", "Obras de urbanização (arruamentos, redes, espaços verdes)", G_TERR],
    ["legalizacao", "Legalização de obras já feitas", G_CURSO],
    ["alteracoesObra", "Alterações ao projeto durante a obra", G_CURSO],
    ["prazoObra", "Obra atrasada ou licença caducada (prorrogar, renovar, concluir)", G_CURSO],
    ["escavacao", "Demolir, escavar ou fazer a contenção antes da licença final", G_CURSO],
  ];
  const USOS = [["habitacao", "Habitação"], ["comercio", "Comércio"], ["servicos", "Serviços ou escritório"], ["restauracao", "Restauração e bebidas"], ["al", "Alojamento local"], ["turismo", "Empreendimento turístico (hotel, turismo rural…)"], ["industria", "Indústria ou armazém"], ["agricola", "Agrícola"], ["equipamento", "Equipamento (escola, saúde, desporto, culto)"], ["devoluto", "Sem uso"]];
  const SNS = [["sim", "Sim"], ["nao", "Não"], ["ns", "Não sei"]];
  const EXIST = ["conservacao", "interior", "fracoes", "acess", "fachada", "vaos", "cobertura", "equipamentos", "anexo", "muro", "piscina", "ampliacao", "reconstrucao", "demolicao", "uso", "usoObras", "legalizacao", "ph"];
  const TERRENO = ["fachada", "anexo", "muro", "piscina", "ampliacao", "reconstrucao", "nova", "modular", "agricola", "demolicao", "legalizacao", "terreno", "destaque", "loteamento", "altLoteamento", "urbanizacao"];
  const TIPOS_OBRA = TIPOS.map(([v]) => v).filter((v) => !["uso", "ph", "destaque", "utilizacao", "prazoObra", "altLoteamento"].includes(v));
  const NOVAS = ["nova", "modular", "agricola"];
  const menos = (lista, ...x) => lista.filter((v) => !x.includes(v));
  const q_ = (s) => s.q || {};
  const tem = (v, x) => [].concat(v || []).includes(x);
  const rural = (s) => ["moradia", "rural", "terreno"].includes(q_(s).predio) || ["nova", "modular", "agricola", "terreno", "loteamento", "urbanizacao", "destaque"].includes(s.tipoSel);
  const escassaAnexo = (s) => ["ate10", "estufa", "ludico"].includes(q_(s).anexoArea);
  const escassaMuro = (s) => q_(s).muroAlt === "suporte" || (q_(s).muroVia === "nao" && q_(s).muroAlt === "ate");
  // Obras sem procedimento próprio: não fazem sentido as perguntas de PIP, loteamento e zona consolidada.
  const revIgual = (s) => ["fachada", "cobertura"].includes(s.tipoSel) && q_(s).revIgual === "sim";
  const semControlo = (s) => revIgual(s) || (s.tipoSel === "anexo" && escassaAnexo(s)) || (s.tipoSel === "muro" && escassaMuro(s)) || (s.tipoSel === "vaos" && q_(s).vaosIgual === "sim") || (s.tipoSel === "acess" && q_(s).acessOnde !== "exterior") || (s.tipoSel === "agricola" && q_(s).agrTipo === "amovivel");
  const COM_PLANO = ["fachada", "cobertura", "vaos", "anexo", "muro", "ampliacao", "reconstrucao", "nova", "modular", "agricola", "acess", "usoObras"];
  const PREDIO_OPTS = [["apartamento", "Apartamento (fração)"], ["moradia", "Moradia"], ["edificio", "Edifício inteiro"], ["loja", "Loja, escritório ou outra fração"], ["armazem", "Armazém ou pavilhão"], ["rural", "Construção rural ou agrícola"]];
  const COM_TITULO = ["fracoes", "fachada", "vaos", "cobertura", "ampliacao", "reconstrucao", "uso", "usoObras", "legalizacao", "ph"];
  // Perguntas: step 2 = sobre a obra, step 3 = sobre o local (podem acrescentar condicionantes).
  // show = tipos (tipoSel) em que aparece; when = condição extra; opts = respostas (por omissão Sim/Não/Não sei); multi = pode escolher várias.
  const QUESTIONS = [
    { id: "predio", step: 2, q: "Que tipo de imóvel é?", show: menos(TIPOS.map(([v]) => v), "loteamento", "altLoteamento", "urbanizacao", "destaque", "terreno", "nova", "modular", "agricola", "prazoObra", "alteracoesObra", "escavacao", "ph"), opts: (s) => ["anexo", "muro", "piscina"].includes(s.tipoSel) ? [...PREDIO_OPTS, ["terreno", "Terreno sem construção"]] : PREDIO_OPTS },
    { id: "onde", step: 2, q: "Onde é a obra de conservação?", show: ["conservacao"], opts: [["interior", "Só no interior"], ["fachada", "Fachada"], ["cobertura", "Cobertura"], ["varios", "Interior e exterior"]] },
    { id: "azulejos", step: 2, q: "Vai remover ou substituir azulejos da fachada?", show: ["conservacao", "fachada"], when: (s) => s.tipoSel !== "conservacao" || ["fachada", "varios"].includes(q_(s).onde) },
    { id: "acessOnde", step: 2, q: "Onde fica o elevador, a plataforma ou a rampa?", show: ["acess"], opts: [["interior", "Dentro do edifício (caixa de escada, interior da fração)"], ["exterior", "No exterior do edifício (fachada, logradouro, entrada)"], ["via", "Na via pública (passeio)"]] },
    { id: "estrutura", step: 2, q: "Mexe na estrutura (paredes resistentes, lajes, vigas, pilares)?", h: "Na dúvida, um técnico confirma se a parede é resistente.", show: ["interior", "usoObras", "fracoes", "acess"], when: (s) => s.tipoSel !== "acess" || q_(s).acessOnde === "interior" },
    { id: "fachada", step: 2, q: "A obra também altera a fachada, a cobertura ou a altura do edifício?", show: ["interior", "usoObras", "fracoes"] },
    { id: "comuns", step: 2, q: "A obra mexe em partes comuns do prédio (fachada, telhado, escadas, estrutura, colunas de água ou gás)?", show: menos(EXIST, "uso", "ph"), when: (s) => ["apartamento", "loja"].includes(q_(s).predio) },
    { id: "revIgual", step: 2, q: "Só troca o revestimento por outro com acabamento exterior idêntico, para melhorar a eficiência energética?", h: "Por exemplo, isolamento pelo exterior com o mesmo acabamento, ou telha igual com isolamento.", show: ["fachada", "cobertura"], when: (s) => q_(s).azulejos !== "sim" && q_(s).cobAumenta !== "sim" },
    { id: "cobAumenta", step: 2, q: "A obra aumenta a altura ou o volume do edifício (ex.: nova mansarda, sobrelevação, fechar um terraço)?", show: ["cobertura"], when: (s) => q_(s).revIgual !== "sim" },
    { id: "vaosIgual", step: 2, q: "As novas janelas ou portas mantêm o desenho, a cor e o material exterior?", h: "A divisão dos vidros e das folhas também tem de se manter.", show: ["vaos"], opts: [["sim", "Sim, acabamento exterior idêntico"], ["nao", "Não, muda o aspeto exterior"], ["ns", "Não sei"]] },
    { id: "equip", step: 2, q: "O que vai instalar? (pode escolher vários)", show: ["equipamentos"], multi: true, opts: [["solar", "Painéis solares (fotovoltaicos ou térmicos) na cobertura"], ["solarSolo", "Painéis solares no terreno"], ["eolico", "Gerador eólico doméstico"], ["bateria", "Baterias ou depósito de água quente"], ["ac", "Ar condicionado ou bomba de calor"], ["antena", "Antena ou parabólica"], ["carregador", "Carregador de carro elétrico"], ["chamine", "Chaminé, exaustão ou conduta de fumos"], ["toldo", "Toldo, reclamo ou letreiro"], ["gas", "Gerador, depósito de gás ou de combustível"]] },
    { id: "anexoArea", step: 2, q: "O que é e que dimensão tem?", show: ["anexo"], opts: [["ate10", "Até 10 m² e 2,2 m de altura, sem confinar com a via pública"], ["estufa", "Estufa de jardim com menos de 3 m de altura e até 20 m²"], ["ludico", "Equipamento de lazer (parque infantil, campo de jogos) mais pequeno do que a casa"], ["maior", "Maior do que isso, ou confina com a via pública"]] },
    { id: "muroAlt", step: 2, q: "Que muro e que altura?", show: ["muro"], opts: [["ate", "Muro de vedação até 1,8 m"], ["suporte", "Muro de suporte de terras até 2 m"], ["mais", "Mais alto do que isso"]] },
    { id: "muroVia", step: 2, q: "O muro de vedação confina com a via pública?", show: ["muro"], when: (s) => q_(s).muroAlt !== "suporte" },
    { id: "piscinaAssoc", step: 2, q: "A piscina fica associada a uma casa ou edifício principal?", show: ["piscina"] },
    { id: "destPerim", step: 2, q: "Onde fica o terreno?", h: "Veja a planta de ordenamento do PDM.", show: ["destaque"], opts: [["dentro", "Dentro do perímetro urbano ou de um aglomerado rural"], ["fora", "Fora do perímetro urbano"], ["ns", "Não sei"]] },
    { id: "destVia", step: 2, q: "As duas parcelas ficam a confrontar com arruamentos públicos?", show: ["destaque"], when: (s) => q_(s).destPerim !== "fora" },
    { id: "agrTipo", step: 2, q: "Que construção agrícola?", show: ["agricola"], opts: [["armazem", "Armazém, estábulo ou outra construção fixa"], ["estufa", "Estufa agrícola com fundações"], ["amovivel", "Estrutura amovível, sem fundações (túnel, abrigo)"]] },
    { id: "legalTipo", step: 2, q: "O que quer legalizar?", show: ["legalizacao"], opts: [["alteracao", "Alterações interiores ou de fachada"], ["ampliacao", "Ampliação ou anexo"], ["construcao", "Construção inteira sem licença"], ["uso", "Uso diferente do licenciado"]] },
    { id: "reconstFiel", step: 2, q: "A reconstrução repõe as fachadas e a cobertura como estavam?", h: "Mesmas dimensões, vãos, varandas e recuados do último projeto válido. Pode mudar os materiais da estrutura.", show: ["reconstrucao"] },
    { id: "demoTipo", step: 2, q: "Que demolição é?", show: ["demolicao"], opts: [["obra", "Faz parte de uma reconstrução ou construção nova"], ["ilegal", "A construção a demolir é ilegal"], ["so", "Só a demolição"]] },
    { id: "utilObra", step: 2, q: "O edifício ou a fração vem de uma obra?", show: ["utilizacao"], opts: [["controlada", "Sim, obra acabada com licença, comunicação prévia ou PIP completo"], ["isenta", "Sim, mas as obras eram isentas"], ["semObra", "Não: o edifício existe e não tem título de utilização"], ["anterior1951", "O edifício é anterior a 1951"]] },
    { id: "usoAtual", step: 2, q: "Qual é o uso atual?", show: ["uso", "usoObras", "ampliacao", "reconstrucao", "legalizacao"], opts: USOS },
    { id: "usoNovo", step: 2, q: "Qual será o uso?", show: ["uso", "usoObras", "nova", "modular", "ampliacao", "reconstrucao", "utilizacao"], opts: USOS },
    { id: "altLote", step: 2, q: "A alteração muda as áreas de implantação ou de construção, ou o número de fogos, em mais de 3%?", show: ["altLoteamento"], opts: [["ate3", "Não, até 3% e cumpre o PDM"], ["mais", "Sim, mais de 3% ou muda o uso"], ["ns", "Não sei"]] },
    { id: "altObra", step: 2, q: "Que alterações quer fazer?", show: ["alteracoesObra"], opts: [["isentas", "Só alterações que seriam isentas (interiores sem estrutura, acabamentos)"], ["outras", "Alterações ao projeto sem aumentar a área nem mudar a implantação"], ["ampliacao", "Aumentam a área ou mudam a implantação"]] },
    { id: "prazoTipo", step: 2, q: "Qual é a situação?", show: ["prazoObra"], opts: [["prorrogar", "O prazo ainda corre e preciso de mais tempo"], ["caducou", "O título caducou e a obra não começou ou vai no início"], ["avancada", "O título caducou com a obra já avançada"]] },
    { id: "procInicial", step: 2, q: "Qual é o título da obra?", show: ["alteracoesObra", "prazoObra"], when: (s) => (s.tipoSel === "alteracoesObra" && q_(s).altObra === "ampliacao") || (s.tipoSel === "prazoObra" && q_(s).prazoTipo === "caducou"), opts: [["lic", "Licença"], ["cp", "Comunicação prévia"], ["pip", "PIP com todos os elementos"]] },
    { id: "arqAprovada", step: 2, q: "O projeto de arquitetura já foi aprovado?", show: ["escavacao"] },
    { id: "pisos", step: 2, q: "Quantos pisos acima do solo terá o edifício no fim?", show: ["nova", "modular", "ampliacao", "reconstrucao", "usoObras"], opts: [["1", "1"], ["2", "2"], ["3", "3"], ["5", "4 a 6"], ["8", "7 a 9"], ["10", "10 ou mais"]] },
    { id: "pisos", step: 2, q: "Quantos pisos acima do solo tem o edifício?", h: "Serve para saber a categoria de risco de incêndio.", show: ["uso", "legalizacao"], opts: [["1", "1"], ["2", "2"], ["3", "3"], ["5", "4 a 6"], ["8", "7 a 9"], ["10", "10 ou mais"]] },
    { id: "pip", step: 2, q: "Já tem um PIP (informação prévia) favorável e válido para esta obra?", h: "Emitido nos termos do art. 14.º, n.º 2, há menos de 2 anos, a tratar todos os pontos das alíneas a) a f).", show: ["fachada", "cobertura", "vaos", "anexo", "muro", "piscina", "ampliacao", "reconstrucao", "nova", "modular", "agricola", "demolicao", "terreno", "loteamento", "urbanizacao", "acess"], when: (s) => !semControlo(s) && !(s.tipoSel === "reconstrucao" && q_(s).reconstFiel === "sim") && !(s.tipoSel === "demolicao" && q_(s).demoTipo !== "so") && !(s.tipoSel === "piscina" && q_(s).piscinaAssoc !== "nao") },
    { id: "loteamento", step: 2, q: "O terreno está num loteamento, plano de pormenor ou unidade de execução com parâmetros definidos?", h: "Por exemplo, um lote com alvará de loteamento.", show: [...COM_PLANO, "demolicao", "terreno", "piscina"], when: (s) => !semControlo(s) && !(s.tipoSel === "reconstrucao" && q_(s).reconstFiel === "sim") && !(s.tipoSel === "usoObras" && q_(s).fachada !== "sim") && !(s.tipoSel === "demolicao" && q_(s).demoTipo !== "so") },
    { id: "loteamento", step: 2, q: "O terreno está num plano de pormenor ou unidade de execução que já define os lotes e o desenho urbano?", show: ["loteamento"] },
    { id: "loteamento", step: 2, q: "As obras estão definidas num loteamento, plano de pormenor ou unidade de execução?", show: ["urbanizacao"] },
    { id: "zuc", step: 2, q: "Fica em zona urbana consolidada?", h: "Classificação do PDM: zona já urbanizada, com edifícios alinhados ao longo da rua.", show: menos(COM_PLANO, "agricola"), when: (s) => q_(s).loteamento !== "sim" && !semControlo(s) && !(s.tipoSel === "reconstrucao" && q_(s).reconstFiel === "sim") && !(s.tipoSel === "usoObras" && q_(s).fachada !== "sim") },
    { id: "cercea", step: 2, q: "A altura final fica igual ou abaixo da mais frequente na frente de rua?", show: menos(COM_PLANO, "agricola"), when: (s) => q_(s).zuc === "sim" && q_(s).loteamento !== "sim" && !semControlo(s) },
    { id: "viaPublica", step: 2, q: "Vai precisar de ocupar a via pública (andaimes, contentor, grua)?", show: menos(TIPOS_OBRA, "loteamento", "urbanizacao", "terreno", "legalizacao", "alteracoesObra") },
    { id: "anterior1951", step: 2, q: "O edifício tem título de utilização?", h: "Licença ou autorização de utilização, ou comunicação de utilização.", show: COM_TITULO, when: (s) => q_(s).predio !== "terreno", opts: [["nao", "Sim, tem título de utilização"], ["sim", "Não: é anterior a 1951"], ["semTitulo", "Não tem, e é posterior a 1951"], ["ns", "Não sei"]] },
    // Sobre o local
    { id: "classificado", step: 3, q: "O imóvel tem proteção patrimonial?", h: "Veja a planta de condicionantes do PDM ou o site do Património Cultural. O regime é diferente para o próprio monumento e para a zona à volta.", show: "*", when: (s) => s.doMapa || !(typeof window !== "undefined" && window.pesquisarNoMapa) || (s.condMapa || []).includes("pat"), opts: [["nao", "Não tem"], ["sim", "O próprio imóvel é classificado ou em vias de classificação"], ["conjunto", "Faz parte de um conjunto ou sítio classificado"], ["zp", "Está na zona de proteção de um imóvel classificado"], ["ns", "Não sei"]] },
    { id: "perto", step: 3, q: "Há a menos de 50 m algum destes equipamentos? (pode escolher vários)", multi: true, show: menos(TIPOS_OBRA, "interior", "conservacao", "fracoes", "acess", "alteracoesObra", "escavacao"), opts: [["nenhum", "Nenhum"], ["escola", "Escola"], ["saude", "Hospital ou centro de saúde"], ["cemiterio", "Cemitério"], ["prisao", "Estabelecimento prisional"], ["quartel", "Quartel ou instalação militar"], ["ns", "Não sei"]] },
    { id: "vias", step: 3, q: "O terreno confina com alguma destas vias? (pode escolher várias)", multi: true, show: TERRENO, opts: [["nenhuma", "Só com ruas urbanas"], ["municipal", "Estrada ou caminho municipal"], ["nacional", "Estrada nacional ou regional"], ["autoestrada", "Autoestrada, IP ou IC"], ["ferrovia", "Linha de comboio"], ["metro", "Linha de metro"], ["ns", "Não sei"]] },
    { id: "redes", step: 3, q: "Passa junto ao terreno alguma destas redes? (pode escolher várias)", multi: true, show: TERRENO, opts: [["nenhuma", "Nenhuma"], ["eletrica", "Linha elétrica de média ou alta tensão"], ["gas", "Gasoduto ou oleoduto"], ["agua", "Conduta de água ou aqueduto"], ["esgoto", "Coletor ou emissário de esgotos"], ["ns", "Não sei"]] },
    { id: "arvores", step: 3, q: "Há no terreno árvores protegidas?", show: ["anexo", "muro", "piscina", "ampliacao", "nova", "modular", "agricola", "terreno", "loteamento", "urbanizacao", "demolicao"], when: rural, opts: [["nao", "Não"], ["sobreiro", "Sobreiros ou azinheiras"], ["oliveira", "Oliveiras"], ["classificada", "Árvore classificada de interesse público"], ["ns", "Não sei"]] },
    { id: "ardido", step: 3, q: "O terreno ardeu nos últimos 10 anos?", show: ["ampliacao", "reconstrucao", "nova", "modular", "agricola", "terreno", "loteamento", "urbanizacao", "anexo"], when: rural },
  ];
  const VISIVEL = (qq, s) => (qq.show === "*" || qq.show.includes(s.tipoSel)) && (!qq.when || qq.when(s));
  // Respostas que acrescentam condicionantes (o utilizador não as escolhe: deduzimos).
  const RESP_COND = {
    perto: { escola: "edificios_escolares", saude: "estabelecimentos_saude", cemiterio: "cemiterios", prisao: "estabelecimentos_prisionais", quartel: "militar" },
    vias: { municipal: "estradas_municipais", nacional: "estradas", autoestrada: "estradas", ferrovia: "estradas", metro: "metro_ligeiro" },
    redes: { eletrica: "eletrica", gas: "gas", agua: "aqueduto", esgoto: "drenagem_saneamento" },
    arvores: { sobreiro: "sobreiro_azinheira", oliveira: "oliveiras", classificada: "arvoredo_interesse_publico" },
    ardido: { sim: "incendio" },
    usoNovo: { turismo: "turismo", restauracao: "saude_publica", industria: "industria_sir" },
  };
  // Enquadramento-base a partir do tipo escolhido e das respostas.
  function tipoBase(s) {
    const t = s.tipoSel, q = q_(s);
    if (revIgual(s)) return "escassa";
    if (t === "cobertura" && q.cobAumenta === "sim") return "ampliacao";
    if (t === "fachada" || t === "cobertura") return "exterior";
    if (t === "vaos") return q.vaosIgual === "sim" ? "escassa" : "exterior";
    if (t === "equipamentos") return "equip";
    if (t === "anexo") return escassaAnexo(s) ? "escassa" : "nova";
    if (t === "muro") return escassaMuro(s) ? "escassa" : "exterior";
    if (t === "acess") return q.acessOnde === "exterior" ? "exterior" : q.acessOnde === "via" ? "acessVia" : "interior";
    if (t === "modular") return "nova";
    if (t === "agricola") return q.agrTipo === "amovivel" ? "amovivel" : "nova";
    if (t === "urbanizacao") return "loteamento";
    return t || "conservacao";
  }
  const nomeDe = (lista, v) => (lista.find(([k]) => k === v) || [, ""])[1];
  // Campos usados pelo resto da app, calculados a partir das respostas.
  function sync(s) {
    if (!s.tipoSel) s.tipoSel = ({ exterior: "fachada", escassa: "equipamentos" })[s.tipo] || (TIPOS.some(([v]) => v === s.tipo) ? s.tipo : "conservacao");
    s.q = s.q || {};
    // Respostas guardadas com a versão anterior (DL 10/2024).
    if (s.q.demoTipo === "sim") s.q.demoTipo = "obra"; else if (s.q.demoTipo === "nao") s.q.demoTipo = "so";
    delete s.q.abc; delete s.q.altura;
    s.tipo = tipoBase(s);
    s.usoAtual = nomeDe(USOS, s.q.usoAtual); s.usoNovo = nomeDe(USOS, s.q.usoNovo);
    s.pisos = s.q.pisos || "";
  }

  // Condicionantes do local: cada uma implica ouvir uma entidade. serv = servidão ou restrição de utilidade pública.
  const COND = [
    { k: "ren", l: "Reserva Ecológica Nacional (REN)", ent: "CCDR da região", av: "Compatibilidade da obra com a REN. Algumas ações exigem comunicação prévia ou autorização da CCDR.", base: "DL 166/2008 (regime da REN)", serv: true },
    { k: "ran", l: "Reserva Agrícola Nacional (RAN)", ent: "Entidade Regional da Reserva Agrícola Nacional", av: "Utilização não agrícola de solos da RAN.", base: "DL 73/2009 (regime da RAN)", serv: true },
    { k: "hidrico", l: "Linha de água, margem, zona inundável ou orla costeira", ent: "APA, I.P. (Administração da Região Hidrográfica)", av: "Título de utilização dos recursos hídricos e risco de cheia ou de erosão costeira.", base: "Lei 54/2005 e Lei 58/2005", serv: true },
    { k: "natura", l: "Rede Natura 2000 ou área protegida", ent: "ICNF, I.P.", av: "Efeitos sobre habitats e espécies, e regulamento da área protegida.", base: "DL 140/99 e DL 142/2008", serv: true },
    { k: "incendio", l: "Perigosidade de incêndio rural alta ou muito alta", ent: "Câmara municipal (comissão de gestão de fogos) e ICNF", av: "Condições para edificar fora de aglomerados e faixas de gestão de combustível.", base: "DL 82/2021 (sistema de gestão integrada de fogos rurais)", serv: true },
    { k: "estradas", l: "Junto a estrada nacional ou a linha de caminho de ferro", ent: "Infraestruturas de Portugal, S.A.", av: "Zonas non aedificandi, afastamentos e acessos.", base: "Lei 34/2015 (Estatuto das Estradas) e DL 276/2003 (ferrovia)", serv: true },
    { k: "aqueduto", l: "Aqueduto, conduta adutora ou reservatório de água", ent: "Entidade gestora do abastecimento (por exemplo EPAL ou serviços municipalizados)", av: "Faixa de proteção da servidão de aqueduto público. Se o aqueduto for monumento, junta-se o parecer do património.", base: "Servidão administrativa de aqueduto público", serv: true },
    { k: "eletrica", l: "Linha elétrica de alta ou média tensão", ent: "REN ou E-REDES", av: "Distâncias de segurança da construção às linhas.", base: "Decreto Regulamentar 1/92 (linhas de alta tensão)", serv: true },
    { k: "gas", l: "Gasoduto ou oleoduto", ent: "Operador da rede (REN Gasodutos ou distribuidora)", av: "Faixa de servidão da conduta.", base: "Servidão de gás natural", serv: true },
    { k: "aero", l: "Perto de aeroporto, aeródromo ou heliporto", ent: "ANAC", av: "Alturas máximas e obstáculos à navegação aérea.", base: "Servidões aeronáuticas", serv: true },
    { k: "militar", l: "Perto de instalação militar", ent: "Ministério da Defesa Nacional", av: "Servidão militar da instalação.", base: "Lei 2078 (servidões militares)", serv: true },
    { k: "porto", l: "Em área de jurisdição portuária", ent: "Administração portuária", av: "Compatibilidade com o uso portuário.", base: "Regime da área de jurisdição portuária", serv: true },
    { k: "scie34", l: "Edifício de 3.ª ou 4.ª categoria de risco de incêndio", ent: "ANEPC", av: "Parecer sobre o projeto de segurança contra incêndio.", base: "DL 220/2008 (segurança contra incêndio em edifícios)", serv: false },
    { k: "turismo", l: "Empreendimento turístico (hotel, aldeamento, turismo rural)", ent: "Turismo de Portugal, I.P.", av: "Parecer sobre a arquitetura e a classificação pretendida.", base: "DL 39/2008 (empreendimentos turísticos)", serv: false },
    // Restantes servidões e restrições de utilidade pública (catálogo DGT; ficam em "Outras servidões").
    { k: "albufeiras_aguas_publicas", l: "Albufeiras de águas públicas de serviço público e respetiva zona terrestre de proteção", ent: "APA, I.P. (ARH)", av: "Zona terrestre de proteção até 500 m (até 1000 m em albufeiras de abastecimento) com zona reservada de 100 m onde a edificação é interdita ou muito limitada.", base: "DL 107/2009 (regime de proteção das albufeiras, lagoas e lagos); programas especiais de albufeiras (POAAP)", serv: true, mais: true },
    { k: "lagoas_lagos", l: "Lagoas e lagos de águas públicas (zona de proteção)", ent: "APA, I.P. (ARH)", av: "Zona terrestre de proteção com regime idêntico às albufeiras.", base: "DL 107/2009", serv: true, mais: true },
    { k: "captacoes_agua_subterranea", l: "Perímetros de proteção de captações de água subterrânea para abastecimento público", ent: "APA, I.P. (ARH); entidade gestora do abastecimento", av: "Zonas imediata, intermédia e alargada com interdição ou condicionamento de construções, fossas, armazenamento de combustíveis e atividades poluentes.", base: "DL 382/99; Portarias de delimitação; Lei 58/2005 art. 37.º", serv: true, mais: true },
    { k: "captacoes_agua_superficial", l: "Zonas de proteção de captações de água superficial para consumo humano", ent: "APA, I.P. (ARH)", av: "Restrições a atividades e ocupações que possam afetar a qualidade da água captada.", base: "Lei 58/2005 art. 37.º; DL 107/2009", serv: true, mais: true },
    { k: "estuarios_poe", l: "Programas de Ordenamento dos Estuários (POE)", ent: "APA, I.P.", av: "Faixa de proteção estuarina (até 500 m) com usos condicionados.", base: "DL 129/2008; RJIGT DL 80/2015", serv: true, mais: true },
    { k: "obras_hidraulicas_barragens", l: "Barragens e obras hidráulicas – zonas de autossalvamento e servidão", ent: "APA, I.P. (Autoridade de Segurança de Barragens)", av: "Restrições à ocupação nas zonas de autossalvamento a jusante e servidão sobre a área da obra.", base: "DL 21/2018 (Regulamento de Segurança de Barragens); Lei 58/2005", serv: false, mais: true },
    { k: "aguas_minerais_naturais", l: "Águas minerais naturais e de nascente – perímetros de proteção (recursos hidrominerais)", ent: "DGEG", av: "Zonas imediata, intermédia e alargada com interdição ou autorização prévia de construções, furos e escavações.", base: "Lei 54/2015 (bases dos recursos geológicos); DL 86/90; DL 84/90; DL 30/2021", serv: true, mais: true },
    { k: "recursos_geotermicos", l: "Recursos geotérmicos – perímetros de proteção", ent: "DGEG", av: "Perímetros de proteção com restrição a escavações e captações.", base: "Lei 54/2015; DL 87/90; DL 30/2021", serv: true, mais: true },
    { k: "depositos_minerais", l: "Depósitos minerais (minas) – áreas de concessão e de exploração", ent: "DGEG", av: "Condiciona edificação sobre áreas concessionadas e respetivas zonas de defesa.", base: "Lei 54/2015; DL 30/2021", serv: true, mais: true },
    { k: "areas_cativas_reserva", l: "Áreas cativas e áreas de reserva de recursos geológicos", ent: "DGEG", av: "Áreas onde se interditam usos que inviabilizem o aproveitamento futuro dos recursos.", base: "Lei 54/2015; DL 30/2021", serv: true, mais: true },
    { k: "pedreiras", l: "Pedreiras (massas minerais) – áreas licenciadas e zonas de defesa", ent: "DGEG / CCDR (entidade licenciadora conforme classe)", av: "Zonas de defesa recíprocas (ex.: 10 m a 50 m de edifícios, estradas, linhas elétricas, cursos de água).", base: "DL 270/2001 (alt. DL 340/2007), anexo II; Lei 54/2015", serv: true, mais: true },
    { k: "areas_mineiras_abandonadas", l: "Áreas mineiras abandonadas / em recuperação", ent: "EDM – Empresa de Desenvolvimento Mineiro; DGEG", av: "Riscos de subsidência e contaminação podem condicionar a ocupação.", base: "DL 198-A/2001; Lei 54/2015", serv: false, mais: true },
    { k: "aproveitamentos_hidroagricolas", l: "Obras de aproveitamento hidroagrícola (perímetros de rega)", ent: "DGADR; associação de regantes/entidade gestora", av: "Interdição de construções e utilizações não agrícolas na área beneficiada, salvo parecer favorável; servidões de canais e valas.", base: "DL 269/82 (alt. DL 86/2002, DL 169/2005)", serv: true, mais: true },
    { k: "regime_florestal", l: "Regime florestal (perímetros florestais, matas nacionais)", ent: "ICNF, I.P.", av: "Condiciona construções e alterações de uso em terrenos submetidos a regime florestal total ou parcial.", base: "Decreto de 24-12-1901; Decreto de 24-12-1903; Lei 33/96", serv: true, mais: true },
    { k: "sobreiro_azinheira", l: "Povoamentos de sobreiro e azinheira", ent: "ICNF, I.P.", av: "Corte ou arranque proibido sem autorização; conversão de povoamentos só para empreendimentos de imprescindível utilidade pública.", base: "DL 169/2001 (alt. DL 155/2004)", serv: true, mais: true },
    { k: "azevinho", l: "Azevinho espontâneo", ent: "ICNF, I.P.", av: "Proíbe arranque, corte e transporte.", base: "DL 423/89", serv: false, mais: true },
    { k: "oliveiras", l: "Proteção do olival (arranque de oliveiras)", ent: "DRAP", av: "Arranque de oliveiras sujeito a autorização prévia.", base: "DL 120/86", serv: true, mais: true },
    { k: "arvoredo_interesse_publico", l: "Arvoredo de interesse público", ent: "ICNF, I.P.", av: "Zona geral de proteção de 50 m de raio a contar da base onde intervenções exigem autorização.", base: "Lei 53/2012; Portaria 124/2014", serv: true, mais: true },
    { k: "zonas_vulneraveis_nitratos", l: "Zonas vulneráveis a nitratos de origem agrícola", ent: "DGADR / DRAP", av: "Condiciona explorações agropecuárias, não a edificação em geral.", base: "DL 235/97; Portaria 164/2010", serv: false, mais: true },
    { k: "geoparques_reservas_biosfera", l: "Geoparques UNESCO e Reservas da Biosfera", ent: "Entidade gestora; ICNF quando sobreposto a AP", av: "Sem restrições próprias; relevante para enquadramento.", base: "Programas UNESCO (sem regime legal próprio de SRUP)", serv: false, mais: true },
    { k: "patrimonio_mundial", l: "Bens Património Mundial e zonas tampão (ex.: Alto Douro Vinhateiro, centros históricos, Sintra, Côa)", ent: "Património Cultural, I.P.; CCDR-Norte (ADV); estrutura de gestão do bem", av: "Controlo de volumetria, implantação, materiais e impacte paisagístico na área classificada e zona tampão.", base: "Convenção UNESCO 1972; Lei 107/2001 art. 72.º; planos/regulamentos próprios (ex.: PIOT-ADV, RCM 150/2003)", serv: true, mais: true },
    { k: "arqueologia", l: "Sítios arqueológicos e áreas de sensibilidade/potencial arqueológico", ent: "Património Cultural, I.P. / CCDR", av: "Pode exigir acompanhamento arqueológico, sondagens prévias ou alteração de projeto.", base: "Lei 107/2001; DL 164/2014 (Regulamento de Trabalhos Arqueológicos); regulamentos de PDM", serv: false, mais: true },
    { k: "parque_arqueologico", l: "Parques arqueológicos (ex.: Vale do Côa) e respetivos planos", ent: "Património Cultural, I.P. / Fundação Côa Parque", av: "Regime de usos fixado no plano do parque arqueológico.", base: "Lei 107/2001 art. 75.º; DL 131/2002", serv: true, mais: true },
    { k: "edificios_publicos_valor", l: "Edifícios públicos e outras construções de interesse público (zonas de proteção)", ent: "Entidade com tutela do edifício / Património Cultural, I.P.", av: "Zona de proteção fixada caso a caso (afastamentos e alturas).", base: "DL 40388/1955; Lei 2032/1949", serv: true, mais: true },
    { k: "drenagem_saneamento", l: "Sistemas de drenagem e tratamento de águas residuais (emissários, coletores, ETAR)", ent: "Entidade gestora do sistema", av: "Faixa non aedificandi sobre emissários e zona de proteção de ETAR (frequentemente 50–200 m em PDM).", base: "DL 34021/1944; DL 194/2009", serv: false, mais: true },
    { k: "centros_electroprodutores", l: "Centros electroprodutores (barragens, centrais, parques eólicos/solares) – servidões", ent: "DGEG; promotor/titular", av: "Servidões de passagem e zonas de proteção às infraestruturas.", base: "DL 15/2022; DL 43335/1960", serv: false, mais: true },
    { k: "oleodutos", l: "Oleodutos e gasodutos de produtos petrolíferos (ex.: CLC Sines–Aveiras)", ent: "Operador (CLC); DGEG", av: "Faixa de servidão e faixa non aedificandi ao longo da conduta.", base: "DL 152/94; DL 11/94 (aplicável por remissão)", serv: true, mais: true },
    { k: "armazenagem_combustiveis", l: "Instalações de armazenamento e postos de abastecimento de combustíveis – distâncias de segurança", ent: "Câmara municipal / DGEG / ANEPC", av: "Distâncias de segurança a edifícios e vias.", base: "DL 267/2002; Portaria 1188/2003; Portaria 131/2002", serv: false, mais: true },
    { k: "estradas_municipais", l: "Estradas e caminhos municipais", ent: "Câmara municipal", av: "Faixa non aedificandi de 6 m (EM) e 4,5 m (CM) ao eixo, alargável por regulamento municipal.", base: "Lei 2110/1961 (Regulamento Geral das Estradas e Caminhos Municipais)", serv: true, mais: true },
    { k: "metro_ligeiro", l: "Sistemas de metropolitano e metro ligeiro", ent: "Empresa concessionária/operadora (Metro de Lisboa, Metro do Porto, MST)", av: "Zonas de proteção às infraestruturas e restrições a fundações sobre túneis.", base: "Diplomas próprios de cada sistema (ex.: DL 394-A/98 Metro do Porto; DL 192/2008 MST)", serv: true, mais: true },
    { k: "telecomunicacoes_radioeletricas", l: "Servidões radioelétricas (feixes hertzianos e estações de radiocomunicações)", ent: "ANACOM; entidade titular da estação", av: "Zonas de desobstrução com limitação de alturas ao longo dos feixes e em torno das estações.", base: "DL 597/73; Lei 16/2022 (LCE); decretos regulamentares de servidão", serv: true, mais: true },
    { k: "radares_meteorologicos", l: "Estações e radares meteorológicos / sismológicos", ent: "IPMA, I.P.; ANACOM", av: "Limitação de alturas e de obstáculos na envolvente.", base: "DL 597/73 (servidões radioelétricas); diplomas próprios IPMA", serv: true, mais: true },
    { k: "farois_sinais_maritimos", l: "Faróis e outros sinais marítimos", ent: "Direção de Faróis / DGAM (Autoridade Marítima Nacional)", av: "Limitação de alturas e de iluminação que prejudiquem a visibilidade dos sinais.", base: "DL 594/73 – regime de servidões de sinalização marítima", serv: true, mais: true },
    { k: "marcos_geodesicos", l: "Marcos geodésicos e marcas de nivelamento", ent: "Direção-Geral do Território (DGT)", av: "Zona de proteção de raio mínimo de 15 m e manutenção da visibilidade entre vértices.", base: "DL 143/82", serv: true, mais: true },
    { k: "estabelecimentos_prisionais", l: "Estabelecimentos prisionais e tutelares de menores – zonas de proteção", ent: "Direção-Geral de Reinserção e Serviços Prisionais (DGRSP)", av: "Zona de proteção onde construções exigem parecer (afastamento e altura).", base: "DL 265/71", serv: true, mais: true },
    { k: "instalacoes_forcas_seguranca", l: "Instalações das forças e serviços de segurança", ent: "MAI (GNR/PSP)", av: "Restrições pontuais fixadas em diploma próprio.", base: "Decretos de servidão próprios (Lei 2078/1955 por analogia)", serv: false, mais: true },
    { k: "instalacoes_aduaneiras", l: "Instalações aduaneiras e zona fiscal", ent: "Autoridade Tributária e Aduaneira", av: "Restrições a construções junto a postos e zona fiscal costeira/fronteiriça.", base: "DL 46311/1965; Código Aduaneiro", serv: false, mais: true },
    { k: "edificios_escolares", l: "Edifícios escolares – zonas de proteção", ent: "Ministério da Educação (DGEstE) / município", av: "Afastamento mínimo de construções (em regra 12 m) e proibição de atividades insalubres ou ruidosas na envolvente.", base: "DL 37575/1949; DL 44220/1962", serv: false, mais: true },
    { k: "cemiterios", l: "Cemitérios – zona de proteção", ent: "Câmara municipal; autoridade de saúde", av: "Faixa de proteção (em regra 10 m) sem construções e restrições a captações de água na envolvente.", base: "DL 44220/1962; DL 411/98", serv: false, mais: true },
    { k: "estabelecimentos_saude", l: "Estabelecimentos hospitalares e de saúde – zonas de proteção", ent: "Ministério da Saúde / ULS", av: "Zona de proteção fixada caso a caso; zona sensível para ruído.", base: "DL 40388/1955 (edifícios públicos); normas de ruído (DL 9/2007)", serv: false, mais: true },
    { k: "seveso", l: "Estabelecimentos com substâncias perigosas (Seveso) – zonas de perigosidade e distâncias de segurança", ent: "APA, I.P. (com ANEPC)", av: "Distâncias de segurança a zonas residenciais, equipamentos e vias; parecer em operações urbanísticas na zona de perigosidade.", base: "DL 150/2015 (Diretiva Seveso III)", serv: true, mais: true },
    { k: "industria_sir", l: "Estabelecimentos industriais (SIR) – compatibilidade de usos", ent: "Entidade coordenadora (IAPMEI, DRAP, CCDR) / município", av: "Condiciona localização em função do tipo de estabelecimento.", base: "DL 169/2012 (SIR, alt. DL 73/2015)", serv: false, mais: true },
    { k: "aterros_residuos", l: "Aterros e instalações de gestão de resíduos", ent: "CCDR / APA", av: "Distâncias a habitações fixadas em licença/PDM.", base: "DL 102-D/2020 (RGGR)", serv: false, mais: true },
    { k: "aru", l: "Áreas de Reabilitação Urbana (ARU) / ORU", ent: "Câmara municipal / entidade gestora da ORU", av: "Regime especial de controlo prévio, benefícios fiscais e eventual dispensa de normas.", base: "DL 307/2009 (RJRU, alt. Lei 32/2012)", serv: false, mais: true },
    { k: "zonamento_acustico", l: "Zonas sensíveis/mistas e zonas de conflito acústico (mapas de ruído)", ent: "Câmara municipal (APA para grandes infraestruturas)", av: "Em zonas de conflito interditam-se novos edifícios habitacionais, escolares ou hospitalares sem plano de redução.", base: "DL 9/2007 (Regulamento Geral do Ruído)", serv: false, mais: true },
    { k: "pdm_planos_municipais", l: "Classificação e qualificação do solo em PDM, PU e PP", ent: "Câmara municipal", av: "Define usos, índices, cérceas e alinhamentos admissíveis.", base: "RJIGT DL 80/2015", serv: false, mais: true },
    { k: "programas_especiais", l: "Programas especiais (áreas protegidas, albufeiras, orla costeira, estuários)", ent: "APA, I.P. / ICNF, I.P.", av: "Normas de salvaguarda vertidas nos PDM.", base: "RJIGT DL 80/2015; DL 159/2012; DL 107/2009", serv: true, mais: true },
    { k: "saude_publica", l: "Estabelecimentos com requisitos sanitários (restauração, saúde, alojamento, piscinas)", ent: "Autoridade de saúde (ULS/ARS)", av: "Parecer sanitário em certas utilizações.", base: "DL 555/99 art. 13.º; legislação setorial", serv: false, mais: true },
    { k: "estabelecimentos_comerciais", l: "Grandes estabelecimentos/conjuntos comerciais", ent: "DGAE / CCDR (comissão de autorização comercial)", av: "Autorização de instalação para áreas acima dos limiares legais.", base: "DL 10/2015 (RJACSR)", serv: true, mais: true },
    { k: "avaliacao_impacte_ambiental", l: "Projetos sujeitos a Avaliação de Impacte Ambiental (AIA) / AincA", ent: "Autoridade de AIA (APA ou CCDR)", av: "DIA favorável ou condicionada é requisito prévio do licenciamento.", base: "DL 151-B/2013 (alt. DL 152-B/2017, DL 11/2023)", serv: true, mais: true },
    { k: "ambito_estrategico_regional", l: "Programas Regionais de Ordenamento do Território (PROT) / PROF florestais", ent: "CCDR / ICNF", av: "Orientações transpostas para os PDM (ex.: corredores ecológicos, espaços florestais sensíveis).", base: "RJIGT DL 80/2015; DL 16/2009 (PROF)", serv: false, mais: true },
    { k: "ra_acores_regimes", l: "Açores – regimes regionais equivalentes (RAN, REN/áreas de risco, Parques Naturais de Ilha, POOC, POBH lagoas)", ent: "Direções Regionais (Agricultura, Ambiente, Ordenamento do Território) do Governo Regional dos Açores", av: "Regimes próprios; a REN continental não se aplica (existe 'reserva ecológica' em planos especiais).", base: "DLR 32/2012/A (RAN); DLR 15/2007/A (Rede Regional de Áreas Protegidas); DLR 19/2010/A (Rede Natura); RJIGT regional DLR 35/2012/A", serv: true, mais: true },
    { k: "ra_madeira_regimes", l: "Madeira – regimes regionais equivalentes (RAN, REN regional, Parque Natural da Madeira, POOC)", ent: "Secretarias Regionais (Agricultura, Ambiente) do Governo Regional da Madeira; IFCN, IP-RAM", av: "Regimes próprios aplicados por diplomas regionais.", base: "Diploma regional da RAN (a confirmar); DLR 43/2008/M (RJIGT regional); DLR 14/82/M (Parque Natural da Madeira)", serv: true, mais: true },
    { k: "ns", l: "Ainda não sei: falta ver a planta de condicionantes", serv: false },
  ];

  // Deteção automática: condicionantes que se deduzem do que o utilizador escreveu.
  const norm = (t) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const DETECT = [
    { k: "hidrico", re: /\b(rio|ribeira|ribeiro|praia|beira[- ]mar|beira[- ]rio|marginal|margem|lagoa|barragem|estuario|ria de|ria formosa|costa d|arriba|duna|levada)\b/ },
    { k: "estradas", re: /\b(estrada nacional|e\.?n\.? ?\d{1,3}|i[cp] ?\d{1,2}|a\d{1,2}|autoestrada|auto-estrada|itinerario|variante|linha do|linha de (cascais|sintra|azambuja|sado|minho|norte|beira|oeste|douro|algarve)|comboio|ferrovia|caminho de ferro|estacao de|passagem de nivel)\b/ },
    { k: "aqueduto", re: /\b(aqueduto|conduta|reservatorio|mae d.agua|adutor)\b/ },
    { k: "eletrica", re: /\b(alta tensao|media tensao|linha eletrica|poste de alta|subestacao)\b/ },
    { k: "gas", re: /\b(gasoduto|oleoduto)\b/ },
    { k: "aero", re: /\b(aeroporto|aerodromo|heliporto|base aerea)\b/ },
    { k: "militar", re: /\b(quartel|base aerea|base naval|militar|paiol|carreira de tiro|regimento)\b/ },
    { k: "porto", re: /\b(doca|cais|marina|porto de pesca|zona portuaria|terminal portuario)\b/ },
    { k: "natura", re: /\b(parque natural|reserva natural|paisagem protegida|rede natura|parque nacional|mata nacional|serra d[aeo]s?|sitio de interesse)\b/ },
    { k: "ran", re: /\b(quinta|herdade|terreno agricola|rustico|vinha|olival|pomar|horta|leziria|varzea|monte alentejano)\b/ },
    { k: "incendio", re: /\b(pinhal|eucaliptal|floresta|florestal|mata|rustico|serra d[aeo]s?|monte alentejano)\b/ },
    { k: "turismo", re: /\b(hotel|hostel|pousada|aldeamento|apartamento turistico|empreendimento turistico|agroturismo|turismo rural|turismo de habitacao|turismo no espaco rural|parque de campismo)\b/ },
  ];
  const PATRIMONIO_RE = /\b(castelo|muralhas?|aqueduto|se catedral|catedral|mosteiro|convento|palacio|pelourinho|torre de menagem|centro historico|zona historica|monumento|patrimonio mundial)\b/;
  const PATRIMONIO_FRACO_RE = /\b(igreja|capela|ermida|forte|fortaleza|solar d[aeo]s?|casa nobre|chafariz)\b/;
  function detectar(s) {
    const txt = " " + norm([s.morada, s.freguesia, s.descricao, s.usoNovo].join(" | ")) + " ";
    const out = {};
    DETECT.forEach((d) => { const m = txt.match(d.re); if (m && !out[d.k]) out[d.k] = `menciona "${m[0].trim()}"`; });
    const pisos = parseInt(s.pisos, 10);
    if (pisos >= 10) out.scie34 = `${pisos} pisos (altura provável acima de 28 m)`;
    if (/^(nova|ampliacao|reconstrucao|loteamento)$/.test(s.tipo) && out.incendio && !/\b(rua|avenida|praca|largo|travessa)\b/.test(txt)) out.incendio += ", fora de malha urbana";
    else if (out.incendio && /\b(rua|avenida|praca|largo|travessa)\b/.test(txt) && !/\b(rustico|pinhal|eucaliptal|floresta)\b/.test(txt)) delete out.incendio;
    const pm = txt.match(PATRIMONIO_RE), pf = txt.match(PATRIMONIO_FRACO_RE);
    return { cond: out, patrimonio: pm ? `menciona "${pm[0].trim()}"` : "", patrimonioFraco: !pm && pf ? `menciona "${pf[0].trim()}"` : "" };
  }
  // Condicionantes efetivas = encontradas no mapa + deduzidas das respostas. O utilizador não as escolhe.
  function condOrigem(s) {
    const o = {}, q = q_(s);
    (s.condMapa || []).forEach((k) => { if (k !== "pat") o[k] = "mapa"; });
    QUESTIONS.forEach((qq) => { const m = RESP_COND[qq.id]; if (m && VISIVEL(qq, s)) [].concat(q[qq.id] || []).forEach((v) => { if (m[v]) o[m[v]] = o[m[v]] || "resposta"; }); });
    if (RESP_COND.usoNovo[q.usoNovo] && ["uso", "usoObras", "nova", "modular", "ampliacao", "reconstrucao", "utilizacao"].includes(s.tipoSel)) o[RESP_COND.usoNovo[q.usoNovo]] = o[RESP_COND.usoNovo[q.usoNovo]] || "resposta";
    if (parseInt(s.pisos, 10) >= 10) o.scie34 = "resposta";
    return o;
  }
  function effCond(s) { const c = {}; Object.keys(condOrigem(s)).forEach((k) => { c[k] = true; }); return c; }
  function effQ(s) {
    const c = effCond(s), q = Object.assign({}, s.q || {});
    q.servidao = COND.some((x) => x.serv && c[x.k]) ? "sim" : "nao";
    if ((s.condMapa || []).includes("pat") && !["sim", "conjunto", "zp"].includes(q.classificado)) { q.classificado = "zp"; q.patIncerto = true; }
    q.prot = ["sim", "conjunto"].includes(q.classificado) ? "cl" : q.classificado === "zp" ? "zp" : "";
    if (!VISIVEL(QUESTIONS.find((x) => x.id === "fachada"), s)) delete q.fachada;
    if (!VISIVEL(QUESTIONS.find((x) => x.id === "azulejos"), s)) delete q.azulejos;
    // Fração: apartamento ou loja; numa mudança de uso conta sempre, nas obras só se mexer em partes comuns.
    const fr = ["apartamento", "loja"].includes(q.predio);
    q.fracao = !fr ? "nao" : s.tipoSel === "uso" || s.tipoSel === "usoObras" ? "sim" : (q.comuns || "ns");
    return q;
  }

  // ---------- Lógica de enquadramento ----------
  const PROC = {
    isento: { nome: "Isenta de controlo prévio", cor: "var(--green)", resumo: "Não precisa de licença nem de comunicação prévia. Tem de cumprir as normas técnicas e o PDM, e a câmara continua a poder fiscalizar." },
    isentoTermo: { nome: "Isenta, com projeto e termo de estabilidade", cor: "var(--green)", resumo: "Não precisa de licença nem de comunicação prévia, mas como mexe na estrutura um técnico habilitado faz o projeto de estabilidade e assina um termo a atestar que a obra melhora ou não prejudica a estrutura. Ambos são entregues com a comunicação de início dos trabalhos." },
    cp: { nome: "Comunicação prévia", cor: "var(--blue)", resumo: "Submete o processo completo na câmara, paga as taxas por autoliquidação e pode começar a obra. Não há decisão expressa. Depois, a câmara pode pedir uma única vez o que faltar (10 dias para entregar); a verificação dos projetos caduca 1 ano após o pagamento das taxas, mas a fiscalização da obra continua." },
    cpPrazo: { nome: "Comunicação prévia com prazo", cor: "var(--blue)", resumo: "Para usar ou mudar o uso de um edifício sem obra sujeita a licença ou comunicação prévia. Pode usar o imóvel 10 dias depois de submeter, se a câmara não rejeitar a comunicação nem marcar vistoria nesse prazo." },
    cpUtil: { nome: "Comunicação prévia de utilização", cor: "var(--blue)", resumo: "Depois de uma obra com licença, comunicação prévia ou PIP completo: submete a comunicação com o termo do diretor de obra e pode usar o edifício logo a seguir. A câmara verifica depois os elementos." },
    lic: { nome: "Licenciamento", cor: "var(--red)", resumo: "Precisa de aprovação expressa da câmara antes de começar. Se a câmara não decidir dentro dos prazos legais, há deferimento tácito. O comprovativo de pagamento das taxas, com o requerimento e a notificação do deferimento, é o título da obra." },
    pedido: { nome: "Pedido à câmara", cor: "var(--blue)", resumo: "Não é um procedimento de obra: é um pedido ou certidão que se faz à câmara municipal, nos termos indicados." },
  };

  function decide(s) {
    const q = effQ(s);
    const yes = (k) => q[k] === "sim", no = (k) => q[k] === "nao", ns = (k) => q[k] === "ns" || !q[k];
    const alerts = [];
    let p, refs = [], motivo = "", extraPassos = null, extraDocs = null;
    const set = (o) => { p = o.p; refs = o.refs; motivo = o.motivo; };
    const PIP = { p: "isento", refs: ["art. 6.º, n.º 1, al. h) RJUE", "art. 17.º, n.º 2"], motivo: "Um PIP favorável que trate todos os pontos das alíneas a) a f) do art. 14.º, n.º 2, isenta a obra de licença e de comunicação prévia, desde que a obra siga exatamente o que foi apreciado." };

    // Enquadramento geral das obras de construção, alteração e ampliação (art. 4.º).
    function generic(base) {
      if (yes("loteamento")) return { p: "cp", refs: ["art. 4.º, n.º 4, al. d) RJUE"], motivo: `${base} em área de loteamento, plano de pormenor ou unidade de execução com parâmetros definidos.` };
      if (yes("servidao")) return { p: "lic", refs: ["art. 4.º, n.º 2, al. h) RJUE"], motivo: `${base} em área com servidão ou restrição de utilidade pública que não está prevista em plano de pormenor, loteamento ou unidade de execução.` };
      if (yes("zuc") && yes("cercea")) return { p: "cp", refs: ["art. 4.º, n.º 4, al. e) RJUE"], motivo: `${base} em zona urbana consolidada, a respeitar os planos e sem altura acima da mais frequente na frente de rua.` };
      if (ns("loteamento") || ns("zuc") || (yes("zuc") && ns("cercea")))
        alerts.push({ t: "Se o terreno estiver em loteamento ou plano de pormenor, ou em zona urbana consolidada com altura igual ou abaixo da dominante, o procedimento desce para comunicação prévia (e aí não se pode optar pela licença). Confirme no PDM." });
      return { p: "lic", refs: ["art. 4.º, n.º 2, al. c) RJUE"], motivo: `${base} fora dos casos de comunicação prévia.` };
    }
    const termoEstrutura = "projeto de estabilidade e termo de responsabilidade de técnico habilitado (e projeto de reforço sísmico, quando exigível), entregues para depósito com a comunicação de início dos trabalhos";

    let tipo = s.tipo;
    if (["conservacao", "interior", "fracoes"].includes(tipo) && yes("fachada")) {
      alerts.push({ i: 1, t: "Como a obra também mexe na fachada, na cobertura ou na altura, foi tratada como alteração exterior." });
      tipo = "exterior";
    }
    switch (tipo) {
      case "conservacao":
        if (yes("azulejos")) set({ p: "lic", refs: ["art. 4.º, n.º 2, al. i) RJUE"], motivo: "Obras de que resulte a remoção de azulejos de fachada estão sujeitas a licença." });
        else set({ p: "isento", refs: ["art. 6.º, n.º 1, al. a) RJUE"], motivo: "Obras de conservação estão isentas de controlo prévio." });
        break;
      case "interior":
        if (yes("estrutura")) set({ p: "isentoTermo", refs: ["art. 6.º, n.º 1, al. b) RJUE"], motivo: `Alterações no interior estão isentas. Como mexem na estrutura, é preciso ${termoEstrutura}.` });
        else set({ p: "isento", refs: ["art. 6.º, n.º 1, al. b) RJUE"], motivo: "Alterações no interior que não mexem na estrutura, nas fachadas, na cobertura nem nas alturas estão isentas." });
        if (ns("estrutura")) alerts.push({ t: "Confirme com um técnico se a obra mexe em paredes resistentes ou lajes. Se mexer, é preciso projeto de estabilidade e termo de responsabilidade." });
        if (s.tipoSel === "acess") alerts.push({ i: 1, t: "Elevadores e plataformas cumprem as normas técnicas de acessibilidade (DL 163/2006) e de segurança de ascensores. Num prédio em propriedade horizontal, veja no Código Civil (art. 1425.º) as regras para obras de acessibilidade nas partes comuns." });
        break;
      case "fracoes":
        set({ p: "cpPrazo", refs: ["art. 6.º, n.º 1, al. b) RJUE", "art. 62.º-B, n.º 1, al. b)", "art. 1419.º Código Civil"], motivo: "As obras interiores para dividir ou juntar frações estão isentas. A nova divisão em frações ou fogos altera o título de utilização e comunica-se depois por comunicação prévia com prazo." });
        if (yes("estrutura")) alerts.push({ t: `Como as obras mexem na estrutura, é preciso ${termoEstrutura}.` });
        alerts.push({ t: "Alterar o título da propriedade horizontal precisa do acordo de todos os condóminos e de escritura ou documento autenticado. A certidão da câmara de que as frações cumprem os requisitos pode ser pedida com a comunicação (art. 66.º, n.º 3)." });
        break;
      case "acessVia":
        set({ p: "pedido", refs: ["Regulamento municipal de ocupação do espaço público"], motivo: "Uma rampa ou plataforma no passeio ocupa espaço público: precisa de licença de ocupação do domínio público municipal, pedida à câmara." });
        extraPassos = [["Pedir à câmara a ocupação do espaço público", "Com planta, fotografias e descrição da rampa ou plataforma. Algumas câmaras têm apoio próprio para acessibilidade."], ["Executar a obra", "Com as normas técnicas de acessibilidade (DL 163/2006)."]];
        extraDocs = [["Pedido de ocupação do espaço público", "Ver minuta de ocupação da via pública."], ["Planta de localização e desenho da rampa ou plataforma", ""], ["Fotografias do local", ""]];
        break;
      case "exterior":
        if (yes("pip")) { set(PIP); break; }
        if (yes("azulejos")) { set({ p: "lic", refs: ["art. 4.º, n.º 2, al. i) RJUE"], motivo: "Obras de que resulte a remoção de azulejos de fachada estão sujeitas a licença, mesmo em fachadas para logradouros." }); break; }
        set(generic(s.tipoSel === "acess" ? "Rampa, elevador ou plataforma no exterior do edifício" : "Alteração exterior"));
        if (["fachada", "cobertura", "vaos"].includes(s.tipoSel)) alerts.push({ i: 1, t: "Substituir janelas ou portas por outras com a mesma geometria e acabamento exterior, ou revestimentos e telhas por outros idênticos, que melhorem a eficiência energética, é obra de escassa relevância e fica isenta." });
        break;
      case "escassa":
        set({ p: "isento", refs: ["art. 6.º-A RJUE"], motivo: "Obras de escassa relevância urbanística estão isentas de controlo prévio." });
        if (s.tipoSel === "vaos") refs = ["art. 6.º-A, n.º 1, al. j) RJUE"];
        if (revIgual(s)) { refs = ["art. 6.º-A, n.º 1, al. h) RJUE"]; motivo = "Substituir o revestimento exterior ou da cobertura por outro com acabamento idêntico, que melhore a eficiência energética, é obra de escassa relevância e está isenta."; }
        alerts.push({ t: "Limites da lei: anexo até 10 m² e 2,2 m de altura sem confinar com a via pública; estufa de jardim abaixo de 3 m e até 20 m²; muro de vedação até 1,8 m sem confinar com a via pública; muro de suporte até 2 m. O regulamento municipal pode alargar estes limites." });
        if (yes("servidao")) alerts.push({ t: "Em área com servidão (REN, RAN, domínio hídrico) pode ser preciso parecer ou autorização da entidade que a gere, mesmo sem procedimento camarário." });
        break;
      case "equip": {
        const e = [].concat(q.equip || []);
        const so = (lista) => e.length && e.every((x) => lista.includes(x));
        if (so(["carregador"])) set({ p: "isento", refs: ["art. 2.º, al. j) RJUE"], motivo: "Instalar um carregador de carro elétrico num lugar de estacionamento não é uma operação urbanística: não precisa de procedimento camarário." });
        else if (so(["solar", "solarSolo", "eolico", "bateria", "carregador"])) set({ p: "isento", refs: ["art. 6.º-A, n.º 1, al. g) RJUE"], motivo: "Painéis solares, geradores eólicos domésticos e baterias associados a um edifício são obras de escassa relevância, dentro dos limites da lei." });
        else set({ p: "isento", refs: ["art. 6.º-A, n.º 1, al. i) RJUE"], motivo: "Estes equipamentos são normalmente tratados como obras de escassa relevância pelo regulamento municipal. Se o regulamento do concelho não os incluir, contam como alteração da fachada ou da cobertura." });
        break;
      }
      case "ampliacao":
        if (yes("pip")) { set(PIP); break; }
        set(generic("Ampliação"));
        alerts.push({ i: 1, t: "Desde 1 de outubro de 2026 (DL 108/2026) a ampliação deixou de estar isenta, mesmo quando não aumenta a altura da fachada." });
        break;
      case "reconstrucao":
        if (yes("reconstFiel")) {
          set({ p: "isento", refs: ["art. 6.º, n.º 1, al. e) RJUE", "art. 2.º, al. c)"], motivo: "A reconstrução que repõe as fachadas e a cobertura, segundo o último antecedente válido, está isenta de licença e de comunicação prévia. A demolição que faz parte dela não precisa de licença própria." });
          alerts.push({ t: "Guarde a prova do último antecedente válido (projeto aprovado ou prova de que a construção não precisava de licença). A obra tem de cumprir as normas técnicas e pode ser fiscalizada." });
          break;
        }
        if (yes("pip")) { set(PIP); break; }
        set(generic("Reconstrução que altera fachadas, cobertura ou volumes (conta como construção ou ampliação)"));
        if (ns("reconstFiel")) alerts.push({ t: "Se a reconstrução repuser as fachadas e a cobertura como estavam, fica isenta. Confirme com o projeto." });
        break;
      case "nova":
        if (yes("pip")) { set(PIP); break; }
        set(generic(s.tipoSel === "modular" ? "Casa modular ou pré-fabricada (é construção nova, seja qual for o sistema construtivo)" : s.tipoSel === "agricola" ? "Construção agrícola" : s.tipoSel === "anexo" ? "Anexo acima dos limites da escassa relevância" : "Construção nova"));
        if (s.tipoSel === "modular") alerts.push({ i: 1, t: "Uma casa modular, de madeira ou feita de contentores, assente no terreno com carácter de permanência, é edificação: segue as mesmas regras da construção tradicional (art. 2.º, al. a))." });
        if (s.tipoSel === "agricola") alerts.push({ i: 1, t: "Em solo rústico confirme no PDM o que é permitido. Em RAN ou REN é preciso parecer ou comunicação à entidade regional." });
        break;
      case "amovivel":
        set({ p: "isento", refs: ["art. 2.º, al. a) e j) RJUE"], motivo: "Estruturas amovíveis, sem fundações nem carácter de permanência, usadas só para fins agrícolas, em regra não são edificação nem operação urbanística." });
        alerts.push({ t: "Confirme com a câmara e veja o PDM: alguns regulamentos fixam regras para estufas e abrigos. Em RAN, REN ou área protegida pode ser precisa autorização." });
        break;
      case "piscina":
        if (yes("pip")) { set(PIP); break; }
        if (no("piscinaAssoc")) { set(generic("Piscina sem edifício principal (segue as regras da construção)")); break; }
        if (yes("servidao") && !yes("loteamento")) { set({ p: "lic", refs: ["art. 4.º, n.º 2, al. h) RJUE"], motivo: "Construção em área com servidão ou restrição de utilidade pública está sujeita a licença." }); break; }
        set({ p: "cp", refs: ["art. 4.º, n.º 4, al. j) RJUE"], motivo: "Piscinas associadas a uma edificação principal estão sujeitas a comunicação prévia." });
        if (ns("piscinaAssoc")) alerts.push({ t: "Se a piscina não estiver associada a uma habitação ou edifício principal, aplica-se o enquadramento geral da construção nova." });
        break;
      case "demolicao":
        if (q.demoTipo === "ilegal") { set({ p: "isento", refs: ["art. 6.º, n.º 1, al. i) RJUE"], motivo: "A demolição de construções ilegais está isenta de licença e de comunicação prévia." }); break; }
        if (q.demoTipo === "obra") { set({ p: "isento", refs: ["art. 4.º, n.º 2, al. f) RJUE"], motivo: "A demolição que faz parte de uma reconstrução ou construção nova entra no procedimento dessa obra; numa reconstrução isenta, também fica isenta." }); alerts.push({ t: "Escolha antes o tipo de intervenção da obra principal (reconstrução ou construção nova) para ver o seu enquadramento." }); break; }
        if (yes("pip")) { set(PIP); break; }
        if (yes("loteamento")) set({ p: "cp", refs: ["art. 4.º, n.º 4, al. d) RJUE"], motivo: "Demolição em área de loteamento, plano de pormenor ou unidade de execução com parâmetros definidos está sujeita a comunicação prévia." });
        else set({ p: "lic", refs: ["art. 4.º, n.º 2, al. f) RJUE"], motivo: "A demolição que não faz parte de uma reconstrução está sujeita a licença." });
        alerts.push({ i: 1, t: "A demolição de anexos, muros e outras obras de escassa relevância está isenta (art. 6.º-A, n.º 1, al. f))." });
        break;
      case "uso":
        set({ p: "cpPrazo", refs: ["art. 4.º, n.º 5 RJUE", "arts. 62.º-B, 63.º e 64.º"], motivo: "Mudar o uso sem obras faz-se por comunicação prévia com prazo: pode usar o imóvel 10 dias depois de submeter, se a câmara não rejeitar nem marcar vistoria." });
        if (yes("fracao")) alerts.push({ t: "Numa fração em propriedade horizontal, se o título constitutivo não fixar o fim da fração, a mudança de uso precisa de autorização da assembleia de condóminos por 2/3 do valor do prédio. A mudança para habitação dispensa essa autorização." });
        alerts.push({ i: 1, t: "Se o uso pretendido for comércio, restauração ou alojamento local, há registos próprios (Balcão do Empreendedor / RNAL) a juntar a este passo." });
        break;
      case "usoObras":
        if (yes("fachada")) {
          set(generic("Obras exteriores com mudança de uso"));
          alerts.push({ i: 1, t: "Acabada a obra, a nova utilização comunica-se por comunicação prévia de utilização (art. 62.º-A) e o imóvel pode ser usado logo a seguir." });
        } else {
          set({ p: "cpPrazo", refs: ["art. 6.º, n.º 1, al. b) RJUE", "art. 62.º-B, n.º 1, al. b)", "art. 64.º"], motivo: "As obras interiores estão isentas. Acabadas as obras, a mudança de uso comunica-se por comunicação prévia com prazo: pode usar o imóvel 10 dias depois, se a câmara não rejeitar nem marcar vistoria." });
          if (yes("estrutura")) alerts.push({ t: `Como as obras mexem na estrutura, é preciso ${termoEstrutura}.` });
        }
        if (yes("fracao")) alerts.push({ t: "Numa fração em propriedade horizontal, se o título constitutivo não fixar o fim da fração, a mudança de uso precisa de autorização da assembleia de condóminos por 2/3 do valor do prédio." });
        break;
      case "utilizacao":
        if (q.utilObra === "controlada") set({ p: "cpUtil", refs: ["art. 4.º, n.º 4, al. k) RJUE", "art. 62.º-A"], motivo: "Depois de uma obra com licença, comunicação prévia ou PIP completo, a utilização comunica-se à câmara por comunicação prévia, com o termo do diretor de obra. O edifício pode ser usado logo a seguir." });
        else if (q.utilObra === "anterior1951") {
          set({ p: "pedido", refs: ["RGEU (DL 38 382, de 7 de agosto de 1951)"], motivo: "Os edifícios construídos antes de 1951 não precisavam de licença de utilização. A prova faz-se com certidão da câmara, que substitui o título de utilização." });
          extraPassos = [["Reunir a prova da data", "Fotografias antigas, registos prediais ou matriciais antigos, plantas, cartografia histórica."], ["Pedir a certidão à câmara", "Ver minuta. A taxa consta do regulamento municipal."]];
          extraDocs = [["Requerimento da certidão de construção anterior a 1951", "Ver minuta."], ["Planta de localização e fotografias do edifício", ""], ["Provas da data de construção", "Registos antigos, cartografia ou fotografias aéreas."]];
        } else {
          set({ p: "cpPrazo", refs: ["art. 4.º, n.º 5 RJUE", "arts. 62.º-B, 63.º e 64.º"], motivo: "Sem obra com licença ou comunicação prévia antes (incluindo depois de obras isentas), a utilização comunica-se por comunicação prévia com prazo: pode usar o imóvel 10 dias depois, se a câmara não rejeitar nem marcar vistoria." });
          if (!q.utilObra) alerts.push({ t: "Indique se houve obra antes. Depois de obra com licença ou comunicação prévia, a comunicação é imediata (art. 62.º-A)." });
        }
        break;
      case "legalizacao":
        set({ p: "lic", refs: ["art. 102.º-A RJUE"], motivo: "Obras feitas sem controlo prévio legalizam-se pelo procedimento de legalização, com os elementos exigidos para a obra concreta e o regulamento municipal de legalização." });
        alerts.push({ t: "Pode pedir antes à câmara informação sobre os termos da legalização; a câmara responde em 15 dias (art. 102.º-A, n.º 6). Sem obras a fazer, dispensam-se calendarização, estimativa de custo, caução, seguros e alvará do empreiteiro. Pode ser dispensado o cumprimento de normas técnicas impossíveis de cumprir, se cumprir as da data da construção (prova a cargo do requerente). Pode haver contraordenação." });
        if (q.legalTipo === "uso") alerts.push({ i: 1, t: "Para legalizar só o uso, sem obras, basta normalmente a comunicação prévia com prazo de alteração de utilização (art. 62.º-B)." });
        break;
      case "terreno":
        if (yes("pip")) { set(PIP); break; }
        if (yes("loteamento")) set({ p: "cp", refs: ["art. 4.º, n.º 4, al. c) RJUE"], motivo: "Trabalhos de remodelação de terrenos em área de loteamento, plano de pormenor ou unidade de execução que defina essas obras estão sujeitos a comunicação prévia." });
        else set({ p: "lic", refs: ["art. 4.º, n.º 2, al. b) RJUE"], motivo: "Trabalhos de remodelação de terrenos (aterros, escavações, alteração do relevo, abate de árvores) estão sujeitos a licença." });
        alerts.push({ i: 1, t: "Mobilizações de solo só para agricultura, pecuária, floresta ou exploração mineira não contam como remodelação de terreno (art. 2.º, al. m)); nesses casos fale com a câmara e a DRAP." });
        break;
      case "destaque":
        if (q.destPerim !== "fora" && no("destVia")) {
          set({ p: "lic", refs: ["art. 6.º, n.º 4 RJUE", "art. 4.º, n.º 2, al. a)"], motivo: "Dentro do perímetro urbano, o destaque só está isento se as duas parcelas confrontarem com arruamentos públicos. Sem isso, dividir o terreno para construir é um loteamento, sujeito a licença." });
          break;
        }
        set({ p: "isento", refs: ["art. 6.º, n.º 1, al. d), e n.os 4 a 10 RJUE"], motivo: "O destaque de uma parcela está isento de licença, se cumprir as condições do art. 6.º. Pede-se à câmara a certidão de destaque, que serve para o registo predial." });
        if (q.destPerim === "fora") alerts.push({ t: "Fora do perímetro urbano, na parcela destacada só se pode construir um edifício de habitação com dois fogos no máximo, e a parcela restante tem de ter a área mínima de cultura (ou a do projeto de intervenção em espaço rural). Não se pode destacar de novo a mesma área durante 10 anos, e estes ónus vão ao registo predial." });
        else alerts.push({ t: "Dentro do perímetro urbano, as duas parcelas têm de confrontar com arruamentos públicos. Fora dele, na parcela destacada só se pode construir um edifício de habitação com dois fogos no máximo, e a parcela restante tem de ter a área mínima de cultura. Não se pode destacar de novo a mesma área durante 10 anos, e estes ónus vão ao registo predial." });
        break;
      case "ph":
        set({ p: "pedido", refs: ["art. 66.º RJUE", "art. 1415.º Código Civil"], motivo: "Não é uma obra: pede-se à câmara a certidão de que o edifício reúne os requisitos legais da propriedade horizontal, para a escritura e o registo. Pode ser pedida com a comunicação de utilização." });
        alerts.push({ i: 1, t: "Cada fração tem de ser independente, distinta e isolada, com saída própria para uma parte comum ou para a via pública. Junte as plantas com a divisão das frações e a memória descritiva com as permilagens." });
        extraPassos = [["Preparar as plantas e a memória", "Com a divisão das frações, as partes comuns e as permilagens."], ["Pedir a certidão à câmara", "Sozinha ou com a comunicação de utilização (art. 66.º, n.º 3)."], ["Fazer a escritura e o registo", "Título constitutivo da propriedade horizontal."]];
        extraDocs = [["Requerimento da certidão de propriedade horizontal", ""], ["Plantas com a divisão das frações", ""], ["Memória descritiva com permilagens", ""]];
        break;
      case "loteamento": {
        const urb = s.tipoSel === "urbanizacao";
        if (yes("pip")) { set(PIP); break; }
        if (yes("loteamento")) set({ p: "cp", refs: [urb ? "art. 4.º, n.º 4, al. c) RJUE" : "art. 4.º, n.º 4, al. b) RJUE"], motivo: urb ? "Obras de urbanização em área de loteamento, plano de pormenor ou unidade de execução que as defina estão sujeitas a comunicação prévia." : "Loteamento em área de plano de pormenor ou unidade de execução com desenho urbano e lotes definidos está sujeito a comunicação prévia." });
        else set({ p: "lic", refs: [urb ? "art. 4.º, n.º 2, al. b) RJUE" : "art. 4.º, n.º 2, al. a) RJUE"], motivo: urb ? "Obras de urbanização fora de loteamento, plano de pormenor ou unidade de execução que as defina estão sujeitas a licença." : "Loteamentos fora de plano de pormenor ou unidade de execução com conteúdo definido estão sujeitos a licença." });
        alerts.push({ i: 1, t: "Neste tipo de operação um PIP prévio costuma compensar: fixa os parâmetros e, se tratar todos os pontos do art. 14.º, n.º 2, isenta de controlo prévio." });
        break;
      }
      case "altLoteamento":
        if (q.altLote === "ate3") set({ p: "lic", refs: ["art. 27.º, n.º 8 RJUE"], motivo: "Alterações a um loteamento até 3% das áreas de implantação ou de construção, ou do número de fogos, que cumpram o PDM, são aprovadas por simples deliberação da câmara, sem outras formalidades." });
        else set({ p: "lic", refs: ["art. 27.º RJUE"], motivo: "Alterar um loteamento licenciado faz-se por pedido de alteração da licença, que aproveita os documentos do processo que se mantenham válidos." });
        alerts.push({ t: "A alteração não pode ser aprovada se houver oposição escrita dos donos da maioria da área dos lotes; a câmara notifica-os com 10 dias para se pronunciarem. Pode haver consulta pública. A alteração aprovada é averbada no registo predial." });
        break;
      case "alteracoesObra":
        if (q.altObra === "isentas") set({ p: "isento", refs: ["art. 83.º, n.º 2 RJUE"], motivo: "Alterações em obra que seriam isentas não precisam de comunicação. Entram nas telas finais e no termo do diretor de obra." });
        else if (q.altObra === "ampliacao") {
          if (q.procInicial === "cp") set({ p: "cp", refs: ["art. 83.º, n.º 3 RJUE", "art. 35.º"], motivo: "Alterações em obra que ampliam ou mudam a implantação seguem o procedimento inicial: nova comunicação prévia, só com os elementos alterados." });
          else if (q.procInicial === "pip") set({ p: "pedido", refs: ["art. 83.º, n.º 3 RJUE", "art. 14.º, n.º 2"], motivo: "Alterações em obra que ampliam ou mudam a implantação de uma obra isenta por PIP precisam de nova informação prévia, só com os elementos alterados." });
          else set({ p: "lic", refs: ["art. 83.º, n.º 3 RJUE", "art. 27.º"], motivo: "Alterações em obra que ampliam ou mudam a implantação seguem o procedimento inicial: pedido de alteração da licença, só com os elementos alterados." });
        } else set({ p: "cp", refs: ["art. 83.º, n.º 1 RJUE", "art. 35.º"], motivo: "Alterações ao projeto durante a obra comunicam-se por comunicação prévia, só com os elementos alterados, a tempo de estarem concluídas antes da comunicação de utilização." });
        break;
      case "prazoObra":
        if (q.prazoTipo === "caducou") {
          set({ p: q.procInicial === "cp" ? "cp" : "lic", refs: ["art. 72.º RJUE"], motivo: "Com o título caducado, pede nova licença, apresenta nova comunicação prévia ou novo PIP, aproveitando os elementos do processo anterior que se mantenham válidos." });
        } else if (q.prazoTipo === "avancada") {
          set({ p: "lic", refs: ["art. 88.º RJUE"], motivo: "Com a obra em fase avançada e o título caducado, pode pedir uma licença especial para a concluir, se a demolição não for aconselhável por razões ambientais, urbanísticas, técnicas ou económicas." });
        } else {
          set({ p: "pedido", refs: ["art. 58.º, n.os 5 e 8 RJUE"], motivo: "Peça a prorrogação antes do fim do prazo, com requerimento fundamentado. A câmara decide em 15 dias; sem resposta, considera-se deferida. Não há novo título: junta-se o comprovativo ao título existente." });
          extraPassos = [["Fazer o pedido antes de acabar o prazo", "Requerimento fundamentado com o novo prazo e o motivo. Ver minuta."], ["Aguardar 15 dias", "Sem resposta, a prorrogação considera-se concedida."], ["Pagar a taxa, se houver", "E juntar o comprovativo ao título da obra."]];
          extraDocs = [["Requerimento de prorrogação", "Ver minuta."], ["Nova calendarização da obra", ""]];
        }
        break;
      case "escavacao":
        set({ p: "pedido", refs: ["art. 81.º RJUE", "art. 23.º, n.º 6"], motivo: "Nas obras sujeitas a licença, depois de aprovada a arquitetura, pode pedir ao presidente da câmara para demolir, escavar e fazer a contenção periférica até ao piso mais baixo, com caução. A decisão é em 15 dias e a notificação do deferimento é o título, guardado na obra." });
        if (!yes("arqAprovada")) alerts.push({ t: "Este pedido só pode ser feito depois de aprovado o projeto de arquitetura." });
        alerts.push({ i: 1, t: "Também pode pedir uma licença parcial para construir a estrutura, depois de aprovada a arquitetura, com projeto de estabilidade e caução para a demolir se a licença não for concedida (art. 23.º, n.º 6)." });
        extraPassos = [["Confirmar que a arquitetura está aprovada", "O pedido só é possível a partir daí."], ["Preparar o plano de demolição ou o projeto de escavação e contenção", "Com o projeto de estabilidade."], ["Prestar a caução", "Para repor o terreno se a obra não avançar."], ["Fazer o pedido", "O presidente da câmara decide em 15 dias."], ["Guardar a notificação na obra", "É o título destes trabalhos."]];
        extraDocs = [["Requerimento ao abrigo do art. 81.º", ""], ["Plano de demolições ou projeto de escavação e contenção periférica", ""], ["Projeto de estabilidade", ""], ["Comprovativo da caução", ""]];
        break;
    }

    // Património: o próprio imóvel classificado (ou em conjunto) e a zona de proteção têm regras diferentes (art. 4.º, n.º 2, al. d)).
    const OBRA_P = ["isento", "isentoTermo", "cp", "lic"];
    const interiorCl = q.prot === "cl" && ["usoObras", "fracoes"].includes(tipo);
    if (q.prot && (OBRA_P.includes(p) || interiorCl) && !["destaque", "loteamento", "altLoteamento", "amovivel", "prazoObra", "legalizacao"].includes(tipo) && !(tipo === "equip" && [].concat(q.equip || []).every((x) => x === "carregador")) && !(tipo === "demolicao" && q.demoTipo === "ilegal")) {
      const licPat = (txt) => {
        if (yes("pip")) set({ p: "cp", refs: ["art. 4.º, n.º 4, al. l) RJUE", "art. 14.º, n.º 2"], motivo: txt + " Como tem PIP favorável com todos os elementos, passa a comunicação prévia." });
        else set({ p: "lic", refs: ["art. 4.º, n.º 2, al. d) RJUE", "Lei 107/2001 (património cultural)"], motivo: txt });
      };
      if (q.prot === "cl") {
        if (tipo === "conservacao" && p !== "lic") set({ p: "isento", refs: ["art. 6.º, n.º 1, al. k) RJUE", "art. 4.º, n.º 2, al. d)"], motivo: "Obras de conservação de imóvel classificado ficam isentas só com parecer favorável do Património Cultural, entregue com a comunicação de início dos trabalhos. Sem esse parecer, precisam de licença." });
        else licPat("Obras em imóvel classificado, em vias de classificação ou integrado em conjunto ou sítio classificado estão sujeitas a licença. As isenções de escassa relevância não se aplicam.");
      } else {
        const exteriorZP = ["exterior", "ampliacao", "nova", "piscina", "demolicao", "equip"].includes(tipo) || (tipo === "escassa" && s.tipoSel !== "vaos") || (tipo === "usoObras" && yes("fachada"));
        if (exteriorZP) licPat("Construção, ampliação, alteração exterior ou demolição na zona de proteção de um imóvel classificado está sujeita a licença. As isenções de escassa relevância não se aplicam aqui, salvo a troca de caixilharia por outra idêntica.");
        else if (tipo === "escassa" && s.tipoSel === "vaos") alerts.push({ i: 1, t: "Na zona de proteção, a troca de caixilharia continua isenta se mantiver a geometria e o acabamento exterior e melhorar a eficiência energética (art. 6.º-A, n.º 1, al. j))." });
        else if (tipo === "reconstrucao" && p === "isento") alerts.push({ i: 1, t: "Na zona de proteção, a reconstrução que repõe fachadas e cobertura continua isenta; só o próprio imóvel classificado exige licença." });
      }
      alerts.unshift({ t: q.prot === "cl" ? "Há parecer obrigatório e vinculativo do Património Cultural, I.P. (ou da CCDR). Junte fotografias e o relatório prévio de obra em património." : "Nas obras exteriores há parecer do Património Cultural, I.P. (ou da CCDR) sobre a zona de proteção." });
      if (q.patIncerto) alerts.unshift({ t: "O mapa encontrou proteção patrimonial neste local. Foi tratado como zona de proteção; se o próprio imóvel for classificado, quase todas as obras passam a licença. Confirme no questionário." });
    } else if (ns("classificado") && OBRA_P.includes(p)) alerts.push({ t: "Falta confirmar se o imóvel tem proteção patrimonial. No próprio imóvel classificado quase todas as obras exigem licença; na zona de proteção, as obras exteriores." });

    if (yes("servidao") && (p === "lic" || p === "cp")) alerts.push({ t: "As condicionantes do local obrigam a pareceres de entidades externas. Têm 20 dias para responder; sem resposta, conta como concordância (art. 13.º). Veja quais no separador Entidades." });
    if (yes("fracao") && !["uso", "usoObras", "fracoes"].includes(s.tipoSel)) alerts.push({ t: "Obras em partes comuns, ou que alterem a linha arquitetónica ou o arranjo estético do edifício, precisam de aprovação da assembleia de condóminos (art. 1422.º do Código Civil). Junte a ata." });
    if (s.tipoSel === "equipamentos") {
      const e = q.equip;
      if (!e || ![].concat(e).length) alerts.push({ t: "Escolha o que vai instalar para ver as regras de cada equipamento." });
      if (tem(e, "solar") || tem(e, "solarSolo") || tem(e, "bateria")) alerts.push({ i: 1, t: "Fora de imóveis protegidos, os painéis solares estão isentos se não excederem a área da cobertura nem a altura do edifício em mais de 1 m. Depósitos e baterias têm de ficar ocultos. Acima de certas potências há registo na DGEG." });
      if (tem(e, "eolico")) alerts.push({ t: "O gerador eólico está isento até 4 m acima do edifício e 1,5 m de raio, mas tem de notificar a câmara antes, com localização, altura, raio, ruído e termo de responsabilidade (art. 6.º-A, n.os 5 e 6)." });
      if (tem(e, "ac")) alerts.push({ t: "Aparelhos de ar condicionado visíveis da via pública costumam ser proibidos ou limitados pelo regulamento municipal, sobretudo em centros históricos. Veja o separador Regras da câmara. Num prédio em propriedade horizontal, na fachada, precisa da autorização do condomínio." });
      if (tem(e, "antena")) alerts.push({ i: 1, t: "Antenas de operadores de telecomunicações seguem regime próprio (DL 11/2003). Antenas domésticas são em regra isentas, mas o regulamento municipal pode impor a localização na cobertura." });
      if (tem(e, "carregador")) alerts.push({ i: 1, t: "Num prédio em propriedade horizontal, o regime da mobilidade elétrica tem regras próprias para instalar carregadores na garagem comum: fale antes com a administração do condomínio. A instalação é feita por técnico habilitado." });
      if (tem(e, "chamine")) alerts.push({ t: "Chaminés e condutas de exaustão na fachada ou acima da cobertura alteram o aspeto exterior: confirme o regulamento municipal. Restaurantes têm regras próprias de exaustão de fumos." });
      if (tem(e, "toldo")) alerts.push({ t: "Toldos, reclamos e letreiros seguem o regulamento municipal de publicidade e de ocupação do espaço público; muitas vezes basta uma mera comunicação no Balcão do Empreendedor." });
      if (tem(e, "gas")) alerts.push({ t: "Depósitos de gás ou de combustível e geradores têm regime de segurança próprio (projeto e entidade inspetora). Confirme também as distâncias exigidas pela segurança contra incêndio." });
    }
    if (yes("viaPublica")) alerts.push({ t: "Peça a licença de ocupação da via pública. No licenciamento pode ir no mesmo pedido (art. 4.º, n.º 7); nos outros casos é um pedido à parte." });
    if (yes("anterior1951")) alerts.push({ i: 1, t: "Peça à câmara a certidão de que o edifício é anterior a 1951. Substitui o título de utilização na prova do uso existente." });
    if (q.anterior1951 === "semTitulo" && s.tipoSel !== "legalizacao") alerts.push({ t: "Um edifício posterior a 1951 sem título de utilização pode ter de ser legalizado antes, ou no mesmo processo (art. 102.º-A). Confirme no arquivo da câmara se houve licença." });
    if (p === "isento" || p === "isentoTermo" || p === "cp" || p === "lic") {
      if (tipo === "conservacao" && q.onde === "interior") alerts.push({ i: 1, t: "Obras de conservação só no interior dispensam a comunicação de início dos trabalhos (art. 80.º-A, n.º 3)." });
      else alerts.push({ i: 1, t: "Informe a câmara do início dos trabalhos até 5 dias antes (art. 80.º-A), indicando quem os executa, e afixe o aviso da obra visível da via pública." });
    }
    return { p, refs, motivo, alerts, extraPassos, extraDocs };
  }

  const Regras = { G_EXIST, G_NOVA, G_USO, G_TERR, G_CURSO, TIPOS, USOS, SNS, EXIST, TERRENO, TIPOS_OBRA, NOVAS, menos, q_, tem, rural, escassaAnexo, escassaMuro, revIgual, semControlo, COM_PLANO, PREDIO_OPTS, COM_TITULO, QUESTIONS, VISIVEL, RESP_COND, tipoBase, nomeDe, sync, COND, norm, DETECT, PATRIMONIO_RE, PATRIMONIO_FRACO_RE, detectar, condOrigem, effCond, effQ, PROC, decide };
  if (typeof module !== "undefined" && module.exports) module.exports = Regras;
  else root.Regras = Regras;
})(typeof window !== "undefined" ? window : globalThis);
