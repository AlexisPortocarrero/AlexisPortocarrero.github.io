/* ============================================================
   Alexis Portocarrero · movimiento (GSAP 3.13 + ScrollTrigger)

   Storyboard
   1. Inicio: duerme en su cama. Respira (la frazada también), parpadea,
      gira un poco la cabeza, mueve un pie. Un mechón se mece.
   2. La cama se rompe (pin #inicio, +=110%): la frazada se va volando,
      cejas arriba, lentes nariz abajo, mira; el colchón se abre como
      trampilla, la almohada cae, el piso se abre; se inclina y cae.
   3. La caída (pin #caida, +=450%): cabeza abajo, patadas lentas, zapatos
      colgando, cuello y pelo al viento, lentes vibrando, mira cada dato
      que pasa, mueca en el rebote. Los brazos, cruzados. Siempre.
   4. La elección (pin #eleccion, +=100%): se calma y cuelga entre los
      portales; mira el que señalas. Si nadie elige, sigue cayendo.
   5. Elegir: cierra los ojos y se zambulle; un círculo cubre la pantalla.
   6. Aterrizaje: el .lander cae en proyectos y se queda respirando.
   7. Ramas: setBranch('games' | 'software' | 'all').
   8. Previews animados en las tarjetas.
   9. Movimiento reducido: sin caída, todo quieto e instantáneo.

   Arquitectura: el scroll no toca el DOM del personaje; mueve un estado
   (A) con una sola línea de tiempo (tlA) medida en "fases" (1 fase = un
   tramo entre pines). Eventos (E: parpadeo, mirada, cejas...) y loops (L:
   patadas, cuello, lentes...) son otros canales. Un ticker los suma por
   pieza y escribe cada transform una vez: nada se pelea por una propiedad.
   ============================================================ */
