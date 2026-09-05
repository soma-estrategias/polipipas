/* POLIPIPAS — comportamentos do site */
(function () {
  'use strict';

  /* --- Menu mobile --- */
  var botaoMenu = document.querySelector('.abre-menu');
  var nav = document.querySelector('.nav');
  var veu = null;

  function ehMobile() { return window.matchMedia('(max-width:760px)').matches; }

  if (botaoMenu && nav) {
    // véu que escurece o site e recebe o toque para fechar o menu
    veu = document.createElement('div');
    veu.className = 'veu-menu';
    veu.setAttribute('aria-hidden', 'true');
    document.body.appendChild(veu);

    var abrirMenu = function () {
      nav.setAttribute('data-aberto', 'sim');
      botaoMenu.setAttribute('aria-expanded', 'true');
      document.body.classList.add('menu-aberto');
    };

    var fecharMenu = function () {
      nav.setAttribute('data-aberto', 'nao');
      botaoMenu.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('menu-aberto');
      // recolhe também os submenus abertos
      document.querySelectorAll('.nav__grupo[data-aberto="sim"]').forEach(function (g) {
        g.setAttribute('data-aberto', 'nao');
        var pai = g.querySelector('.nav__pai');
        if (pai) pai.setAttribute('aria-expanded', 'false');
      });
    };

    window.fecharMenuPolipipas = fecharMenu;

    botaoMenu.addEventListener('click', function (ev) {
      ev.stopPropagation();
      if (nav.getAttribute('data-aberto') === 'sim') fecharMenu(); else abrirMenu();
    });

    // tocar no véu ou em qualquer ponto fora do menu fecha
    veu.addEventListener('click', fecharMenu);

    document.addEventListener('click', function (ev) {
      if (nav.getAttribute('data-aberto') !== 'sim') return;
      if (nav.contains(ev.target) || botaoMenu.contains(ev.target)) return;
      fecharMenu();
    });

    // Esc fecha
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && nav.getAttribute('data-aberto') === 'sim') fecharMenu();
    });

    // ao clicar num link do menu, fecha antes de navegar
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        if (!a.classList.contains('nav__pai')) fecharMenu();
      });
    });

    // se a tela crescer, volta ao menu de computador
    window.addEventListener('resize', function () {
      if (!ehMobile() && nav.getAttribute('data-aberto') === 'sim') fecharMenu();
    });
  }

  /* --- Submenu de Produtos --- */
  document.querySelectorAll('.nav__grupo').forEach(function (grupo) {
    var pai = grupo.querySelector('.nav__pai');
    if (!pai) return;

    // no mobile o toque abre o submenu em vez de navegar
    pai.addEventListener('click', function (ev) {
      if (!ehMobile()) return;
      ev.preventDefault();
      var aberto = grupo.getAttribute('data-aberto') === 'sim';
      grupo.setAttribute('data-aberto', aberto ? 'nao' : 'sim');
      pai.setAttribute('aria-expanded', String(!aberto));
    });

    // no desktop o hover e o foco pelo teclado controlam o estado ARIA
    ['mouseenter', 'focusin'].forEach(function (e) {
      grupo.addEventListener(e, function () {
        if (!ehMobile()) pai.setAttribute('aria-expanded', 'true');
      });
    });
    ['mouseleave', 'focusout'].forEach(function (e) {
      grupo.addEventListener(e, function () {
        if (!ehMobile() && !grupo.contains(document.activeElement)) {
          pai.setAttribute('aria-expanded', 'false');
        }
      });
    });

    // Esc fecha
    grupo.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') {
        grupo.setAttribute('data-aberto', 'nao');
        pai.setAttribute('aria-expanded', 'false');
        pai.focus();
      }
    });
  });

  /* --- Painel de escolha do WhatsApp --- */
  var painel = document.getElementById('painel-whatsapp');

  function abrirPainel() {
    if (!painel) return;
    painel.setAttribute('data-aberto', 'sim');
    document.body.style.overflow = 'hidden';
    var primeiro = painel.querySelector('.canal');
    if (primeiro) primeiro.focus();
  }

  function fecharPainel() {
    if (!painel) return;
    painel.setAttribute('data-aberto', 'nao');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('[data-abre-whatsapp]').forEach(function (el) {
    el.addEventListener('click', function (ev) {
      ev.preventDefault();
      abrirPainel();
    });
  });

  if (painel) {
    painel.addEventListener('click', function (ev) {
      if (ev.target === painel || ev.target.closest('.painel__fecha')) fecharPainel();
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') fecharPainel();
    });
  }

  /* --- Mensagem pré-preenchida por página --- */
  var contexto = document.body.getAttribute('data-produto');
  if (contexto) {
    document.querySelectorAll('.canal').forEach(function (link) {
      var base = link.getAttribute('href').split('?')[0];
      var texto = 'Olá! Vim pelo site da Polipipas e gostaria de falar sobre ' + contexto + '.';
      link.setAttribute('href', base + '?text=' + encodeURIComponent(texto));
    });
  }

  /* --- Carrossel de fotos (arraste, setas, pontos e avanço automático) --- */
  document.querySelectorAll('[data-carrossel]').forEach(function (car) {
    var pista = car.querySelector('.carrossel__pista');
    var slides = Array.prototype.slice.call(car.querySelectorAll('.carrossel__slide'));
    var pontos = Array.prototype.slice.call(car.querySelectorAll('.carrossel__ponto'));
    var setas = Array.prototype.slice.call(car.querySelectorAll('[data-passo]'));
    if (!pista || !slides.length) return;

    var semAnimacao = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var intervalo = parseInt(car.getAttribute('data-auto'), 10) || 4500;
    var timer = null;
    var pausado = false;

    function larguraSlide() {
      var estilo = getComputedStyle(car.querySelector('.carrossel__trilho'));
      var gap = parseFloat(estilo.columnGap || estilo.gap) || 0;
      return slides[0].getBoundingClientRect().width + gap;
    }

    function indiceAtual() {
      return Math.round(pista.scrollLeft / larguraSlide());
    }

    function maxScroll() {
      return pista.scrollWidth - pista.clientWidth;
    }

    function irPara(i, suave) {
      var alvo = Math.max(0, Math.min(i, slides.length - 1)) * larguraSlide();
      pista.scrollTo({ left: Math.min(alvo, maxScroll()), behavior: (suave === false || semAnimacao) ? 'auto' : 'smooth' });
    }

    function atualizar() {
      var i = indiceAtual();
      pontos.forEach(function (p, n) { p.setAttribute('aria-selected', String(n === i)); });
      setas.forEach(function (b) {
        var passo = parseInt(b.getAttribute('data-passo'), 10);
        var fim = pista.scrollLeft >= maxScroll() - 2;
        var inicio = pista.scrollLeft <= 2;
        b.disabled = (passo < 0 && inicio) || (passo > 0 && fim);
      });
    }

    setas.forEach(function (b) {
      b.addEventListener('click', function () {
        irPara(indiceAtual() + parseInt(b.getAttribute('data-passo'), 10));
      });
    });

    pontos.forEach(function (p) {
      p.addEventListener('click', function () { irPara(parseInt(p.getAttribute('data-ir'), 10)); });
    });

    pista.addEventListener('scroll', function () {
      window.clearTimeout(pista._t);
      pista._t = window.setTimeout(atualizar, 80);
    });

    /* arraste com o mouse — no toque o próprio navegador já faz o swipe.
       Sem setPointerCapture: a captura desviaria o clique da foto para a pista
       e o popup nunca abriria. */
    var arrastando = false, xInicial = 0, scrollInicial = 0, moveu = 0;

    function aoMover(ev) {
      if (!arrastando) return;
      var d = ev.clientX - xInicial;
      moveu = Math.max(moveu, Math.abs(d));
      if (moveu > 4) pista.setAttribute('data-arrastando', 'sim');
      pista.scrollLeft = scrollInicial - d;
      if (moveu > 4) ev.preventDefault();
    }

    function aoSoltar() {
      if (!arrastando) return;
      arrastando = false;
      pista.removeAttribute('data-arrastando');
      document.removeEventListener('pointermove', aoMover);
      document.removeEventListener('pointerup', aoSoltar);
      document.removeEventListener('pointercancel', aoSoltar);
      irPara(indiceAtual());
      /* zera depois do clique, para não bloquear o próximo toque */
      window.setTimeout(function () { moveu = 0; }, 0);
    }

    pista.addEventListener('pointerdown', function (ev) {
      if (ev.pointerType === 'touch' || ev.button !== 0) return;
      arrastando = true; moveu = 0;
      xInicial = ev.clientX; scrollInicial = pista.scrollLeft;
      document.addEventListener('pointermove', aoMover);
      document.addEventListener('pointerup', aoSoltar);
      document.addEventListener('pointercancel', aoSoltar);
    });

    /* se houve arraste, o clique não deve abrir o popup */
    pista.addEventListener('click', function (ev) {
      if (moveu > 6) { ev.preventDefault(); ev.stopPropagation(); }
    }, true);

    /* avanço automático */
    function avancar() {
      if (pausado) return;
      if (pista.scrollLeft >= maxScroll() - 2) irPara(0);
      else irPara(indiceAtual() + 1);
    }
    function ligar() {
      if (semAnimacao || timer) return;
      timer = window.setInterval(avancar, intervalo);
    }
    function desligar() {
      window.clearInterval(timer); timer = null;
    }

    ['mouseenter', 'focusin', 'pointerdown', 'touchstart'].forEach(function (e) {
      car.addEventListener(e, function () { pausado = true; }, { passive: true });
    });
    ['mouseleave', 'focusout'].forEach(function (e) {
      car.addEventListener(e, function () { pausado = false; });
    });
    car.addEventListener('touchend', function () {
      window.setTimeout(function () { pausado = false; }, 4000);
    }, { passive: true });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) desligar(); else ligar();
    });

    /* só roda quando o carrossel está visível na tela */
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (ent) {
        ent.forEach(function (e) { e.isIntersecting ? ligar() : desligar(); });
      }, { threshold: 0.35 }).observe(car);
    } else {
      ligar();
    }

    window.addEventListener('resize', function () {
      window.clearTimeout(car._r);
      car._r = window.setTimeout(atualizar, 150);
    });

    atualizar();
  });

  /* --- Vídeo em tela cheia: gira para a horizontal no celular --- */
  (function () {
    var videos = document.querySelectorAll('video');
    if (!videos.length) return;

    function girar() {
      var orient = window.screen && window.screen.orientation;
      if (!orient || typeof orient.lock !== 'function') return;
      orient.lock('landscape').catch(function () { /* navegador não permite: ignora */ });
    }

    function soltar() {
      var orient = window.screen && window.screen.orientation;
      if (orient && typeof orient.unlock === 'function') orient.unlock();
    }

    function aoMudar() {
      var cheio = document.fullscreenElement || document.webkitFullscreenElement;
      if (cheio && cheio.tagName === 'VIDEO') girar(); else soltar();
    }

    document.addEventListener('fullscreenchange', aoMudar);
    document.addEventListener('webkitfullscreenchange', aoMudar);

    videos.forEach(function (v) {
      // iOS abre o player nativo: estes eventos avisam a entrada e a saída
      v.addEventListener('webkitbeginfullscreen', girar);
      v.addEventListener('webkitendfullscreen', soltar);
    });
  })();

  /* --- Popup de foto ampliada --- */
  (function () {
    var lupa = document.getElementById('lupa');
    if (!lupa) return;

    var gatilhos = Array.prototype.slice.call(document.querySelectorAll('[data-lupa]'));
    if (!gatilhos.length) return;

    var img = lupa.querySelector('.lupa__img');
    var conta = lupa.querySelector('.lupa__conta');
    var atual = 0;
    var origem = null;

    function mostrar(i) {
      atual = (i + gatilhos.length) % gatilhos.length;
      var g = gatilhos[atual];
      img.src = g.getAttribute('data-cheia');
      img.alt = g.getAttribute('data-legenda') || '';
      conta.textContent = (atual + 1) + ' / ' + gatilhos.length;
      // pré-carrega a próxima, para o avanço ser instantâneo
      var prox = new Image();
      prox.src = gatilhos[(atual + 1) % gatilhos.length].getAttribute('data-cheia');
    }

    function abrir(i, botao) {
      origem = botao || null;
      mostrar(i);
      lupa.setAttribute('data-aberto', 'sim');
      document.body.style.overflow = 'hidden';
      lupa.querySelector('.lupa__fechar').focus();
    }

    function fechar() {
      lupa.removeAttribute('data-aberto');
      document.body.style.overflow = '';
      img.src = '';
      if (origem) origem.focus();
    }

    gatilhos.forEach(function (g, i) {
      g.addEventListener('click', function (ev) {
        ev.preventDefault();
        abrir(i, g);
      });
    });

    lupa.querySelectorAll('[data-passo]').forEach(function (b) {
      b.addEventListener('click', function (ev) {
        ev.stopPropagation();
        mostrar(atual + parseInt(b.getAttribute('data-passo'), 10));
      });
    });

    lupa.querySelector('.lupa__fechar').addEventListener('click', fechar);

    // clicar fora da foto fecha
    lupa.addEventListener('click', function (ev) {
      if (ev.target === lupa || ev.target.classList.contains('lupa__caixa')) fechar();
    });

    document.addEventListener('keydown', function (ev) {
      if (lupa.getAttribute('data-aberto') !== 'sim') return;
      if (ev.key === 'Escape') fechar();
      if (ev.key === 'ArrowRight') mostrar(atual + 1);
      if (ev.key === 'ArrowLeft') mostrar(atual - 1);
    });

    // deslize no celular troca de foto
    var x0 = null;
    lupa.addEventListener('touchstart', function (ev) { x0 = ev.touches[0].clientX; }, { passive: true });
    lupa.addEventListener('touchend', function (ev) {
      if (x0 === null) return;
      var d = ev.changedTouches[0].clientX - x0;
      if (Math.abs(d) > 50) mostrar(atual + (d < 0 ? 1 : -1));
      x0 = null;
    }, { passive: true });
  })();

  /* --- Revelação ao rolar --- */
  var alvos = document.querySelectorAll('.sobe');
  if ('IntersectionObserver' in window && alvos.length) {
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('visivel');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    alvos.forEach(function (a) { obs.observe(a); });
  } else {
    alvos.forEach(function (a) { a.classList.add('visivel'); });
  }
})();
