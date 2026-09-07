/* =============================================================
   site.js — comportamento da home de serviços.

   Três coisas: menu do celular, revelação no scroll e o
   agendamento de orçamento (monta a mensagem e abre o WhatsApp).

   Nada aqui é necessário pra ler a página: o conteúdo já vem
   pronto no HTML.
   ============================================================= */
(function () {
  'use strict';

  var WHATSAPP = '5569999688625';

  /* ---------- Menu do celular ---------- */
  var botaoMenu = document.getElementById('navToggle');
  var menu = document.getElementById('mobileMenu');
  if (botaoMenu && menu) {
    botaoMenu.addEventListener('click', function () {
      var aberto = menu.classList.toggle('hidden') === false;
      botaoMenu.setAttribute('aria-expanded', String(aberto));
    });
    menu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        menu.classList.add('hidden');
        botaoMenu.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- Ano no rodapé ---------- */
  var ano = document.getElementById('ano');
  if (ano) ano.textContent = new Date().getFullYear();

  /* ---------- Revelação no scroll ---------- */
  var reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var alvos = document.querySelectorAll('.reveal');
  if (reduzido || !('IntersectionObserver' in window)) {
    alvos.forEach(function (el) { el.classList.add('in'); });
  } else {
    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        observador.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.04 });

    alvos.forEach(function (el) {
      // O que já está na primeira dobra entra visível: o primeiro
      // quadro da página precisa ser legível sem rolar.
      if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('in');
      else observador.observe(el);
    });
  }

  /* =============================================================
     Agendamento de orçamento

     Não existe backend: a escolha vira uma mensagem pronta e o
     botão abre o WhatsApp. O visitante não "reserva" horário —
     ele pede, e a confirmação vem na conversa. A cópia diz isso.
     ============================================================= */
  var form = document.getElementById('form-agendar');
  if (!form) return;

  // As fichas saem dos próprios títulos da seção de serviços — assim a
  // lista nunca sai do lugar quando um serviço é acrescentado ou renomeado.
  var SERVICOS = Array.prototype.map
    .call(document.querySelectorAll('#servicos article h3'), function (h) {
      return h.textContent.trim();
    })
    .concat(['Ainda não sei']);

  var TURNOS = [
    { id: 'manha', rotulo: 'Manhã', faixa: '08h às 12h' },
    { id: 'tarde', rotulo: 'Tarde', faixa: '13h às 18h' },
    { id: 'noite', rotulo: 'Noite', faixa: 'depois das 19h' }
  ];

  var DIAS_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  var MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  var escolha = { servico: null, dia: null, turno: null };

  /** Os próximos `quantos` dias úteis, começando amanhã. */
  function proximosDiasUteis(quantos) {
    var lista = [];
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    while (lista.length < quantos) {
      d.setDate(d.getDate() + 1);
      var semana = d.getDay();
      if (semana === 0 || semana === 6) continue;
      lista.push({
        curto: DIAS_SEMANA[semana].slice(0, 3),
        numero: d.getDate(),
        mes: MESES[d.getMonth()],
        completo: DIAS_SEMANA[semana] + ', ' + d.getDate() + ' de ' + MESES[d.getMonth()]
      });
    }
    return lista;
  }

  function criarFicha(texto, sub, valor) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'ficha rounded-lg px-3.5 py-2.5 text-left';
    b.setAttribute('aria-pressed', 'false');
    b.dataset.valor = valor;
    b.innerHTML = '<span class="block text-sm font-semibold leading-tight">' + texto + '</span>' +
      (sub ? '<span class="block mono text-[10px] uppercase tracking-wider opacity-70 mt-0.5">' + sub + '</span>' : '');
    return b;
  }

  function ligarGrupo(container, itens, campo) {
    itens.forEach(function (item) {
      var ficha = criarFicha(item.texto, item.sub, item.valor);
      ficha.addEventListener('click', function () {
        container.querySelectorAll('.ficha').forEach(function (o) {
          o.setAttribute('aria-pressed', 'false');
        });
        ficha.setAttribute('aria-pressed', 'true');
        escolha[campo] = item.valor;
        atualizarResumo();
      });
      container.appendChild(ficha);
    });
  }

  ligarGrupo(
    document.getElementById('fichas-servico'),
    SERVICOS.map(function (s) { return { texto: s, sub: '', valor: s }; }),
    'servico'
  );

  ligarGrupo(
    document.getElementById('fichas-dia'),
    proximosDiasUteis(8).map(function (d) {
      return { texto: d.numero + ' ' + d.mes, sub: d.curto, valor: d.completo };
    }),
    'dia'
  );

  ligarGrupo(
    document.getElementById('fichas-turno'),
    TURNOS.map(function (t) { return { texto: t.rotulo, sub: t.faixa, valor: t.rotulo + ' (' + t.faixa + ')' }; }),
    'turno'
  );

  var resumo = document.getElementById('ag-resumo');
  var enviar = document.getElementById('ag-enviar');

  function completo() {
    return escolha.servico && escolha.dia && escolha.turno;
  }

  function atualizarResumo() {
    if (completo()) {
      resumo.innerHTML = '<strong class="text-ink font-semibold">' + escolha.servico + '</strong> · ' +
        escolha.dia + ' · ' + escolha.turno;
    } else {
      var falta = [];
      if (!escolha.servico) falta.push('o serviço');
      if (!escolha.dia) falta.push('o dia');
      if (!escolha.turno) falta.push('o turno');
      resumo.textContent = 'Falta escolher ' + falta.join(', ') + '.';
    }
    enviar.disabled = !completo();
  }

  function valor(id) {
    var el = document.getElementById(id);
    return el && el.value.trim();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!completo()) { atualizarResumo(); return; }

    var nome = valor('ag-nome');
    if (!nome) {
      document.getElementById('ag-nome').focus();
      resumo.textContent = 'Só falta o seu nome.';
      return;
    }

    var linhas = [
      'Oi Ismaile! Quero agendar um orçamento.',
      '',
      'Serviço: ' + escolha.servico,
      'Melhor dia: ' + escolha.dia,
      'Turno: ' + escolha.turno,
      '',
      'Nome: ' + nome
    ];
    if (valor('ag-negocio')) linhas.push('Negócio: ' + valor('ag-negocio'));
    if (valor('ag-cidade')) linhas.push('Cidade: ' + valor('ag-cidade'));
    if (valor('ag-recado')) linhas.push('', valor('ag-recado'));

    window.open(
      'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(linhas.join('\n')),
      '_blank',
      'noopener'
    );
  });

  atualizarResumo();
})();