(() => {
	'use strict';

	const $ = (s, c = document) => c.querySelector(s);
	const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
	const html = document.documentElement;
	const gsap = window.gsap;
	const ScrollTrigger = window.ScrollTrigger;
	const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const motion = !reduced && !!gsap && !!ScrollTrigger && !!document.getElementById('alexis');

	const actor = $('#actor');
	const bedDiv = $('div#bed');          // ojo: dentro hay un g#bed
	const blanketDiv = $('div#blanket');  // y un g#blanket
	const hero = $('#inicio');
	const fall = $('#caida');
	const fork = $('#eleccion');
	const projects = $('#proyectos');
	const gridGames = $('#grid-games');
	const gridSoft = $('#grid-software');
	const kicker = $('.projects__kicker');
	const titleEl = $('.projects__title');
	const switchBtns = $$('.switch__btn');
	const portals = $$('.portal');
	const lander = $('.lander');
	const cover = $('.fork__cover');
	if (!actor || !projects) return;

	/* ---------- 7. ramas ---------- */
	const BRANCHES = {
		games: { kicker: 'Aterrizaste en', title: 'Videojuegos', hash: '#videojuegos', cover: '#151a24' },
		software: { kicker: 'Aterrizaste en', title: 'Software', hash: '#software', cover: '#e9eef5' },
		all: { kicker: 'Sin elegir', title: 'Todo', hash: '#todo', cover: '#f4f1ea' },
	};
	const HASHES = { '#videojuegos': 'games', '#software': 'software', '#todo': 'all' };
	let branchNow = projects.dataset.branch || 'games';
	let onBranch = null; // gancho de movimiento: fundido de grillas, lander, refresh

	function setBranch(branch, opts = {}) {
		const b = BRANCHES[branch];
		if (!b) return branchNow;
		const changed = branch !== branchNow;
		branchNow = branch;
		projects.dataset.branch = branch;
		gridGames.hidden = branch === 'software';
		gridSoft.hidden = branch === 'games';
		switchBtns.forEach(btn => btn.setAttribute('aria-selected', String(btn.dataset.branch === branch)));
		kicker.textContent = b.kicker;
		titleEl.textContent = b.title;
		try { history.replaceState(history.state, '', b.hash); } catch (e) { /* file:// u otros */ }
		if (onBranch) onBranch(branch, changed, opts);
		return branch;
	}
	window.setBranch = setBranch;

	const topOf = el => el.getBoundingClientRect().top + window.scrollY;
	function jumpTo(el) { // salto instantáneo
		const prev = html.style.scrollBehavior;
		html.style.scrollBehavior = 'auto';
		window.scrollTo(0, topOf(el));
		html.style.scrollBehavior = prev;
	}
	function focusProjects() { // el foco viaja con la vista (teclado)
		if (!titleEl.hasAttribute('tabindex')) titleEl.setAttribute('tabindex', '-1');
		titleEl.focus({ preventScroll: true });
	}

	switchBtns.forEach(btn => btn.addEventListener('click', () => setBranch(btn.dataset.branch)));
	$$('[data-branch-link]').forEach(a => a.addEventListener('click', e => {
		e.preventDefault();
		setBranch(a.dataset.branchLink);
		if (motion) window.scrollTo({ top: topOf(projects), behavior: 'smooth' });
		else projects.scrollIntoView();
		focusProjects();
	}));

	/* ---------- 8. previews animados ---------- */
	(() => {
		const imgs = $$('img[data-anim]');
		imgs.forEach(img => { img.dataset.poster = img.getAttribute('src'); });
		const play = img => { if (img.getAttribute('src') !== img.dataset.anim) img.setAttribute('src', img.dataset.anim); };
		const rest = img => { if (img.getAttribute('src') !== img.dataset.poster) img.setAttribute('src', img.dataset.poster); };
		if (window.matchMedia('(hover: none)').matches) {
			// táctil: se anima al estar visible (no con movimiento reducido: sería autoplay)
			if (reduced || !('IntersectionObserver' in window)) return;
			const io = new IntersectionObserver(entries => entries.forEach(en => {
				if (en.intersectionRatio >= 0.5) play(en.target);
				else if (!en.isIntersecting) rest(en.target);
			}), { threshold: [0, 0.5] });
			imgs.forEach(img => io.observe(img));
			return;
		}
		imgs.forEach(img => {
			const card = img.closest('.card') || img.parentElement;
			card.addEventListener('pointerenter', () => play(img));
			card.addEventListener('pointerleave', () => rest(img));
			card.addEventListener('focusin', () => play(img));
			card.addEventListener('focusout', e => { if (!card.contains(e.relatedTarget)) rest(img); });
		});
	})();

	const hashBranch = HASHES[window.location.hash];

	/* ---------- 9. movimiento reducido (o GSAP no cargó) ---------- */
	if (!motion) {
		// cama, personaje y frazada se quedan en el inicio, sin viajar
		[bedDiv, actor, blanketDiv].forEach(el => {
			if (!el) return;
			hero.appendChild(el);
			el.style.position = 'absolute';
		});
		portals.forEach(p => p.addEventListener('click', () => {
			setBranch(p.dataset.branch);
			projects.scrollIntoView();
			focusProjects();
		}));
		if (hashBranch) { setBranch(hashBranch); projects.scrollIntoView(); }
		return;
	}

	// ScrollTrigger mide con scrollTo() dentro de refresh(). Con el scroll-behavior: smooth del CSS,
	// Chrome a veces usa el estilo viejo y ese scroll se vuelve asíncrono: los pines quedan corridos
	// (visto: el pin del inicio en -2400 tras el clavado). Con movimiento, el scroll nativo es
	// instantáneo y el suave lo hace JS en las anclas, contando el espacio de los pines.
	html.style.scrollBehavior = 'auto';
	void getComputedStyle(html).scrollBehavior;
	const focusTarget = el => {
		const f = el === projects ? titleEl : (el.matches('h1, h2, h3, a, button') ? el : $('h1, h2', el) || el);
		if (!f.matches('a[href], button') && !f.hasAttribute('tabindex')) f.setAttribute('tabindex', '-1');
		f.focus({ preventScroll: true });
	};
	$$('a[href^="#"]:not([data-branch-link])').forEach(a => {
		const id = a.getAttribute('href').slice(1);
		const target = id && document.getElementById(id);
		if (!target) return;
		a.addEventListener('click', e => {
			e.preventDefault();
			window.scrollTo({ top: topOf(target), behavior: 'smooth' });
			if (window.location.hash !== '#' + id) history.pushState(null, '', '#' + id);
			focusTarget(target);
		});
	});

	gsap.registerPlugin(ScrollTrigger);
	ScrollTrigger.config({ ignoreMobileResize: true });
	// Recorrido de cada pin en % de la altura de pantalla. En táctil un deslizamiento avanza mucho: se alarga más.
	const K = window.matchMedia('(pointer: coarse)').matches ? 1.9 : 1.3;
	const pin = pct => '+=' + Math.round(pct * K) + '%';
	const clamp = gsap.utils.clamp;
	const rand = gsap.utils.random;


	/* ---------- rig: piezas opcionales; pivote = data-origin (o data-pivots, o su caja) ---------- */
	const svg = $('#alexis');
	const VB = svg.viewBox.baseVal;
	const bbox = el => { try { const b = el && el.getBBox(); return b && (b.width || b.height) ? b : null; } catch (e) { return null; } };
	const pt = s => { const [x, y] = String(s || '').trim().split(/[\s,]+/).map(Number); return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null; };
	const at = p => `${p.x} ${p.y}`;
	const boxAt = (el, fx, fy) => { const b = bbox(el); return b ? { x: b.x + b.width * fx, y: b.y + b.height * fy } : null; };
	const originEl = (el, fx = 0.5, fy = 0.5) => pt(el.getAttribute('data-origin')) || boxAt(el, fx, fy) || { x: 0, y: 0 };
	// data-pivots="head=X,Y hipL=X,Y eyeL=X,Y ..." (viewBox)
	const pivots = {};
	(svg.getAttribute('data-pivots') || '').trim().split(/\s+/).forEach(pair => {
		const i = pair.indexOf('=');
		const p = i > 0 && pt(pair.slice(i + 1));
		if (p) pivots[pair.slice(0, i)] = p;
	});
	// sin data-origin: otro pivote con nombre, o una fracción de su caja
	const RIG = {
		'leg-l': [0.5, 0, 'hipL'], 'leg-r': [0.5, 0, 'hipR'], torso: [0.5, 1, 'hips'], head: [0.5, 1, 'head'],
		'eye-l': [0.5, 0.5], 'eye-r': [0.5, 0.5], 'brow-l': [0.5, 0.5], 'brow-r': [0.5, 0.5], mouth: [0.5, 0.5],
		nose: [0.5, 0.3], glasses: [0.5, 0.45], collar: [0.5, 0], 'hair-back': [0.5, 0, 'strands'],
		'arm-front': [0.5, 0.5], 'arm-back': [0.5, 0.5], arms: [0.5, 0.5], 'shoe-l': [0.5, 0], 'shoe-r': [0.5, 0],
	};
	const parts = {};
	Object.keys(RIG).forEach(n => { const el = document.getElementById(n); if (el && svg.contains(el)) parts[n] = el; });
	if (parts['arm-front'] || parts['arm-back']) delete parts.arms; // los brazos nuevos reemplazan a #arms
	const origins = {};
	const ALIAS = { 'arm-front': 'armF', 'arm-back': 'armB' }; // data-pivots usa camelCase
	const camel = n => n.replace(/-([a-z])/g, (m, c) => c.toUpperCase());
	const originOf = n => {
		const el = parts[n], f = RIG[n];
		return pt(el.getAttribute('data-origin')) || pivots[n] || pivots[camel(n)] || pivots[ALIAS[n]] || (f[2] && pivots[f[2]]) || boxAt(el, f[0], f[1]) || { x: VB.x + VB.width / 2, y: VB.y + VB.height / 2 };
	};
	['leg-l', 'leg-r'].forEach(n => { if (parts[n]) origins[n] = originOf(n); });
	if (!pivots.hips && origins['leg-l'] && origins['leg-r']) {
		pivots.hips = { x: (origins['leg-l'].x + origins['leg-r'].x) / 2, y: Math.min(origins['leg-l'].y, origins['leg-r'].y) };
	}
	Object.keys(parts).forEach(n => { origins[n] = origins[n] || originOf(n); });

	// escala de la cara: el chibi tiene la cabeza enorme; las distancias salen del dibujo
	const headBox = bbox(parts.head);
	const HS = clamp(0.6, 2.5, headBox ? headBox.height / 200 : 1);
	const FACE = origins['eye-l'] && origins['brow-l'] ? Math.max(8, origins['eye-l'].y - origins['brow-l'].y) : 15 * HS;
	// pupilas: iris + brillo se mueven dentro del blanco (mirada en -1..1); sin iris, el ojo entero
	const pupilsOf = eye => {
		if (!eye) return null;
		const ib = bbox($('.iris', eye)), wb = bbox($('.eye-white', eye));
		const els = $$('.iris, .eye-hl', eye);
		return els.length && ib && wb
			? { els, tx: Math.max(1, ((wb.width - ib.width) / 2) * 0.55), ty: Math.max(1, ((wb.height - ib.height) / 2) * 0.5) }
			: { els: [eye], tx: 1.5 * HS, ty: 1.2 * HS };
	};
	const pupils = [pupilsOf(parts['eye-l']), pupilsOf(parts['eye-r'])].filter(Boolean);
	const glints = ['glint-l', 'glint-r'].map(id => document.getElementById(id)).filter(el => el && svg.contains(el));
	const strands = $$('.strand', svg);

	// un rig = piezas + canal de eventos (E) + escritura por propiedad solo si cambió
	function makeRig(els, eyes) {
		Object.keys(els).forEach(n => gsap.set(els[n], { svgOrigin: at(origins[n]) }));
		const E = { blink: 0, closed: 0, eyeX: 0, eyeY: 0, brow: 0, grimace: 0, headR: 0, foot: 0, idleR: 0, idleX: 0 };
		const cache = new Map();
		const unit = p => (p === 'rotation' || p === 'skewX' ? 'deg' : p === 'x' || p === 'y' ? 'px' : '');
		function set(el, p, v) {
			if (!el) return;
			let rec = cache.get(el);
			if (!rec) cache.set(el, (rec = { last: {} }));
			if (Math.abs(v - rec.last[p]) < 0.004) return;
			rec.last[p] = v;
			(rec[p] || (rec[p] = gsap.quickSetter(el, p, unit(p))))(v);
		}
		const put = (n, p, v) => set(els[n], p, v);
		const ease = 'power2.out';
		return {
			els, E, put, set,
			// parpadeo; "twice" = doble y deliberado (más lento)
			blink(twice) {
				const [c, o] = twice ? [0.09, 0.16] : [0.06, 0.14];
				const tl = gsap.timeline().to(E, { blink: 1, duration: c, ease: 'power2.in' }).to(E, { blink: 0, duration: o, ease });
				if (twice) tl.to(E, { blink: 1, duration: c, ease: 'power2.in' }, '+=0.12').to(E, { blink: 0, duration: o, ease });
				return tl;
			},
			look: (dx, dy = 0, d = 0.25) => gsap.to(E, { eyeX: dx, eyeY: dy, duration: d, ease, overwrite: 'auto' }),
			brows: (v, d = 0.3) => gsap.to(E, { brow: v, duration: d, ease, overwrite: 'auto' }),
			grimace: (v = 1, d = 0.16) => gsap.to(E, { grimace: v, duration: d, ease, overwrite: 'auto' }),
			turn: (deg, d = 1.4) => gsap.to(E, { headR: deg, duration: d, ease: 'sine.inOut', overwrite: 'auto' }),
			// ojos (parpadeo = scaleY, mirada = pupilas), cejas, boca, cabeza
			face(ex, ey, brow, grin, headR, shut) {
				const sy = 1 - 0.94 * clamp(0, 1, shut);
				put('eye-l', 'scaleY', sy); put('eye-r', 'scaleY', sy);
				for (const pp of eyes) for (const el of pp.els) { set(el, 'x', ex * pp.tx); set(el, 'y', ey * pp.ty); }
				put('brow-l', 'y', brow); put('brow-r', 'y', brow);
				put('brow-l', 'rotation', 7 * grin); put('brow-r', 'rotation', -7 * grin);
				put('mouth', 'scaleX', 1 + 0.2 * grin); put('mouth', 'scaleY', 1 - 0.35 * grin);
				put('head', 'rotation', headR);
			},
		};
	}
	const rig = makeRig(parts, pupils);

	// la copia del lander no tiene ids ni clases: misma pieza = mismo camino de índices desde el <svg>
	const landerSvg = lander && $('svg', lander);
	const pathOf = el => { const p = []; for (let n = el; n && n !== svg; n = n.parentElement) p.unshift(Array.prototype.indexOf.call(n.parentElement.children, n)); return p; };
	const onLander = el => {
		if (!landerSvg || !el) return null;
		const m = pathOf(el).reduce((node, i) => node && node.children[i], landerSvg);
		return m && m.tagName === el.tagName ? m : null;
	};
	const lparts = {};
	['head', 'eye-l', 'eye-r', 'brow-l', 'brow-r', 'mouth', 'torso', 'collar', 'hair-back'].forEach(n => { const m = onLander(parts[n]); if (m) lparts[n] = m; });
	const lrig = makeRig(lparts, pupils.map(pp => ({ els: pp.els.map(onLander).filter(Boolean), tx: pp.tx, ty: pp.ty })).filter(pp => pp.els.length));
	const lstrands = strands.map(el => ({ el: onLander(el), o: originEl(el, 0.5, 0) })).filter(s => s.el);
	lstrands.forEach(s => gsap.set(s.el, { svgOrigin: at(s.o) }));
	const lglints = glints.map(onLander).filter(Boolean);
	gsap.set([...glints, ...lglints], { opacity: 0 });
	// destello: cruza los lentes (x -30 → +30, opacidad 0 → .55 → 0, 0.7 s)
	function sweep(list) {
		if (!list.length) return;
		gsap.timeline()
			.fromTo(list, { x: -30 }, { x: 30, duration: 0.7, ease: 'power1.inOut', overwrite: 'auto' }, 0)
			.fromTo(list, { opacity: 0 }, { opacity: 0.55, duration: 0.3, ease: 'sine.out' }, 0.03)
			.to(list, { opacity: 0, duration: 0.37, ease: 'sine.in' }, 0.33);
	}

	/* ---------- estado ---------- */
	// A: lo que dicta el scroll (unidades sin layout: vh, vw, 0..1, viewBox; mirada en -1..1)
	const A = {
		drop: 0, center: 0, fork: 0, exit: 0, dx: 0, r: -90, o: 1, lift: 0, hang: 0, flail: 0,
		headR: 0, legL: 0, legR: 0, eyeX: 0, eyeY: 0, brow: 0, glasses: 0, grimace: 0,
		fly: 0, flyO: 1, bedY: 0, bedO: 1,
	};
	const H = { x: 0, r: 0 };        // inclinación hacia un portal (px, grados)
	const BOB = { y: -10 };          // balanceo colgado (px)
	const D = { x: 0, y: 0, r: -180, s: 1, o: 1 }; // clavado
	const dive = { on: false, busy: false, tween: null };
	// M: medidas de layout, solo se leen en refresh
	const M = { vw: 1, vh: 1, baseX: 0, baseY: 0, h: 1, centerY: 0, hangX: 0, hangY: 0, hangS: 0.6 };
	const figBox = bbox($('#char')) || { y: VB.y, height: VB.height };
	const FIG = { top: figBox.y, bottom: figBox.y + figBox.height, mid: VB.y + VB.height / 2 };

	/* ---------- loops (L): se multiplican por la intensidad de la caída ---------- */
	const idle = [];
	const L = { kickL: -1, kickR: 1, shoeL: -1, shoeR: 1, arm: -1, arm2: -1, collar: -1, hair: 0, vib: -1, sway: -1, wind: -1 };
	const loop = (k, to, dur, delay = 0, ease = 'sine.inOut') => idle.push(gsap.to(L, { [k]: to, duration: dur, ease, yoyo: true, repeat: -1, delay }));
	loop('kickL', 1, 1.7); loop('kickR', -1, 1.9);   // patadas lentas, desfasadas
	loop('shoeL', 1, 0.55); loop('shoeR', -1, 0.65);  // zapatos colgando
	loop('arm', 1, 1.3); loop('arm2', 1, 0.9, 0.3);   // se aferra: los brazos se ajustan, nunca se descruzan
	loop('collar', 1, 0.16);                           // cuello al viento
	loop('hair', 1, 0.42);                             // pelo de atrás
	loop('vib', 1, 0.05, 0, 'none');                   // lentes vibrando
	loop('sway', 1, 1.5);                              // vaivén de todo el cuerpo (3 s)
	loop('wind', 1, 0.9, 0.2);                         // viento en la camisa

	/* ---------- 1. reposo: respira (la frazada también) ---------- */
	const breath = gsap.timeline({ repeat: -1, yoyo: true, defaults: { duration: 3.2, ease: 'sine.inOut' } });
	if (parts.torso) breath.to(parts.torso, { scaleY: 1.012 }, 0);
	if (parts.head) breath.to(parts.head, { scaleY: 1.012 }, 0);
	if (blanketDiv) breath.to(blanketDiv, { scaleY: 1.008 }, 0);
	idle.push(breath);

	// mechones: elevación por la caída (scroll) + aleteo (loops) + arrastre (resorte).
	// En reposo solo se mece el más grande; cayendo, todos y más rápido.
	let swayIdx = 0;
	strands.reduce((best, s, i) => { const b = bbox(s); const a = b ? b.width * b.height : 0; if (a > best) { swayIdx = i; return a; } return best; }, -1);
	const S = strands.map((el, i) => {
		const o = pt(el.getAttribute('data-origin')) || pivots.strands || boxAt(el, 0.5, 0) || { x: 0, y: 0 };
		gsap.set(el, { svgOrigin: at(o) });
		const b = bbox(el);
		const off = b ? b.x + b.width / 2 - o.x : 0;
		// "hacia arriba" en pantalla = hacia la cara en el dibujo: el signo depende del lado
		const dir = Math.abs(off) < 3 ? (i % 2 ? -1 : 1) : Math.sign(off);
		const osc = { v: -1 };
		const tween = gsap.to(osc, { v: 1, duration: 1.6 + ((i * 0.37) % 0.8), ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * 0.21 });
		idle.push(tween);
		return {
			set: gsap.quickSetter(el, 'rotation', 'deg'), osc, tween, last: NaN,
			lift: dir * (12 + ((i * 5.3) % 8)),        // 12-20°
			calm: i === swayIdx ? 2.5 : 0,             // amplitud en reposo
			wild: 3.5 + ((i * 1.7) % 2.5),             // amplitud cayendo
			drag: 1 + ((i * 0.29) % 0.4),              // cuánto arrastra el resorte
		};
	});

	/* ---------- la cama (fija, mismo centro que el personaje) ---------- */
	const blanketG = $('#bed-blanket #blanket');
	const blanketFold = $('#blanket-fold');
	const doors = ['#mattress-flap-l', '#mattress-flap-r'].map(sel => $(sel)).filter(Boolean);
	const flap = doors.length ? null : $('#mattress-flap'); // dibujo viejo: una sola tapa
	const pillow = $('#pillow');
	[bedDiv, blanketDiv].forEach(el => { if (el) gsap.set(el, { x: 0, y: 0, xPercent: -50, yPercent: -50 }); }); // como el CSS, sin doble centrado
	if (blanketG) gsap.set(blanketG, { svgOrigin: at(originEl(blanketG, 0, 1)) });
	if (blanketFold) gsap.set(blanketFold, { svgOrigin: at(originEl(blanketFold, 1, 0.5)) });
	if (blanketDiv && blanketG) {
		// respira desde su borde de abajo
		const b = bbox(blanketG), vb = $('#bed-blanket').viewBox.baseVal;
		gsap.set(blanketDiv, { transformOrigin: `50% ${b ? ((b.y + b.height - vb.y) / vb.height) * 100 : 82}%` });
	}
	// trampilla: cada puerta gira sobre su bisagra (data-origin); el signo sale del lado de la
	// bisagra para que el borde libre baje: izquierda +, derecha -
	const hinge = el => {
		const o = originEl(el, 1, 0), b = bbox(el);
		gsap.set(el, { svgOrigin: at(o) });
		return { o, dir: b && o.x < b.x + b.width / 2 ? 1 : -1 };
	};
	const doorH = doors.map(hinge);
	const flapH = flap ? hinge(flap) : { dir: -1 };
	// la almohada viaja con la puerta sobre la que está (gira sobre la misma bisagra) y cae por el medio
	let pillowDir = flapH.dir;
	if (pillow) {
		const pb = bbox(pillow), cx = pb ? pb.x + pb.width / 2 : 0;
		const i = doors.findIndex(el => { const b = bbox(el); return b && cx >= b.x && cx <= b.x + b.width; });
		if (i >= 0) pillowDir = doorH[i].dir;
		gsap.set(pillow, { svgOrigin: at(i >= 0 ? doorH[i].o : originEl(pillow, 0.5, 1)) });
	}

	/* ---------- etiquetas de la caída: ventanas en el pin (1 o 2 a la vez) ----------
	   El fondo cambia en 26-38% del pin; ninguna etiqueta se ve con la mezcla entre 20 y 80%. */
	const labels = $$('.fall__label');
	const BG = [0.26, 0.12];
	const WIN = [[0, 0.24], [0.08, 0.24], [0.37, 0.23], [0.49, 0.24], [0.62, 0.22], [0.74, 0.24]];
	const winOf = i => WIN[i] || [Math.min(0.75, i * 0.12), 0.22];
	const sideOf = el => ((parseFloat(el.style.getPropertyValue('--x')) || 50) < 45 ? -1 : 1);

	/* ---------- línea de tiempo del personaje y su cama, en fases ----------
	   0-1 pin #inicio · 1-2 el inicio se va · 2-3 pin #caida
	   3-4 la caída se va · 4-5 pin #eleccion · 5-6 la elección se va */
	const tlA = gsap.timeline({ paused: true, defaults: { ease: 'sine.inOut' } });

	// 2. la cama se rompe. 0-25%: la frazada se escurre a los pies, se levanta y se va volando
	// (bamboleo ±6°); él lo nota: cejas arriba, lentes nariz abajo, mira hacia sus pies
	tlA.to(A, { brow: -0.2 * FACE, glasses: 4 * HS, eyeY: 0.8, duration: 0.12, ease: 'power2.out' }, 0.02)
		.to(A, { headR: -5, duration: 0.16 }, 0.04)
		.to(A, { fly: 1, duration: 0.17, ease: 'power1.in' }, 0.08)
		.to(A, { flyO: 0, duration: 0.07, ease: 'none' }, 0.18);
	if (blanketG) {
		tlA.to(blanketG, { x: 60, duration: 0.09, ease: 'power1.inOut' }, 0)
			.to(blanketG, { keyframes: { rotation: [0, -6, 5, -6, 6, -5, 3], easeEach: 'sine.inOut' }, duration: 0.17, ease: 'none' }, 0.08);
	}
	if (blanketFold) tlA.to(blanketFold, { keyframes: { rotation: [0, 12, -9, 14, -6, 10], easeEach: 'sine.inOut' }, duration: 0.17, ease: 'none' }, 0.08);
	// 25-60%: el colchón se abre en dos puertas hacia abajo, como un pestillo que cede (el piso: heroTl)
	doors.forEach((el, i) => {
		tlA.to(el, { rotation: 38 * doorH[i].dir, duration: 0.35, ease: 'power2.in' }, 0.25)
			.to(el, { opacity: 0.35, duration: 0.2, ease: 'none' }, 0.4);
	});
	if (flap) tlA.to(flap, { rotation: 18 * flapH.dir, opacity: 0, duration: 0.2, ease: 'power1.in' }, 0.25); // sin tablón
	if (pillow) {
		// viaja con su puerta (misma bisagra), salta un poco al ceder el pestillo y se va por la abertura
		tlA.to(pillow, { rotation: 38 * pillowDir, duration: 0.35, ease: 'power2.in' }, 0.25)
			.to(pillow, { keyframes: { y: [0, -16, 0, -6, 0] }, duration: 0.14, ease: 'none' }, 0.3)
			.to(pillow, { x: 130 * pillowDir, y: 340, duration: 0.18, ease: 'power2.in' }, 0.47)
			.to(pillow, { opacity: 0, duration: 0.08, ease: 'none' }, 0.58);
	}
	// 45-100%: se inclina y cae ~14vh; la cama sube y se desvanece (62-92%)
	tlA.to(A, { r: -125, drop: 14, duration: 0.55, ease: 'power2.in' }, 0.45)
		.to(A, { eyeY: 0, duration: 0.2 }, 0.62)
		.to(A, { bedY: -50, duration: 0.3, ease: 'power1.in' }, 0.62)
		.to(A, { bedO: 0, duration: 0.24, ease: 'none' }, 0.62);

	// 3. la caída: gira a cabeza abajo con un rebote (y una mueca); la cámara lo alcanza
	tlA.to(A, { r: -186, duration: 1.1, ease: 'power1.out' }, 1)
		.to(A, { r: -180, duration: 0.2 }, 2.1)
		.to(A, { center: 1, duration: 1 }, 1)
		.to(A, { headR: 5, brow: -0.1 * FACE, glasses: 3 * HS, duration: 0.8 }, 1.1)
		.to(A, { lift: 1, duration: 0.9 }, 1.1)
		.to(A, { legL: 7, legR: -6, flail: 1, duration: 1 }, 1.2) // piernas un poco abiertas, pataleo
		.to(A, { grimace: 1, duration: 0.08, ease: 'power2.out' }, 2.02)
		.to(A, { grimace: 0, duration: 0.2 }, 2.14)
		.to(A, { keyframes: { dx: [0, 3, -3, 2.5, -2.5, 3, -1.5, 0], easeEach: 'sine.inOut' }, duration: 1.8, ease: 'none' }, 1.5);
	// mira cada dato que pasa (cabeza abajo: la x local va al revés que la de pantalla)
	labels.forEach((el, i) => {
		const [w0, dur] = winOf(i);
		tlA.to(A, { eyeX: -sideOf(el), duration: 0.025, ease: 'power2.out' }, 2 + w0 + dur * 0.08);
	});
	tlA.to(A, { eyeX: 0, duration: 0.03 }, 2.97);

	// 4. la elección: se calma, se achica y cuelga entre los portales
	tlA.to(A, { fork: 1, duration: 0.95 }, 3)
		.to(A, { lift: 0.5, flail: 0.12, legL: 2.5, legR: -2, brow: 0, glasses: 2.5 * HS, duration: 0.7 }, 3.3)
		.to(A, { hang: 1, duration: 0.25 }, 3.75)
	// ...y si nadie elige, sigue cayendo fuera de cuadro
		.to(A, { hang: 0, duration: 0.1, ease: 'none' }, 4.5)
		.to(A, { exit: 115, duration: 0.48, ease: 'power2.in' }, 4.52)
		.to(A, { lift: 1, flail: 1, legL: 7, legR: -6, brow: -0.1 * FACE, duration: 0.3 }, 4.52)
		.to(A, { o: 0, duration: 0.18, ease: 'none' }, 4.82)
		.set({}, {}, 6);

	/* ---------- 2. el piso (pin #inicio) ---------- */
	const heroTl = gsap.timeline({ defaults: { ease: 'none' } })
		.to('.hero__hint', { opacity: 0, duration: 0.1 }, 0)
		.to('.hero__floor-line--l', { xPercent: -100, duration: 0.35, ease: 'power2.in' }, 0.25)
		.to('.hero__floor-line--r', { xPercent: 100, duration: 0.35, ease: 'power2.in' }, 0.25)
		.to('.hero__shadow', { opacity: 0, duration: 0.2 }, 0.28)
		.set({}, {}, 1);
	const heroST = ScrollTrigger.create({
		trigger: hero, pin: true, start: 'top top', end: pin(110), scrub: 1, animation: heroTl,
	});

	/* ---------- 3. la caída (pin #caida) ---------- */
	const vh = n => () => n * window.innerHeight / 100;
	const streakBox = $('.fall__streaks');
	// crema → tinta en 12% del pin, en un tramo sin etiquetas (difference no se lee sobre gris)
	const fallTl = gsap.timeline({ defaults: { ease: 'none' } })
		.fromTo(fall, { backgroundColor: '#f4f1ea' }, { backgroundColor: '#151a24', duration: BG[1] }, BG[0])
		.fromTo(streakBox, { opacity: 0 }, { opacity: 0.7, duration: 0.13 }, BG[0] + 0.01)
		.fromTo(streakBox, { opacity: 0.7 }, { opacity: 0.9, duration: 0.5, immediateRender: false }, 0.45);
	// etiquetas: suben de ~50vh abajo a ~70vh arriba (siempre fuera de cuadro en los extremos)
	labels.forEach((el, i) => {
		const y = parseFloat(el.style.getPropertyValue('--y')) || 15 + i * 14;
		const [w0, dur] = winOf(i);
		fallTl.fromTo(el, { y: vh(Math.max(50, 104 - y)) }, { y: vh(Math.min(-70, -(y + 16))), duration: dur }, w0);
	});
	fallTl.set({}, {}, 1);
	const fallST = ScrollTrigger.create({
		trigger: fall, pin: true, start: 'top top', end: pin(450), scrub: 1, animation: fallTl,
		invalidateOnRefresh: true, onEnterBack: () => restore(),
	});
	// estelas: suben rápido en loop; solo corren mientras la caída se ve
	const streakTl = gsap.timeline({ paused: true });
	const nStreaks = window.innerWidth < 700 ? 6 : 10;
	for (let i = 0; i < nStreaks; i++) {
		const s = document.createElement('i');
		s.style.left = (3 + Math.random() * 94).toFixed(2) + '%';
		streakBox.appendChild(s);
		gsap.set(s, { opacity: 0.35 + Math.random() * 0.6, scaleY: 0.6 + Math.random() * 0.7 });
		streakTl.fromTo(s, { yPercent: 560 }, { yPercent: -30, duration: 0.6 + Math.random() * 0.5, ease: 'none', repeat: -1 }, Math.random() * 0.9);
	}

	/* ---------- 4. la elección (pin #eleccion) ---------- */
	const forkST = ScrollTrigger.create({
		trigger: fork, pin: true, start: 'top top', end: pin(100), onEnterBack: () => restore(),
	});
	ScrollTrigger.create({
		start: () => fallST.start - window.innerHeight, end: () => fallST.end + fall.offsetHeight,
		onToggle: self => streakTl.paused(!self.isActive),
	});

	function measure() {
		M.vw = window.innerWidth;
		M.vh = window.innerHeight;
		const cs = getComputedStyle(actor);
		M.baseX = parseFloat(cs.left) || M.vw / 2;  // el centro del actor (translate -50%)
		M.baseY = parseFloat(cs.top) || M.vh * 0.6;
		M.h = actor.offsetHeight || M.vh * 0.6;
		M.centerY = M.vh / 2 - M.baseY;
		// 4. colgado entre los portales: el pelo apenas entra entre los aros,
		// los pies quedan bajo el subtítulo. El pin deja #eleccion en top 0.
		const fr = fork.getBoundingClientRect();
		const rs = portals.map(p => p.getBoundingClientRect());
		const sub = $('.fork__sub') || $('.fork__title');
		if (!rs.length) return;
		const k = M.h / VB.height;
		const rowTop = Math.min(...rs.map(r => r.top)) - fr.top;
		const headY = rowTop + rs[0].height * 0.22;
		const ceil = sub.getBoundingClientRect().bottom - fr.top + 14;
		M.hangS = clamp(0.3, 0.85, (headY - ceil) / ((FIG.bottom - FIG.top) * k));
		M.hangX = rs.reduce((s, r) => s + r.left + r.width / 2, 0) / rs.length - M.baseX;
		M.hangY = headY - (FIG.mid - FIG.top) * k * M.hangS - M.baseY;
	}

	/* ---------- scroll → fase del personaje (sigue con ~0.8 s de retraso) ---------- */
	let B = [0, 1, 2, 3, 4, 5, 6];
	function bounds() {
		B = [heroST.start, heroST.end, fallST.start, fallST.end, forkST.start, forkST.end, forkST.end + fork.offsetHeight];
		for (let i = 1; i < B.length; i++) if (B[i] <= B[i - 1]) B[i] = B[i - 1] + 1;
	}
	function phaseAt(y) {
		if (y <= B[0]) return 0;
		for (let i = 0; i < B.length - 1; i++) if (y < B[i + 1]) return i + (y - B[i]) / (B[i + 1] - B[i]);
		return B.length - 1;
	}
	const drive = { t: 0 };
	const follow = gsap.quickTo(drive, 't', { duration: 0.8, ease: 'power3', onUpdate: () => tlA.time(drive.t) });
	function sync(now) {
		const y = window.scrollY;
		const t = phaseAt(y);
		// saltos grandes (Inicio/Fin, recarga) no se animan: evita que cruce la pantalla
		if (now || Math.abs(t - drive.t) > 1.5) { follow(t, t); drive.t = t; tlA.time(t); }
		else follow(t);
		if (dive.on && y < B[5]) restore();
	}
	ScrollTrigger.create({ start: 0, end: 'max', onUpdate: () => sync(false) });
	ScrollTrigger.addEventListener('refresh', () => { measure(); bounds(); sync(true); });

	/* ---------- compositor: cada transform una vez por frame, sin leer layout ---------- */
	const C = { x: 0, y: 0, r: -90, s: 1, o: 1 };
	function compose() {
		const u = M.vh / 100;
		const tipY = A.drop * u;
		let y = tipY + (M.centerY - tipY) * A.center;
		y += (M.hangY - y) * A.fork;
		C.y = y + A.exit * u + BOB.y * A.hang;
		C.x = A.dx * M.vw / 100 + M.hangX * A.fork + H.x * A.hang;
		C.r = A.r + H.r * A.hang + 3 * L.sway * A.flail; // cayendo: vaivén lento ±3° sobre el giro del scroll
		C.s = 1 + (M.hangS - 1) * A.fork;
		C.o = A.o;
		return C;
	}
	// acción secundaria: pelo, cuello y mechones van ~0.1 s detrás del giro del cuerpo.
	// Entrada = velocidad angular (°/s); resorte amortiguado (un pequeño rebote) y limitado.
	const spring = () => ({ x: 0, v: 0, last: null });
	function drag(sp, r, dt) {
		let w = 0;
		if (sp.last !== null && Math.abs(r - sp.last) < 40) w = (r - sp.last) / dt; // un salto no es un giro
		sp.last = r;
		const target = clamp(-14, 14, -0.14 * w);
		sp.v += ((target - sp.x) * 180 - sp.v * 14) * dt;
		sp.x += sp.v * dt;
		return sp.x;
	}
	const SEC = spring(), LSEC = spring();
	// cama y frazada: solo existen en el inicio; se ocultan del todo al irse
	const fx = (el, props) => el && props.reduce((o, p) => { o[p] = gsap.quickSetter(el, p, p === 'opacity' ? '' : 'px'); return o; }, { el, last: '' });
	const bedFx = fx(bedDiv, ['y', 'opacity']);
	const blanketFx = fx(blanketDiv, ['x', 'y', 'opacity']);
	function writeBed() {
		const u = M.vh / 100;
		if (bedFx) {
			const k = (A.bedY * u).toFixed(1) + '|' + A.bedO.toFixed(3);
			if (k !== bedFx.last) {
				bedFx.last = k;
				bedFx.y(A.bedY * u);
				bedFx.opacity(A.bedO);
				bedDiv.style.visibility = A.bedO < 0.005 ? 'hidden' : '';
			}
		}
		if (blanketFx) {
			const k = A.fly.toFixed(4) + '|' + A.flyO.toFixed(3);
			if (k !== blanketFx.last) {
				blanketFx.last = k;
				blanketFx.x(A.fly * 0.4 * M.vw); // se va volando: +40vw, -30vh
				blanketFx.y(-A.fly * 0.3 * M.vh);
				blanketFx.opacity(A.flyO);
				blanketDiv.style.visibility = A.flyO < 0.005 ? 'hidden' : '';
			}
		}
	}
	let lastT = '', lastO = '', lastVis = true, lastLift = -1, landerOn = false, lastPhase = 0;
	function render(time, deltaTime) {
		const dt = clamp(1 / 240, 1 / 20, (deltaTime || 16.7) / 1000);
		const c = dive.on ? D : compose();
		const t = `translate(-50%, -50%) translate3d(${c.x.toFixed(1)}px, ${c.y.toFixed(1)}px, 0) rotate(${c.r.toFixed(2)}deg) scale(${c.s.toFixed(4)})`;
		if (t !== lastT) { actor.style.transform = t; lastT = t; }
		const o = c.o < 0.002 ? 0 : c.o;
		const os = o.toFixed(3);
		if (os !== lastO) { actor.style.opacity = os; lastO = os; }
		writeBed();
		if (landerOn) { // el que aterrizó: cara + pelo y cuello que se acomodan
			const e = lrig.E;
			lrig.face(e.eyeX + e.idleX, e.eyeY, e.brow, e.grimace, e.headR + e.idleR, Math.max(e.blink, e.closed));
			const ls = drag(LSEC, gsap.getProperty(lander, 'rotation') || 0, dt);
			lrig.put('hair-back', 'rotation', ls);
			lrig.put('collar', 'rotation', 0.6 * ls);
			for (const s of lstrands) lrig.set(s.el, 'rotation', 1.2 * ls);
		}
		const vis = o > 0;
		if (vis !== lastVis) { lastVis = vis; idle.forEach(tw => tw.paused(!vis)); }
		const sec = drag(SEC, c.r, dt);
		// un parpadeo doble y deliberado justo después del rebote (solo bajando, sin saltos)
		const ph = drive.t;
		if (lastPhase < 2.28 && ph >= 2.28 && ph < 2.6 && vis) rig.blink(true);
		lastPhase = ph;
		if (!vis) return;
		// rig: scroll (A) + eventos (E) + loops (L) x intensidad + arrastre
		const E = rig.E, f = A.flail, lift = A.lift;
		const rest = clamp(0, 1, 1 - ph * 8); // gestos de la cama: se apagan al empezar a bajar
		rig.face(A.eyeX + E.eyeX + E.idleX * rest, A.eyeY + E.eyeY, A.brow + E.brow, Math.max(A.grimace, E.grimace), A.headR + E.headR + E.idleR * rest, Math.max(E.blink, E.closed));
		rig.put('glasses', 'y', A.glasses + L.vib * f * HS);
		rig.put('leg-l', 'rotation', A.legL + 11 * L.kickL * f);
		rig.put('leg-r', 'rotation', A.legR + 10 * L.kickR * f + (parts['shoe-r'] ? 0 : 0.3 * E.foot * rest));
		rig.put('shoe-l', 'rotation', 8 * L.shoeL * f);
		rig.put('shoe-r', 'rotation', 8 * L.shoeR * f + E.foot * rest);
		rig.put('arm-front', 'x', 2.5 * L.arm * f); rig.put('arm-front', 'y', L.arm2 * f); // se ajustan, cruzados
		rig.put('arm-back', 'x', -2.5 * L.arm * f); rig.put('arm-back', 'y', -L.arm2 * f);
		rig.put('arms', 'x', 1.5 * L.arm * f);
		rig.put('torso', 'skewX', 1.5 * L.wind * f);                  // viento en la camisa
		rig.put('collar', 'rotation', 6 * L.collar * f + 0.6 * sec);
		rig.put('hair-back', 'rotation', sec);
		rig.put('hair-back', 'scaleY', 1 + 0.12 * L.hair * lift);
		if (Math.abs(lift - lastLift) > 0.01) { lastLift = lift; S.forEach(s => s.tween.timeScale(1 + 1.6 * lift)); }
		for (const s of S) {
			const rot = lift * s.lift + s.osc.v * (s.calm + (s.wild - s.calm) * lift) + s.drag * sec;
			if (!(Math.abs(rot - s.last) < 0.02)) { s.set(rot); s.last = rot; }
		}
	}

	/* ---------- vida: parpadeos, giros de cabeza lentos, un pie inquieto, destellos ---------- */
	const later = (min, max, fn) => gsap.delayedCall(rand(min, max), fn);
	const resting = () => lastVis && drive.t < 0.02;
	(function blinkLoop() { // reposo 3-6 s, cayendo 2-3 s, colgado 2.5-4 s
		const [a, b] = A.flail > 0.5 ? [2, 3] : A.hang > 0.5 ? [2.5, 4] : [3, 6];
		later(a, b, () => { if (lastVis && !dive.on) rig.blink(Math.random() < 0.15); blinkLoop(); });
	})();
	// giro de cabeza ±5.5°: primero van los ojos, la cabeza (enorme) los sigue despacio
	const headTurn = (r, deg) => gsap.timeline()
		.to(r.E, { idleX: 0.5 * Math.sign(deg), duration: 0.4, ease: 'power2.out' }, 0)
		.to(r.E, { idleR: deg, duration: 1.4, ease: 'sine.inOut' }, 0.15)
		.to(r.E, { idleX: 0, idleR: 0, duration: 1.4, ease: 'sine.inOut' }, 3.1);
	let turnSide = 1;
	(function turnLoop() { // en la cama, cada 7-9 s
		later(7, 9, () => { if (resting()) headTurn(rig, 5.5 * (turnSide = -turnSide)); turnLoop(); });
	})();
	(function footLoop() { // y a veces mueve un pie
		later(5, 9, () => {
			if (resting() && Math.random() < 0.7) {
				gsap.to(rig.E, { keyframes: { foot: [0, 9, -5, 7, 0] }, duration: 0.8, ease: 'sine.inOut', overwrite: 'auto' });
			}
			footLoop();
		});
	})();
	(function glintLoop() { // destello en los lentes, cada 6-9 s en reposo (si el dibujo los trae)
		later(6, 9, () => {
			if (resting()) sweep(glints);
			if (landerOn) sweep(lglints);
			glintLoop();
		});
	})();

	/* ---------- 4. hover/foco en un portal: ojos primero, cuerpo y cabeza detrás ---------- */
	let lastGlint = 0;
	function tilt(p, on) {
		let dir = 0;
		if (on) {
			const r = p.getBoundingClientRect();
			dir = Math.sign(r.left + r.width / 2 - (M.baseX + M.hangX)) || (p.dataset.branch === 'games' ? -1 : 1);
		}
		// cabeza abajo: girar +12° lleva la cabeza a la izquierda; la x local va al revés
		gsap.to(H, { x: 40 * dir, r: -12 * dir, duration: 0.35, ease: 'power2.out', overwrite: true });
		rig.look(-dir, 0, 0.3);
		rig.turn(-6 * dir, 1.2);
		rig.brows(on ? -0.17 * FACE : 0, 0.3);
		if (on && performance.now() - lastGlint > 1500) { lastGlint = performance.now(); sweep(glints); }
	}

	/* ---------- 5. elegir: clavado al portal + círculo que cubre ---------- */
	// .fork__cover es fixed, pero el pin deja un transform en #eleccion y lo encerraría:
	// se muda a <body> para que cubra la ventana también después del salto
	if (cover) document.body.appendChild(cover);

	function restore() { // 5d. vuelve a mandar el scroll
		if (!dive.on || dive.busy) return;
		if (dive.tween) { dive.tween.kill(); dive.tween = null; }
		gsap.set(D, { s: 1, o: 1 });
		gsap.set(rig.E, { closed: 0, eyeX: 0, headR: 0, brow: 0 });
		dive.on = false;
	}

	function diveInto(p) {
		if (dive.busy) return;
		const branch = p.dataset.branch;
		const r = p.getBoundingClientRect();
		const cx = r.left + r.width / 2;
		const cy = r.top + r.height / 2;
		const ring = $('.portal__ring', p);
		Object.assign(D, compose()); // parte desde lo que se ve
		dive.on = true;
		dive.busy = true;
		// a. hacia el centro del portal, cabeza abajo exacta, cierra los ojos, se encoge y desaparece
		dive.tween = gsap.to(D, { x: cx - M.baseX, y: cy - M.baseY, r: -180, s: 0.12, o: 0, duration: 0.65, ease: 'power2.in' });
		gsap.to(rig.E, { closed: 1, duration: 0.25, ease: 'power2.in', overwrite: 'auto' });
		if (ring) {
			ring.style.transition = 'none';
			gsap.fromTo(ring, { scale: 1.18 }, { scale: 1, duration: 0.5, ease: 'power2.out', clearProps: 'transform,transition' });
		}
		if (!cover) { land(branch); return; }
		// b. el círculo del color de la rama crece desde el portal
		gsap.timeline()
			.set(cover, { '--cover': BRANCHES[branch].cover, clipPath: `circle(0vmax at ${cx}px ${cy}px)`, opacity: 1 })
			.to(cover, { clipPath: `circle(150vmax at ${cx}px ${cy}px)`, duration: 0.55, ease: 'power2.in' }, 0.25)
			// c. cubierto: cambia la rama, salta a proyectos y se descubre
			.add(() => land(branch), 0.8)
			.to(cover, { opacity: 0, duration: 0.45, ease: 'power1.out' }, 0.82)
			.set(cover, { clipPath: 'circle(0vmax at 50% 50%)', opacity: 1 });
	}

	function land(branch) {
		setBranch(branch, { refresh: false, land: true });
		jumpTo(projects);
		ScrollTrigger.refresh();
		dive.busy = false; // 5d. el actor sigue oculto hasta volver a la caída
		dropLander(0.12);
		focusProjects();
	}

	portals.forEach(p => {
		p.addEventListener('pointerenter', () => tilt(p, true));
		p.addEventListener('pointerleave', () => tilt(p, false));
		p.addEventListener('focus', () => tilt(p, true));
		p.addEventListener('blur', () => tilt(p, false));
		p.addEventListener('click', () => diveInto(p));
	});

	/* ---------- 6. aterrizaje en proyectos ---------- */
	// polvo al tocar el piso: 5-7 bocanadas del color de la página, crecen, suben y se van
	const NS = 'http://www.w3.org/2000/svg';
	function puffs() {
		if (!landerSvg) return;
		const vb = landerSvg.viewBox.baseVal;
		const hpx = landerSvg.getBoundingClientRect().height || 150; // se lee al aterrizar, no en el ticker
		const u = (vb && vb.height ? vb.height : VB.height) / hpx;      // unidades del viewBox por px
		const color = getComputedStyle(projects).getPropertyValue('--p-fg-2').trim() || 'currentColor';
		const cx = VB.x + VB.width / 2;
		const n = 5 + Math.floor(Math.random() * 3);
		for (let i = 0; i < n; i++) {
			const side = i % 2 ? 1 : -1;
			const c = document.createElementNS(NS, 'circle');
			c.setAttribute('cx', cx + side * (0.08 + 0.3 * Math.random()) * VB.width);
			c.setAttribute('cy', FIG.bottom - 2 * u);
			c.setAttribute('r', (3 + Math.random() * 3.5) * u);
			c.setAttribute('fill', color);
			c.setAttribute('opacity', '0.7');
			landerSvg.appendChild(c);
			gsap.fromTo(c, { scale: 0, transformOrigin: '50% 50%' }, {
				scale: 1, x: side * (6 + Math.random() * 10) * u, y: -8 * u, opacity: 0,
				duration: 0.6, delay: Math.random() * 0.05, ease: 'power2.out', onComplete: () => c.remove(),
			});
		}
	}
	const landTl = gsap.timeline({ paused: true });
	const landIdle = gsap.timeline({ paused: true, repeat: -1, yoyo: true, defaults: { duration: 3.2, ease: 'sine.inOut' } });
	let landed = false;
	function dropLander(delay = 0) {
		landed = true;
		if (lander) landTl.delay(delay).restart(true);
	}
	if (lander) {
		gsap.set(lander, { transformOrigin: '50% 100%', y: -140, rotation: -18, opacity: 0 });
		// cae acelerando, se aplasta al tocar (polvo, el pelo rebota) y se acomoda
		landTl.fromTo(lander, { y: -140 }, { y: 0, duration: 0.45, ease: 'power2.in', immediateRender: false }, 0)
			.fromTo(lander, { rotation: -18 }, { rotation: 0, duration: 0.45, ease: 'power3.out', immediateRender: false }, 0)
			.fromTo(lander, { opacity: 0 }, { opacity: 1, duration: 0.12, immediateRender: false }, 0)
			.add(() => { LSEC.v += 160; puffs(); }, 0.45)
			.to(lander, { scaleY: 0.94, scaleX: 1.05, duration: 0.09, ease: 'power2.out' }, 0.45)
			.to(lander, { scaleY: 1, scaleX: 1, duration: 0.36, ease: 'back.out(3)' }, 0.54);
		// y se queda: respira, parpadea, destella, gira la cabeza cada 7-9 s
		if (lparts.torso) landIdle.to(lparts.torso, { scaleY: 1.012 }, 0);
		if (lparts.head) landIdle.to(lparts.head, { scaleY: 1.012 }, 0);
		(function landerBlink() {
			later(3, 6, () => { if (landerOn && !landTl.isActive()) lrig.blink(Math.random() < 0.2); landerBlink(); });
		})();
		(function landerTurn() {
			later(7, 9, () => { if (landerOn && !landTl.isActive()) headTurn(lrig, Math.random() < 0.5 ? -5 : 5); landerTurn(); });
		})();
		ScrollTrigger.create({
			trigger: '.projects__head', start: 'top 88%', end: 'bottom top',
			onToggle: self => {
				landerOn = self.isActive;
				if (landerOn && !landed) dropLander(); // la primera vez que se ve
				landIdle.paused(!landerOn);
			},
		});
	}

	/* ---------- 7. gancho de ramas: fundido corto, lander, refresh ---------- */
	onBranch = (branch, changed, opts) => {
		if (changed) {
			const shown = [gridGames, gridSoft].filter(g => !g.hidden);
			gsap.fromTo(shown, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power1.out', overwrite: true, clearProps: 'opacity' });
			if (!opts.land) {
				if (landerOn) dropLander();
				else landed = false; // caerá cuando se vea
			}
		}
		if (opts.refresh !== false) ScrollTrigger.refresh();
	};

	/* ---------- arranque ---------- */
	gsap.set(actor, { xPercent: -50, yPercent: -50, rotation: -90 }); // igual que el CSS: sin salto
	measure();
	bounds();
	sync(true);
	render();
	gsap.ticker.add(render);
	if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());

	// #videojuegos, #software o #todo: directo a proyectos, sin clavado.
	// Cualquier otra ancla (#contacto...) también se reubica: los pines la movieron.
	let hashTarget = null;
	try { hashTarget = hashBranch ? projects : (window.location.hash.length > 1 && document.getElementById(decodeURIComponent(window.location.hash.slice(1)))); } catch (e) { /* hash raro */ }
	if (hashBranch) setBranch(hashBranch, { refresh: false });
	if (hashTarget) {
		ScrollTrigger.refresh();
		jumpTo(hashTarget);
		sync(true);
		// fuentes o imágenes pueden mover el layout después: se reafirma mientras el usuario no toque nada
		let touched = false;
		const mark = () => { touched = true; };
		['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(ev => window.addEventListener(ev, mark, { once: true, passive: true }));
		const settle = () => {
			if (touched) return;
			ScrollTrigger.refresh();
			jumpTo(hashTarget);
			sync(true);
		};
		if (document.readyState === 'complete') requestAnimationFrame(settle);
		else window.addEventListener('load', () => requestAnimationFrame(settle), { once: true });
		if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => requestAnimationFrame(settle));
	}
})();
