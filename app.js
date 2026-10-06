/* ════════════════════════════════════════════════════════════
   LlamadosUY · Simulador de ecosistema de llamados a empresas
   Datos persistidos en localStorage (compartido entre vistas
   y sincronizado en vivo entre pestañas del mismo navegador).
   ════════════════════════════════════════════════════════════ */

'use strict';

const DB_KEY   = 'llamadosuy_db_v1';
const SEEN_KEY = 'llamadosuy_seen_v1';   // llamados ya vistos por el "teléfono"

/* ────────────────────────── utilidades ────────────────────────── */

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const uid = () => 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);

const fmtMoney = n =>
  (n === null || n === undefined || n === '')
    ? 'A convenir'
    : '$ ' + Number(n).toLocaleString('es-UY');

const fmtDate = iso =>
  new Date(iso).toLocaleString('es-UY', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const fmtDateShort = iso =>
  new Date(iso).toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric' });

function isoToLocalInput(iso) {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function timeLeft(iso) {
  const ms = new Date(iso) - Date.now();
  if (ms <= 0) return { txt: 'Vencido', urgent: false, expired: true };
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  if (d > 1)  return { txt: `Vence en ${d} días`,  urgent: d <= 5 };
  if (d === 1) return { txt: 'Vence mañana', urgent: true };
  return { txt: `Vence en ${h} h`, urgent: true };
}

const ORG_COLORS = ['#0b5fff', '#0e9f6e', '#7c3aed', '#db2777', '#c27803', '#0891b2'];
function orgColor(org) {
  let h = 0;
  for (const c of String(org)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return ORG_COLORS[h % ORG_COLORS.length];
}
const orgInitials = org =>
  String(org).split(/\s+/).filter(w => /[A-Za-zÁÉÍÓÚÑ]/.test(w[0]))
    .slice(0, 2).map(w => w[0].toUpperCase()).join('') || 'OR';

/* ────────────────────────── datos de ejemplo ────────────────────────── */

function seedData() {
  const inDays = (d, h = 0) => new Date(Date.now() + d * 86400000 + h * 3600000).toISOString();
  const ago    = (d, h = 0) => new Date(Date.now() - d * 86400000 - h * 3600000).toISOString();

  const llamados = [
    {
      id: uid(),
      titulo: 'Compra de juguetes para actividades infantiles',
      organismo: 'Intendencia Departamental de Flores',
      rubro: 'Juguetería / Artículos infantiles',
      monto: 55000,
      fechaLimite: inDays(18),
      lugar: 'Trinidad, Flores',
      descripcion: 'Adquisición de juguetes didácticos y materiales lúdicos destinados a las actividades del programa de primera infancia que se desarrollan en los centros comunitarios del departamento.\n\nLos interesados podrán retirar los pliegos de bases y condiciones en la Mesa de Entradas de la Intendencia o consultarlos en la sección Compras del portal institucional.',
      requisitos: [
        'Estar inscripto en el Registro Único de Proveedores del Estado (RUPE)',
        'Presentar cotización de los artículos solicitados',
        'Cumplir con las características técnicas solicitadas en el pliego',
      ],
      estado: 'publicado',
      creadoEn: ago(0, 3),
      postulaciones: [
        {
          id: uid(), empresa: 'Mundo Lúdico SRL', rupe: 'RUPE 21-44871', email: 'ventas@mundoludico.com.uy',
          telefono: '099 412 338', mensaje: 'Contamos con stock disponible de la totalidad de los artículos solicitados. Adjuntamos cotización y catálogo actualizado.',
          fecha: ago(0, 1),
        },
        {
          id: uid(), empresa: 'Distribuidora Paseo de los Niños', rupe: 'RUPE 21-30955', email: 'contacto@paseodelosninos.uy',
          telefono: '4364 2091', mensaje: 'Presentamos oferta por el total de los ítems. Plazo de entrega estimado: 10 días hábiles.',
          fecha: ago(0, 2),
        },
      ],
    },
    {
      id: uid(),
      titulo: 'Suministro de útiles escolares para centros educativos',
      organismo: 'Intendencia Departamental de Durazno',
      rubro: 'Librería / Material educativo',
      monto: 128000,
      fechaLimite: inDays(12),
      lugar: 'Durazno, Durazno',
      descripcion: 'Compra de kits de útiles escolares (cuadernos, lápices, carpetas y materiales de arte) para los centros educativos dependientes del programa de apoyo escolar departamental.',
      requisitos: [
        'Inscripción RUPE vigente',
        'Detalle de precios por ítem y por kit armado',
        'Plazo de entrega no mayor a 20 días',
      ],
      estado: 'publicado',
      creadoEn: ago(1, 5),
      postulaciones: [],
    },
    {
      id: uid(),
      titulo: 'Servicio de catering para eventos institucionales',
      organismo: 'Intendencia Departamental de Florida',
      rubro: 'Gastronomía / Catering',
      monto: 80000,
      fechaLimite: inDays(9),
      lugar: 'Florida, Florida',
      descripcion: 'Contratación de servicio de catering para los eventos institucionales del semestre: coffee breaks, almuerzos de trabajo y recepciones. Se adjudicará por período de seis meses.',
      requisitos: [
        'Inscripción RUPE vigente',
        'Bromatología habilitada al día',
        'Referencias de servicios similares',
      ],
      estado: 'publicado',
      creadoEn: ago(2),
      postulaciones: [],
    },
    {
      id: uid(),
      titulo: 'Mantenimiento de luminaria LED en vía pública',
      organismo: 'Intendencia Departamental de Treinta y Tres',
      rubro: 'Electricidad / Obras',
      monto: 340000,
      fechaLimite: inDays(4),
      lugar: 'Treinta y Tres, Treinta y Tres',
      descripcion: 'Servicio de mantenimiento correctivo y preventivo del parque de luminarias LED del departamento, incluyendo reposición de artefactos y tendidos dañados.',
      requisitos: [
        'Inscripción RUPE vigente',
        'Personal técnico habilitado UTE',
        'Vehículo cesto propio',
      ],
      estado: 'publicado',
      creadoEn: ago(3),
      postulaciones: [
        {
          id: uid(), empresa: 'ElectroSur Instalaciones', rupe: 'RUPE 21-51203', email: 'ofertas@electrosur.uy',
          telefono: '099 781 550', mensaje: 'Disponemos de dos vehículos cesto y cuadrilla propia. Cotización adjunta en pliego.',
          fecha: ago(1),
        },
      ],
    },
    {
      id: uid(),
      titulo: 'Compra de equipos informáticos para oficinas',
      organismo: 'Intendencia Departamental de Flores',
      rubro: 'Informática / Equipamiento',
      monto: 210000,
      fechaLimite: inDays(25),
      lugar: 'Trinidad, Flores',
      descripcion: 'Adquisición de 25 equipos de escritorio completos y 10 notebooks para renovación del parque informático de las oficinas departamentales.',
      requisitos: [
        'Inscripción RUPE vigente',
        'Garantía mínima de 24 meses',
        'Soporte técnico en el departamento',
      ],
      estado: 'borrador',
      creadoEn: ago(0, 8),
      postulaciones: [],
    },
    {
      id: uid(),
      titulo: 'Adquisición de material de construcción',
      organismo: 'Intendencia Departamental de Cerro Largo',
      rubro: 'Construcción / Materiales',
      monto: 175000,
      fechaLimite: ago(2),
      lugar: 'Melo, Cerro Largo',
      descripcion: 'Compra de materiales de construcción para obras menores de mantenimiento en edificios públicos.',
      requisitos: ['Inscripción RUPE vigente', 'Presentar cotización'],
      estado: 'cerrado',
      creadoEn: ago(15),
      postulaciones: [
        {
          id: uid(), empresa: 'Corralón del Este', rupe: 'RUPE 21-28734', email: 'ventas@corralondeleste.uy',
          telefono: '4642 1180', mensaje: 'Oferta por el total de los materiales con entrega en obra incluida.',
          fecha: ago(4),
        },
      ],
    },
  ];

  return { llamados };
}

/* ────────────────────────── store ────────────────────────── */

let db;
function load() {
  try { db = JSON.parse(localStorage.getItem(DB_KEY)) || seedData(); }
  catch { db = seedData(); }
  if (!Array.isArray(db.llamados)) db = seedData();
}
function save() { localStorage.setItem(DB_KEY, JSON.stringify(db)); }

function getSeen() {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY)) || []); }
  catch { return new Set(); }
}
function setSeen(set) { localStorage.setItem(SEEN_KEY, JSON.stringify([...set])); }

