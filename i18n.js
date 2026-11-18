// Línguas do site: português (original) e inglês.
// O texto é escrito em português no código. Em inglês, este ficheiro carrega i18n/en.js
// (dicionário português → inglês) e troca o texto do ecrã à medida que aparece.
// Ao mudar uma frase em português no código, acrescente a tradução em i18n/en.js
// (node testes/i18n.test.js mostra as frases sem tradução).
(function () {
  var PREF = "licenciamento-pt-pref";
  function lerPref() { try { return JSON.parse(localStorage.getItem(PREF) || "{}") || {}; } catch (e) { return {}; } }
  function gravar(l) { var p = lerPref(); p.lang = l; try { localStorage.setItem(PREF, JSON.stringify(p)); } catch (e) {} }
  var m = /[?&]lang=(en|pt)\b/.exec(location.search);
  if (m) gravar(m[1]);
  var lang = (m ? m[1] : lerPref().lang) === "en" ? "en" : "pt";
  document.documentElement.lang = lang === "en" ? "en" : "pt-PT";
  var script = document.currentScript;
  var base = script ? script.src.replace(/i18n\.js(\?.*)?$/, "") : "";

  // Texto que não se traduz: minutas (documentos para entregar à câmara), código, campos.
  var SALTAR = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, SELECT: 0, NOSCRIPT: 1, CODE: 1, SVG: 1 };
  var INLINE = { B: 1, STRONG: 1, I: 1, EM: 1, A: 1, BR: 1, SMALL: 1, U: 1, SUP: 1, SUB: 1, ABBR: 1 };
  var ATTRS = ["placeholder", "title", "aria-label", "alt", "label"];
  var norm = function (s) { return s.replace(/\s+/g, " ").trim(); };
  function saltar(el) { return el.closest && el.closest("[data-noi18n], pre.doc"); }
  // Bloco com texto e marcação simples (ex.: "Veja o <a>aviso legal</a>.") traduz-se inteiro.
  function misto(el) {
    var temTexto = false, temInline = false;
    for (var n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3) { if (n.nodeValue.trim()) temTexto = true; }
      else if (n.nodeType === 1) {
        if (!INLINE[n.tagName]) return false;
        for (var c = n.firstElementChild; c; c = c.nextElementSibling) if (!INLINE[c.tagName]) return false;
        temInline = true;
      }
    }
    return temTexto && temInline;
  }

  var D = null, H = null, P = [], A = null, LISTA = null;
  // Referências legais (art. 4.º, n.º 2, DL 555/99...) ficam como estão.
  var REF = /^(?:art(?:igo)?s?\.?|n\.º|al\.|DL|Lei|Portaria|RJUE|RGEU|Decreto)/i;
  // Frases juntas no mesmo texto ("Motivo. Aviso.") traduzem-se uma a uma.
  var CORTE = /((?:[.;:!?…)]|\.\))\s+(?=[A-ZÀ-Ú(«"“])|\s+·\s+|\s+—\s+)/;
  function tr1(k) {
    if (D[k] != null) return D[k];
    for (var i = 0; i < P.length; i++) {
      var r = k.match(P[i][0]);
      if (r) return P[i][1].replace(/\{(\d)\}/g, function (_, j) { return r[j] == null ? "" : (tr(r[j]) || r[j]); }).replace(/\$(\d)/g, function (_, j) { return r[j] == null ? "" : r[j]; });
    }
    // Listas de entidades ou de opções escolhidas ("Escola, Cemitério, Não sei"): traduz item a item.
    if (LISTA && LISTA[0].test(k)) return k.replace(LISTA[1], function (x) { return A[x]; });
    return null;
  }
  function tr(s) {
    var k = norm(s);
    if (!k || !/[A-Za-zÀ-ú]/.test(k)) return null;
    var t = tr1(k);
    if (t != null) return t;
    var partes = k.split(CORTE);
    if (partes.length < 2) return null;
    var out = "", algum = false;
    for (var i = 0; i < partes.length; i++) {
      if (i % 2) { out += partes[i]; continue; }
      var x = partes[i]; if (!x) continue;
      var y = /[A-Za-zÀ-ú]/.test(x) ? tr1(x) : null;
      if (y == null) { var m2 = x.match(/^(.*?)([.;:!?…])$/); if (m2) { var z = tr1(m2[1]); if (z != null) y = z + m2[2]; } }
      if (y == null && /[.:;!?]/.test(partes[i + 1] || "")) y = tr1(x + partes[i + 1].trim().charAt(0));
      if (y != null) algum = true; else if (/[A-Za-zÀ-ú]{3}/.test(x) && !REF.test(x)) return null;
      out += y != null ? y : x;
    }
    return algum ? out.replace(/([^.])\.\.(?=\s|$)/g, "$1.") : null;
  }
  function trTexto(n) {
    var v = n.nodeValue, t = tr(v);
    if (t != null && t !== norm(v)) n.nodeValue = v.match(/^\s*/)[0] + t + v.match(/\s*$/)[0];
  }
  function trAttrs(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var a = el.getAttribute(ATTRS[i]);
      if (a) { var t = tr(a); if (t != null && t !== a) el.setAttribute(ATTRS[i], t); }
    }
    if (el.tagName === "INPUT" && (el.type === "button" || el.type === "submit") && el.value) { var tv = tr(el.value); if (tv) el.value = tv; }
  }
  function percorrer(raiz) {
    if (raiz.nodeType === 3) { if (raiz.parentNode && !SALTAR[raiz.parentNode.tagName] && !saltar(raiz.parentNode)) trTexto(raiz); return; }
    if (raiz.nodeType !== 1 || saltar(raiz)) return;
    if (SALTAR[raiz.tagName]) { if (raiz.tagName === "INPUT" || raiz.tagName === "TEXTAREA") trAttrs(raiz); return; }
    trAttrs(raiz);
    if (misto(raiz)) {
      var h = H[norm(raiz.innerHTML)];
      if (h != null) { raiz.innerHTML = h; return; }
    }
    for (var n = raiz.firstChild; n; n = n.nextSibling) percorrer(n);
  }

  // Recolha das frases que o ecrã mostra (para os testes de tradução).
  function recolher(raiz, out) {
    out = out || { d: {}, h: {} };
    (function ir(n) {
      if (n.nodeType === 3) { var k = norm(n.nodeValue); if (k && /[A-Za-zÀ-ú]/.test(k)) out.d[k] = 1; return; }
      if (n.nodeType !== 1 || saltar(n)) return;
      if (SALTAR[n.tagName] && n.tagName !== "INPUT" && n.tagName !== "TEXTAREA") return;
      for (var i = 0; i < ATTRS.length; i++) { var a = n.getAttribute(ATTRS[i]); if (a && /[A-Za-zÀ-ú]/.test(a)) out.d[norm(a)] = 1; }
      if (SALTAR[n.tagName]) return;
      if (misto(n)) { out.h[norm(n.innerHTML)] = 1; }
      for (var c = n.firstChild; c; c = c.nextSibling) ir(c);
    })(raiz);
    return out;
  }

  window.I18N = {
    lang: lang,
    mudar: function (l) { gravar(l); var u = location.href.replace(/([?&])lang=(en|pt)&?/, "$1").replace(/[?&]$/, ""); if (u === location.href) location.reload(); else location.replace(u); },
    tr: function (s) { return lang === "en" && D ? (tr(s) || s) : s; },
    recolher: recolher,
    norm: norm
  };
  if (lang !== "en") return;

  document.write('<script src="' + base + 'i18n/en.js"><\/script>');
  function iniciar() {
    var E = window.I18N_EN || {};
    D = E.d || {}; H = E.h || {};
    P = (E.p || []).map(function (x) { return [new RegExp("^(?:" + x[0] + ")$"), x[1]]; });
    A = E.a || {};
    var ks = Object.keys(A).sort(function (a, b) { return b.length - a.length; });
    if (ks.length) {
      var at = "(?:" + ks.map(function (x) { return x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("|") + ")";
      LISTA = [new RegExp("^" + at + "(?:(?:, |; | / )" + at + ")*$"), new RegExp(at, "g")];
    }
    if (document.title) { var t = tr(document.title); if (t) document.title = t; }
    percorrer(document.body);
    new MutationObserver(function (lista) {
      for (var i = 0; i < lista.length; i++) {
        var r = lista[i];
        if (r.type === "characterData") percorrer(r.target);
        else if (r.type === "attributes") { if (r.target.nodeType === 1 && !saltar(r.target)) trAttrs(r.target); }
        else for (var j = 0; j < r.addedNodes.length; j++) percorrer(r.addedNodes[j]);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
})();