const publicados = () => db.llamados.filter(l => l.estado === 'publicado' || l.estado === 'cerrado');
const byId = id => db.llamados.find(l => l.id === id);
const misPostulaciones = () =>
  db.llamados.flatMap(l => l.postulaciones.map(p => ({ ...p, llamado: l })))
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

/* ────────────────────────── estado de UI ────────────────────────── */

const ui = {
  env: 'telefono',           // 'telefono' | 'admin'
  phoneTab: 'llamados',      // 'llamados' | 'postulaciones' | 'perfil'
  rubroFilter: 'Todos',
  sheet: null,               // { type:'detail'|'postular'|'ok', id }
  open: {},                  // secciones abiertas del detalle
  adminFilter: 'todos',
  editingId: null,
  postLlamadoId: null,
  pushed: new Set(),         // pushes ya mostrados en esta sesión
};

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 2600);
}

/* ────────────────────────── selector de entorno ────────────────────────── */

function setEnv(env, { url = true } = {}) {
  ui.env = env;
  $('#viewPhone').hidden = env !== 'telefono';
  $('#viewAdmin').hidden = env !== 'admin';
  $$('.env-btn').forEach(b => {
    const on = b.dataset.env === env;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', on);
  });
  $('#envHint').textContent = env === 'telefono'
    ? 'Entorno empresa · recibe notificaciones'
    : 'Entorno organismo · publica y gestiona';
  if (url) {
    try {
      const u = new URL(location.href);
      u.searchParams.set('vista', env === 'telefono' ? 'telefono' : 'admin');
      history.replaceState(null, '', u);
    } catch { /* file:// u origen restringido: ignorar */ }
  }
  render();
}

/* ══════════════════════════ VISTA TELÉFONO ══════════════════════════ */

function renderPhone() {
  const content = $('#phoneContent');
  $$('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === ui.phoneTab));

  const unseen = publicados().filter(l => l.estado === 'publicado' && !getSeen().has(l.id));
  $('#bellBadge').hidden = unseen.length === 0;
  $('#bellBadge').textContent = unseen.length;

  if (ui.phoneTab === 'llamados') {
    const rubros = ['Todos', ...new Set(publicados().map(l => l.rubro))];
    if (!rubros.includes(ui.rubroFilter)) ui.rubroFilter = 'Todos';

    const list = publicados()
      .filter(l => ui.rubroFilter === 'Todos' || l.rubro === ui.rubroFilter)
      .sort((a, b) => (a.estado === 'cerrado') - (b.estado === 'cerrado')
        || new Date(a.fechaLimite) - new Date(b.fechaLimite));

    const seen = getSeen();
    content.innerHTML = `
      <div class="chips">
        ${rubros.map(r => `<button class="chip ${r === ui.rubroFilter ? 'active' : ''}" data-rubro="${esc(r)}">${esc(r)}</button>`).join('')}
      </div>
      ${list.length === 0
        ? `<div class="empty-state">
             <svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/></svg>
             <p>No hay llamados en este rubro.</p>
           </div>`
        : list.map(l => {
            const tl = timeLeft(l.fechaLimite);
            const isNew = l.estado === 'publicado' && !seen.has(l.id);
            return `
              <article class="llamado-card" data-open="${l.id}">
                ${isNew ? '<span class="badge-new">Nuevo</span>' : ''}
                ${l.estado === 'cerrado' ? '<span class="badge-cerrado">Cerrado</span>' : ''}
                <div class="lc-top">
                  <div class="lc-avatar" style="background:${orgColor(l.organismo)}">${orgInitials(l.organismo)}</div>
                  <div class="lc-org">${esc(l.organismo)}</div>
                </div>
                <div class="lc-title">${esc(l.titulo)}</div>
                <span class="lc-rubro">${esc(l.rubro)}</span>
                <div class="lc-meta">
                  <span>Monto: <b>${fmtMoney(l.monto)}</b></span>
                  <span class="${tl.urgent && l.estado !== 'cerrado' ? 'lc-urgente' : ''}">
                    ${l.estado === 'cerrado' ? 'Llamado cerrado' : tl.txt + ' · ' + fmtDateShort(l.fechaLimite)}
                  </span>
                </div>
              </article>`;
          }).join('')}`;
  }

  if (ui.phoneTab === 'postulaciones') {
    const mias = misPostulaciones();
    content.innerHTML = mias.length === 0
      ? `<div class="empty-state">
           <svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
           <p>Todavía no te postulaste a ningún llamado.<br>Abrí un llamado y tocá «Postularse».</p>
         </div>`
      : mias.map(p => `
          <div class="post-card">
            <div class="pc-title">${esc(p.llamado.titulo)}</div>
            <div class="pc-org">${esc(p.llamado.organismo)}</div>
            <span class="pc-estado ${p.llamado.estado === 'cerrado' ? 'cerrado' : 'enviada'}">
              ${p.llamado.estado === 'cerrado' ? 'Llamado cerrado' : 'Postulación enviada'}
            </span>
            <span class="pc-fecha">${fmtDate(p.fecha)}</span>
          </div>`).join('');
  }

  if (ui.phoneTab === 'perfil') {
    content.innerHTML = `
      <div class="profile-card">
        <div class="profile-head">
          <div class="profile-avatar">EM</div>
          <div>
            <div class="profile-name">Empresa Demo SRL</div>
            <div class="profile-rupe">San José de Mayo · contacto@empresademo.uy</div>
          </div>
        </div>
        <span class="rupe-pill">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          Inscripta en RUPE
        </span>
      </div>
      <div class="profile-card">
        <div class="detail-rows">
          <div class="detail-row"><span class="k">Postulaciones realizadas</span><span class="v">${misPostulaciones().length}</span></div>
          <div class="detail-row"><span class="k">Llamados vigentes</span><span class="v">${publicados().filter(l => l.estado === 'publicado').length}</span></div>
          <div class="detail-row"><span class="k">Rubros con avisos</span><span class="v">${new Set(publicados().map(l => l.rubro)).size}</span></div>
        </div>
      </div>
      <p style="text-align:center;font-size:.7rem;color:var(--ink-2);padding:10px 20px;">
        LlamadosUY es un simulador con fines demostrativos.<br>Los datos se guardan en este navegador.
      </p>`;
  }

  renderSheet();
  maybePush();
}

/* ── push notification simulada ── */
function maybePush() {
  if (ui.env !== 'telefono') return;
  const unseen = publicados()
    .filter(l => l.estado === 'publicado' && !getSeen().has(l.id) && !ui.pushed.has(l.id))
    .sort((a, b) => new Date(b.creadoEn) - new Date(a.creadoEn));
  if (!unseen.length) return;

  const l = unseen[0];
  ui.pushed.add(l.id);
  const el = $('#pushNotif');
  $('#pushTitle').textContent = 'Nuevo llamado publicado';
  $('#pushText').textContent = `${l.titulo} · ${l.organismo}`;
  el.dataset.llamadoId = l.id;
  el.hidden = false;
  clearTimeout(el._t);
  el._t = setTimeout(closePush, 6000);
}
function closePush() {
  const el = $('#pushNotif');
  if (el.hidden) return;
  el.classList.add('closing');
  setTimeout(() => { el.hidden = true; el.classList.remove('closing'); }, 300);
}

/* ── hoja (sheet) dentro del teléfono ── */
function openSheet(sheet) { ui.sheet = sheet; ui.open = {}; renderSheet(); }
function closeSheet() { ui.sheet = null; renderSheet(); }

function markSeen(id) {
  const seen = getSeen();
  if (!seen.has(id)) { seen.add(id); setSeen(seen); renderPhone(); }
}

function renderSheet() {
  const wrap = $('#phoneSheet');
  const body = $('#sheetContent');
  if (!ui.sheet) { wrap.hidden = true; body.innerHTML = ''; return; }
  wrap.hidden = false;

  const l = byId(ui.sheet.id);
  if (!l) { closeSheet(); return; }

  /* detalle del llamado */
  if (ui.sheet.type === 'detail') {
    const tl = timeLeft(l.fechaLimite);
    const yaPostulado = l.postulaciones.length > 0;
    const cerrado = l.estado === 'cerrado' || tl.expired;
    body.innerHTML = `
      <div class="sheet-grip"></div>
      <div class="detail-hero">
        <div class="lc-top" style="margin-bottom:8px">
          <div class="lc-avatar" style="background:${orgColor(l.organismo)}">${orgInitials(l.organismo)}</div>
          <div class="lc-org">${esc(l.organismo)}</div>
        </div>
        <div class="detail-title">${esc(l.titulo)}</div>
        <span class="lc-rubro">${esc(l.rubro)}</span>
        <div class="detail-rows">
          <div class="detail-row"><span class="k">Monto estimado</span><span class="v">${fmtMoney(l.monto)}</span></div>
          <div class="detail-row"><span class="k">Fecha límite</span><span class="v">${fmtDate(l.fechaLimite)} h</span></div>
          <div class="detail-row"><span class="k">Lugar de entrega</span><span class="v">${esc(l.lugar) || '—'}</span></div>
          <div class="detail-row"><span class="k">Estado</span>
            <span class="v ${tl.urgent && !cerrado ? 'lc-urgente' : ''}">${cerrado ? 'Cerrado' : tl.txt}</span></div>
        </div>
      </div>

      <div class="detail-actions">
        <button class="acc-btn" data-section="desc">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>
          Ver llamado completo
          <svg class="chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        ${ui.open.desc ? `
          <div class="collapsible">
            <h4>Llamado completo</h4>
            ${l.descripcion
              ? l.descripcion.split(/\n+/).map(p => `<p>${esc(p)}</p>`).join('')
              : '<p>Sin descripción adicional.</p>'}
          </div>` : ''}

        <button class="acc-btn" data-section="req">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Ver requisitos
          <svg class="chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        ${ui.open.req ? `
          <div class="collapsible">
            <h4>Requisitos principales</h4>
            <ul>${(l.requisitos.length ? l.requisitos : ['Sin requisitos especificados']).map(r => `<li>${esc(r)}</li>`).join('')}</ul>
          </div>` : ''}

        <button class="acc-btn primary" data-action="postular" ${cerrado || yaPostulado ? 'disabled' : ''}>
          ${cerrado ? 'Llamado cerrado'
            : yaPostulado ? 'Ya te postulaste'
            : `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Postularse`}
        </button>
        <button class="acc-btn" data-action="volver" style="justify-content:center;color:var(--ink-2)">Volver</button>
      </div>`;
  }

  /* formulario de postulación */
  if (ui.sheet.type === 'postular') {
    body.innerHTML = `
      <div class="sheet-grip"></div>
      <button class="sheet-back" data-action="volver">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        Volver al llamado
      </button>
      <form class="sheet-form" id="postularForm">
        <h3>Postularse</h3>
        <p class="form-sub">${esc(l.titulo)} · ${esc(l.organismo)}</p>
        <label class="field"><span>Empresa *</span><input name="empresa" required value="Empresa Demo SRL"></label>
        <label class="field"><span>N.º RUPE *</span><input name="rupe" required placeholder="RUPE 21-00000" value="RUPE 21-44890"></label>
        <label class="field"><span>Correo electrónico</span><input name="email" type="email" value="contacto@empresademo.uy"></label>
        <label class="field"><span>Teléfono</span><input name="telefono" value="099 000 000"></label>
        <label class="field"><span>Mensaje / oferta</span><textarea name="mensaje" rows="3" placeholder="Presentá tu propuesta, cotización o comentarios…"></textarea></label>
        <button type="submit" class="acc-btn primary" style="border:0;width:100%">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          Enviar postulación
        </button>
      </form>`;
  }

  /* confirmación */
  if (ui.sheet.type === 'ok') {
    body.innerHTML = `
      <div class="sheet-grip"></div>
      <div class="success-box">
        <div class="ok-circle">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h3>Postulación enviada</h3>
        <p>El organismo recibió tu postulación para<br><b>${esc(l.titulo)}</b>.<br>Podés seguirla en «Postulaciones».</p>
        <div style="margin-top:18px">
          <button class="acc-btn primary" data-action="misPostulaciones" style="border:0;width:100%;justify-content:center">Ver mis postulaciones</button>
          <button class="acc-btn" data-action="volverFeed" style="width:100%;justify-content:center;margin-top:8px;color:var(--ink-2)">Seguir explorando</button>
        </div>
      </div>`;
  }
}

/* ══════════════════════════ VISTA ADMIN ══════════════════════════ */

function renderAdmin() {
  /* stats */
  const pubs = db.llamados.filter(l => l.estado === 'publicado');
  const totalPost = db.llamados.reduce((n, l) => n + l.postulaciones.length, 0);
  const prox = pubs.filter(l => new Date(l.fechaLimite) > Date.now())
    .sort((a, b) => new Date(a.fechaLimite) - new Date(b.fechaLimite))[0];
  const totalPostSem = db.llamados.flatMap(l => l.postulaciones)
    .filter(p => Date.now() - new Date(p.fecha) < 7 * 86400000).length;

  $('#statGrid').innerHTML = `
    <div class="stat-card accent"><div class="s-label">Llamados activos</div><div class="s-value">${pubs.length}</div><div class="s-foot">visibles para empresas</div></div>
    <div class="stat-card"><div class="s-label">Postulaciones</div><div class="s-value">${totalPost}</div><div class="s-foot">${totalPostSem} en los últimos 7 días</div></div>
    <div class="stat-card"><div class="s-label">Borradores</div><div class="s-value">${db.llamados.filter(l => l.estado === 'borrador').length}</div><div class="s-foot">sin publicar</div></div>
    <div class="stat-card"><div class="s-label">Próximo a vencer</div><div class="s-value" style="font-size:1.05rem;line-height:1.9rem">${prox ? esc(timeLeft(prox.fechaLimite).txt) : '—'}</div><div class="s-foot">${prox ? esc(prox.titulo) : 'sin llamados vigentes'}</div></div>`;

  /* filtros */
  const filters = [['todos', 'Todos'], ['publicado', 'Publicados'], ['borrador', 'Borradores'], ['cerrado', 'Cerrados']];
  $('#adminFilters').innerHTML = filters.map(([k, label]) =>
    `<button class="filter-btn ${ui.adminFilter === k ? 'active' : ''}" data-filter="${k}">${label}</button>`).join('');

  /* tabla */
  const rows = db.llamados
    .filter(l => ui.adminFilter === 'todos' || l.estado === ui.adminFilter)
    .sort((a, b) => new Date(b.creadoEn) - new Date(a.creadoEn));

  $('#adminRows').innerHTML = rows.length === 0
    ? `<tr class="empty-row"><td colspan="7">No hay llamados en esta vista. Publicá el primero con «Publicar llamado».</td></tr>`
    : rows.map(l => {
        const tl = timeLeft(l.fechaLimite);
        return `
        <tr>
          <td><div class="t-title">${esc(l.titulo)}</div><div class="t-org">${esc(l.organismo)}</div></td>
          <td><span class="t-rubro">${esc(l.rubro)}</span></td>
          <td class="t-monto">${fmtMoney(l.monto)}</td>
          <td class="t-fecha">${fmtDateShort(l.fechaLimite)}<small>${l.estado !== 'cerrado' ? esc(tl.txt) : 'finalizado'}</small></td>
          <td><span class="estado ${l.estado}">${l.estado}</span></td>
          <td><button class="post-count" data-posts="${l.id}">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            ${l.postulaciones.length}
          </button></td>
          <td><div class="row-actions">
            ${l.estado === 'borrador' ? `<button class="icon-btn" data-act="publicar" data-id="${l.id}" title="Publicar ahora">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>` : ''}
            ${l.estado === 'publicado' ? `<button class="icon-btn" data-act="cerrar" data-id="${l.id}" title="Cerrar llamado">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg></button>` : ''}
            ${l.estado === 'cerrado' ? `<button class="icon-btn" data-act="reabrir" data-id="${l.id}" title="Republicar llamado">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg></button>` : ''}
            <button class="icon-btn" data-act="editar" data-id="${l.id}" title="Editar">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg></button>
            <button class="icon-btn danger" data-act="eliminar" data-id="${l.id}" title="Eliminar">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
          </div></td>
        </tr>`;
      }).join('');

  /* datalist de rubros */
  $('#rubrosList').innerHTML = [...new Set(db.llamados.map(l => l.rubro))]
    .map(r => `<option value="${esc(r)}">`).join('');
}

/* ── drawer formulario ── */
function openDrawer(editId = null) {
  ui.editingId = editId;
  const f = $('#llamadoForm');
  f.reset();
  $('#reqList').innerHTML = '';
  $('#drawerTitle').textContent = editId ? 'Editar llamado' : 'Publicar llamado';

  const l = editId ? byId(editId) : null;
  if (l) {
    f.titulo.value = l.titulo;
    f.organismo.value = l.organismo;
    f.rubro.value = l.rubro;
    f.monto.value = l.monto ?? '';
    f.fechaLimite.value = isoToLocalInput(l.fechaLimite);
    f.lugar.value = l.lugar || '';
    f.descripcion.value = l.descripcion || '';
    (l.requisitos.length ? l.requisitos : ['']).forEach(addReqRow);
  } else {
    f.organismo.value = 'Intendencia Departamental de Flores';
    const def = new Date(Date.now() + 14 * 86400000);
    def.setMinutes(def.getMinutes() - def.getTimezoneOffset());
    f.fechaLimite.value = def.toISOString().slice(0, 16);
    addReqRow('Estar inscripto en RUPE');
    addReqRow('Presentar cotización');
  }
  $('#drawerOverlay').hidden = false;
}
function closeDrawer() { $('#drawerOverlay').hidden = true; ui.editingId = null; }

function addReqRow(val = '') {
  const row = document.createElement('div');
  row.className = 'req-row';
  row.innerHTML = `<input name="req" placeholder="Ej.: Estar inscripto en RUPE" value="${esc(val)}">
    <button type="button" class="req-del" title="Quitar">✕</button>`;
  row.querySelector('.req-del').onclick = () => row.remove();
  $('#reqList').appendChild(row);
}

function submitLlamado(asDraft) {
  const f = $('#llamadoForm');
  if (!asDraft && !f.reportValidity()) return;
  if (asDraft && !f.titulo.value.trim()) { f.titulo.focus(); toast('El título es obligatorio'); return; }

  const data = {
    titulo: f.titulo.value.trim(),
    organismo: f.organismo.value.trim() || 'Organismo',
    rubro: f.rubro.value.trim() || 'General',
    monto: f.monto.value === '' ? null : Number(f.monto.value),
    fechaLimite: f.fechaLimite.value ? new Date(f.fechaLimite.value).toISOString() : new Date(Date.now() + 14 * 86400000).toISOString(),
    lugar: f.lugar.value.trim(),
    descripcion: f.descripcion.value.trim(),
    requisitos: $$('input[name="req"]', f).map(i => i.value.trim()).filter(Boolean),
  };

  if (ui.editingId) {
    Object.assign(byId(ui.editingId), data);
    toast('Llamado actualizado');
  } else {
    db.llamados.unshift({
      id: uid(), ...data,
      estado: asDraft ? 'borrador' : 'publicado',
      creadoEn: new Date().toISOString(),
      postulaciones: [],
    });
    toast(asDraft ? 'Borrador guardado' : 'Llamado publicado · las empresas ya fueron notificadas');
  }
  save();
  closeDrawer();
  render();
}

/* ── drawer postulaciones ── */
function openPosts(id) {
  const l = byId(id);
  if (!l) return;
  ui.postLlamadoId = id;
  $('#postTitle').textContent = `Postulaciones · ${l.titulo}`;
  $('#postBody').innerHTML = l.postulaciones.length === 0
    ? `<div class="empty-state"><p>Este llamado aún no recibió postulaciones.</p></div>`
    : l.postulaciones
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .map(p => `
          <div class="post-item">
            <div class="pi-head"><span class="pi-empresa">${esc(p.empresa)}</span><span class="pi-fecha">${fmtDate(p.fecha)}</span></div>
            <div class="pi-meta">
              <span class="pi-rupe">${esc(p.rupe)}</span>
              ${p.email ? `<span>${esc(p.email)}</span>` : ''}
              ${p.telefono ? `<span>${esc(p.telefono)}</span>` : ''}
            </div>
            ${p.mensaje ? `<div class="pi-msg">${esc(p.mensaje)}</div>` : ''}
          </div>`).join('');
  $('#postOverlay').hidden = false;
}

/* ── confirmación genérica ── */
let confirmCb = null;
function askConfirm(text, cb) {
  $('#confirmText').textContent = text;
  confirmCb = cb;
  $('#confirmOverlay').hidden = false;
}

/* ══════════════════════════ render global ══════════════════════════ */
function render() {
  if (ui.env === 'telefono') renderPhone(); else renderAdmin();
}

/* ══════════════════════════ eventos ══════════════════════════ */

$('#btnEnvPhone').onclick = () => setEnv('telefono');
$('#btnEnvAdmin').onclick = () => setEnv('admin');

/* delegación: feed del teléfono */
$('#phoneContent').addEventListener('click', e => {
  const chip = e.target.closest('.chip');
  if (chip) { ui.rubroFilter = chip.dataset.rubro; renderPhone(); return; }
  const card = e.target.closest('[data-open]');
  if (card) { markSeen(card.dataset.open); openSheet({ type: 'detail', id: card.dataset.open }); }
});

/* delegación: sheet del teléfono */
$('#phoneSheet').addEventListener('click', e => {
  if (e.target.id === 'phoneSheet') { closeSheet(); return; }
  const sec = e.target.closest('[data-section]');
  if (sec) { const s = sec.dataset.section; ui.open[s] = !ui.open[s]; renderSheet(); return; }
  const act = e.target.closest('[data-action]');
  if (!act) return;
  const a = act.dataset.action;
  if (a === 'volver' || a === 'volverFeed') closeSheet();
  if (a === 'postular') openSheet({ type: 'postular', id: ui.sheet.id });
  if (a === 'misPostulaciones') { closeSheet(); ui.phoneTab = 'postulaciones'; renderPhone(); }
});

$('#phoneSheet').addEventListener('submit', e => {
  if (e.target.id !== 'postularForm') return;
  e.preventDefault();
  const f = e.target;
  const l = byId(ui.sheet.id);
  l.postulaciones.push({
    id: uid(),
    empresa: f.empresa.value.trim(),
    rupe: f.rupe.value.trim(),
    email: f.email.value.trim(),
    telefono: f.telefono.value.trim(),
    mensaje: f.mensaje.value.trim(),
    fecha: new Date().toISOString(),
  });
  save();
  openSheet({ type: 'ok', id: l.id });
});

/* tab bar del teléfono */
$$('.tab-btn').forEach(b => b.onclick = () => { ui.phoneTab = b.dataset.tab; renderPhone(); });

/* campana: marca todo como visto */
$('#bellBtn').onclick = () => {
  const seen = getSeen();
  publicados().forEach(l => seen.add(l.id));
  setSeen(seen);
  renderPhone();
};

/* push notification */
$('#pushNotif').onclick = () => {
  const id = $('#pushNotif').dataset.llamadoId;
  closePush();
  if (id && byId(id)) { markSeen(id); openSheet({ type: 'detail', id }); }
};

/* admin */
$('#btnNew').onclick = () => openDrawer();
$('#drawerClose').onclick = closeDrawer;
$('#drawerOverlay').addEventListener('click', e => { if (e.target.id === 'drawerOverlay') closeDrawer(); });
$('#btnAddReq').onclick = () => addReqRow();
$('#btnSaveDraft').onclick = () => submitLlamado(true);
$('#llamadoForm').addEventListener('submit', e => { e.preventDefault(); submitLlamado(false); });

$('#adminFilters').onclick = e => {
  const b = e.target.closest('[data-filter]');
  if (b) { ui.adminFilter = b.dataset.filter; renderAdmin(); }
};

$('#adminRows').addEventListener('click', e => {
  const posts = e.target.closest('[data-posts]');
  if (posts) { openPosts(posts.dataset.posts); return; }
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const l = byId(btn.dataset.id);
  if (!l) return;

  switch (btn.dataset.act) {
    case 'editar':   openDrawer(l.id); break;
    case 'publicar': l.estado = 'publicado'; l.creadoEn = new Date().toISOString(); save(); renderAdmin(); toast('Llamado publicado'); break;
    case 'cerrar':   askConfirm(`¿Cerrar «${l.titulo}»? Las empresas ya no podrán postularse.`, () => { l.estado = 'cerrado'; save(); renderAdmin(); toast('Llamado cerrado'); }); break;
    case 'reabrir':  l.estado = 'publicado'; l.fechaLimite = new Date(Date.now() + 14 * 86400000).toISOString(); save(); renderAdmin(); toast('Llamado republicado (+14 días)'); break;
    case 'eliminar': askConfirm(`¿Eliminar «${l.titulo}» y sus ${l.postulaciones.length} postulaciones?`, () => { db.llamados = db.llamados.filter(x => x.id !== l.id); save(); renderAdmin(); toast('Llamado eliminado'); }); break;
  }
});

$('#postClose').onclick = () => ($('#postOverlay').hidden = true);
$('#postOverlay').addEventListener('click', e => { if (e.target.id === 'postOverlay') e.currentTarget.hidden = true; });

$('#confirmCancel').onclick = () => ($('#confirmOverlay').hidden = true);
$('#confirmOverlay').addEventListener('click', e => { if (e.target.id === 'confirmOverlay') e.currentTarget.hidden = true; });
$('#confirmOk').onclick = () => { $('#confirmOverlay').hidden = true; confirmCb && confirmCb(); };

$('#btnReset').onclick = () =>
  askConfirm('¿Restablecer los datos de demostración? Se perderán los cambios.', () => {
    db = seedData(); save();
    localStorage.removeItem(SEEN_KEY);
    ui.pushed.clear();
    toast('Datos de demostración restablecidos');
    render();
  });

/* escape cierra overlays */
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!$('#confirmOverlay').hidden) $('#confirmOverlay').hidden = true;
  else if (!$('#postOverlay').hidden) $('#postOverlay').hidden = true;
  else if (!$('#drawerOverlay').hidden) closeDrawer();
  else if (ui.sheet) closeSheet();
});

/* sync entre pestañas: si otra pestaña modifica los datos, reflejarlo */
window.addEventListener('storage', e => {
  if (e.key !== DB_KEY && e.key !== SEEN_KEY) return;
  load();
  render();
});

/* reloj de la barra de estado del teléfono */
function tickClock() {
  $('#phoneClock').textContent = new Date().toLocaleTimeString('es-UY', { hour: 'numeric', minute: '2-digit' }).replace(/\s/g, '');
}
tickClock();
setInterval(tickClock, 30000);

/* ── arranque ── */
load();
const vistaParam = new URL(location.href).searchParams.get('vista');
setEnv(vistaParam === 'admin' ? 'admin' : 'telefono', { url: false });
