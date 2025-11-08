// Claves de almacenamiento
const STORAGE_KEYS = {
  materias: 'materias',
  productos: 'productos'
};

// Estado en memoria
let materias = [];
let productos = [];

// Estado temporal para formularios
let materiaEditIndex = null;
let productoEditIndex = null;
let compTemp = []; // [{materiaId, cantidad}]

// Utilidades
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function toNumber(value) {
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

function money(n) {
  if (!Number.isFinite(n)) return '-';
  return `$ ${n.toFixed(2)}`;
}

function loadFromStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function showAlert(type, msg) {
  const box = $('#alert');
  if (!msg) { box.innerHTML = ''; return; }
  const cls = type === 'error' ? 'alert error' : 'alert success';
  box.innerHTML = `<div class="${cls}">${msg}</div>`;
}

function resetMateriaForm() {
  $('#materia-form').reset();
  $('#materiaEditIndex').value = '';
  materiaEditIndex = null;
}

function resetProductoForm() {
  $('#producto-form').reset();
  $('#productoEditIndex').value = '';
  productoEditIndex = null;
  compTemp = [];
  renderCompList();
}

function findMateria(id) {
  return materias.find(m => String(m.id) === String(id));
}

function isMateriaUsed(id) {
  const usedBy = productos.filter(p => p.composicion?.some(c => String(c.materiaId) === String(id)));
  return usedBy.map(p => p.nombre);
}

// Renderizado
function renderMateriasTable() {
  const tbody = $('#materias-tbody');
  tbody.innerHTML = materias.map((m, idx) => `
    <tr>
      <td>${m.id}</td>
      <td>${m.nombre}</td>
      <td>${money(m.costoUnitario)}</td>
      <td>${m.unidad || ''}</td>
      <td>
        <button class="btn" data-action="edit-materia" data-index="${idx}">Editar</button>
        <button class="btn danger" data-action="del-materia" data-index="${idx}">Eliminar</button>
      </td>
    </tr>
  `).join('');
}

function renderProductosTable() {
  const tbody = $('#productos-tbody');
  tbody.innerHTML = productos.map((p, idx) => {
    const compTxt = (p.composicion || []).map(c => {
      const m = findMateria(c.materiaId);
      const name = m ? m.nombre : `#${c.materiaId} (inexistente)`;
      return `${name}: ${c.cantidad}`;
    }).join(', ');
    return `
      <tr>
        <td>${p.id}</td>
        <td>${p.nombre}</td>
        <td>${money(p.manoObra)}</td>
        <td>${compTxt}</td>
        <td>
          <button class="btn" data-action="edit-producto" data-index="${idx}">Editar</button>
          <button class="btn danger" data-action="del-producto" data-index="${idx}">Eliminar</button>
        </td>
      </tr>`;
  }).join('');
}

function renderMateriaSelects() {
  const sel = $('#comp-materia');
  const opts = materias.map(m => `<option value="${m.id}">${m.id} - ${m.nombre}</option>`).join('');
  sel.innerHTML = `<option value="" disabled selected>Seleccione</option>${opts}`;
}

function renderProductoSelect() {
  const sel = $('#calculo-producto');
  const opts = productos.map(p => `<option value="${p.id}">${p.id} - ${p.nombre}</option>`).join('');
  sel.innerHTML = `<option value="" disabled selected>Seleccione producto</option>${opts}`;
}

function renderCompList() {
  const tbody = $('#comp-tbody');
  tbody.innerHTML = compTemp.map((c, idx) => {
    const m = findMateria(c.materiaId);
    const name = m ? `${m.id} - ${m.nombre}` : `#${c.materiaId} (inexistente)`;
    return `
      <tr>
        <td>${name}</td>
        <td>${c.cantidad}</td>
        <td><button class="btn danger" data-action="del-comp" data-index="${idx}">Quitar</button></td>
      </tr>`;
  }).join('');
}

// Cálculo de costos
function calcularCostoUnitario(producto) {
  const comp = producto.composicion || [];
  let suma = 0;
  for (const c of comp) {
    const m = findMateria(c.materiaId);
    if (!m) return { valido: false, error: `Materia prima inexistente: ${c.materiaId}` };
    const parcial = toNumber(c.cantidad) * toNumber(m.costoUnitario);
    suma += parcial;
  }
  suma += toNumber(producto.manoObra) || 0;
  return { valido: true, total: suma };
}

function renderResultado(producto, cantidad) {
  const out = $('#resultado');
  if (!producto) { out.innerHTML = ''; return; }

  const compRows = (producto.composicion || []).map(c => {
    const m = findMateria(c.materiaId);
    if (!m) {
      return `<div class="desglose">Falta materia: ${c.materiaId}</div>`;
    }
    const parcial = toNumber(c.cantidad) * toNumber(m.costoUnitario);
    return `<div class="desglose">${m.nombre} — ${c.cantidad} × ${money(m.costoUnitario)} = ${money(parcial)}</div>`;
  }).join('');

  const unit = calcularCostoUnitario(producto);
  if (!unit.valido) {
    out.innerHTML = `<div class="alert error">${unit.error}</div>`;
    return;
  }
  const total = unit.total * cantidad;
  out.innerHTML = `
    <h3>${producto.nombre}</h3>
    ${compRows}
    <div class="desglose">Mano de obra — ${money(producto.manoObra)}</div>
    <hr />
    <p><strong>Costo unitario:</strong> ${money(unit.total)}</p>
    <p><strong>Costo total del lote (${cantidad}):</strong> ${money(total)}</p>
  `;
}

// Eventos Materias
function onMateriaSubmit(e){
  e.preventDefault();
  showAlert();
  const id = $('#materia-id').value.trim();
  const nombre = $('#materia-nombre').value.trim();
  const costoUnitario = toNumber($('#materia-costo').value);
  const unidad = $('#materia-unidad').value.trim();

  if (!id || !nombre || !Number.isFinite(costoUnitario) || costoUnitario < 0) {
    showAlert('error', 'Datos inválidos en materia. Revise ID, Nombre y Costo >= 0.');
    return;
  }

  const materia = { id, nombre, costoUnitario, unidad };
  if (materiaEditIndex === null) {
    // ID único
    if (materias.some(m => String(m.id) === String(id))) {
      showAlert('error', `Ya existe una materia con ID "${id}".`);
      return;
    }
    materias.push(materia);
  } else {
    // Si cambió el ID, validar unicidad
    const prevId = materias[materiaEditIndex].id;
    if (String(prevId) !== String(id) && materias.some(m => String(m.id) === String(id))) {
      showAlert('error', `Ya existe una materia con ID "${id}".`);
      return;
    }
    materias[materiaEditIndex] = materia;
  }

  saveToStorage(STORAGE_KEYS.materias, materias);
  renderMateriasTable();
  renderMateriaSelects();
  renderProductosTable(); // para refrescar nombres en listado
  renderProductoSelect();
  resetMateriaForm();
  showAlert('success', 'Materia guardada correctamente.');
}

function onMateriasTableClick(e){
  const btn = e.target.closest('button');
  if (!btn) return;
  const idx = toNumber(btn.dataset.index);
  const action = btn.dataset.action;
  if (!Number.isInteger(idx)) return;

  if (action === 'edit-materia') {
    const m = materias[idx];
    if (!m) return;
    $('#materia-id').value = m.id;
    $('#materia-nombre').value = m.nombre;
    $('#materia-costo').value = m.costoUnitario;
    $('#materia-unidad').value = m.unidad || '';
    materiaEditIndex = idx;
    $('#materiaEditIndex').value = String(idx);
  }

  if (action === 'del-materia') {
    const m = materias[idx];
    if (!m) return;
    const usedBy = isMateriaUsed(m.id);
    if (usedBy.length) {
      showAlert('error', `No se puede eliminar. Usada por: ${usedBy.join(', ')}`);
      return;
    }
    materias.splice(idx, 1);
    saveToStorage(STORAGE_KEYS.materias, materias);
    renderMateriasTable();
    renderMateriaSelects();
    renderProductosTable();
    renderProductoSelect();
    showAlert('success', 'Materia eliminada.');
    if (materiaEditIndex === idx) resetMateriaForm();
  }
}

// Eventos Productos
function onProductoSubmit(e){
  e.preventDefault();
  showAlert();
  const id = $('#producto-id').value.trim();
  const nombre = $('#producto-nombre').value.trim();
  const manoObra = toNumber($('#producto-mano-obra').value);

  if (!id || !nombre || !Number.isFinite(manoObra) || manoObra < 0) {
    showAlert('error', 'Datos inválidos en producto. Revise ID, Nombre y Mano de obra >= 0.');
    return;
  }
  if (!compTemp.length) {
    showAlert('error', 'Agregue al menos una materia a la composición.');
    return;
  }
  // Validar que todas las materias existan
  for (const c of compTemp) {
    if (!findMateria(c.materiaId)) {
      showAlert('error', `La composición referencia materia inexistente: ${c.materiaId}`);
      return;
    }
    if (!(toNumber(c.cantidad) > 0)) {
      showAlert('error', 'Las cantidades en la composición deben ser > 0.');
      return;
    }
  }

  const producto = { id, nombre, manoObra, composicion: compTemp.map(c => ({...c})) };

  if (productoEditIndex === null) {
    if (productos.some(p => String(p.id) === String(id))) {
      showAlert('error', `Ya existe un producto con ID "${id}".`);
      return;
    }
    productos.push(producto);
  } else {
    const prevId = productos[productoEditIndex].id;
    if (String(prevId) !== String(id) && productos.some(p => String(p.id) === String(id))) {
      showAlert('error', `Ya existe un producto con ID "${id}".`);
      return;
    }
    productos[productoEditIndex] = producto;
  }

  saveToStorage(STORAGE_KEYS.productos, productos);
  renderProductosTable();
  renderProductoSelect();
  resetProductoForm();
  showAlert('success', 'Producto guardado correctamente.');
}

function onProductosTableClick(e){
  const btn = e.target.closest('button');
  if (!btn) return;
  const idx = toNumber(btn.dataset.index);
  const action = btn.dataset.action;
  if (!Number.isInteger(idx)) return;

  if (action === 'edit-producto') {
    const p = productos[idx];
    if (!p) return;
    $('#producto-id').value = p.id;
    $('#producto-nombre').value = p.nombre;
    $('#producto-mano-obra').value = p.manoObra;
    compTemp = (p.composicion || []).map(c => ({...c}));
    renderCompList();
    productoEditIndex = idx;
    $('#productoEditIndex').value = String(idx);
  }

  if (action === 'del-producto') {
    productos.splice(idx, 1);
    saveToStorage(STORAGE_KEYS.productos, productos);
    renderProductosTable();
    renderProductoSelect();
    showAlert('success', 'Producto eliminado.');
    if (productoEditIndex === idx) resetProductoForm();
  }
}

// Composición
function onAgregarComp(){
  showAlert();
  const materiaId = $('#comp-materia').value;
  const cantidad = toNumber($('#comp-cantidad').value);
  if (!materiaId) { showAlert('error', 'Seleccione una materia.'); return; }
  if (!(cantidad > 0)) { showAlert('error', 'Cantidad debe ser > 0.'); return; }
  const existente = compTemp.find(c => String(c.materiaId) === String(materiaId));
  if (existente) existente.cantidad = toNumber(existente.cantidad) + cantidad;
  else compTemp.push({ materiaId, cantidad });
  $('#comp-cantidad').value = '';
  renderCompList();
}

function onCompTableClick(e){
  const btn = e.target.closest('button');
  if (!btn) return;
  const idx = toNumber(btn.dataset.index);
  const action = btn.dataset.action;
  if (action === 'del-comp' && Number.isInteger(idx)) {
    compTemp.splice(idx, 1);
    renderCompList();
  }
}

// Cálculo formulario
function onCalculoSubmit(e){
  e.preventDefault();
  showAlert();
  const prodId = $('#calculo-producto').value;
  const cantidad = Math.floor(toNumber($('#calculo-cantidad').value));
  if (!prodId) { showAlert('error', 'Seleccione un producto.'); return; }
  if (!(Number.isInteger(cantidad) && cantidad >= 0)) { showAlert('error', 'Cantidad debe ser un entero ≥ 0.'); return; }
  const p = productos.find(x => String(x.id) === String(prodId));
  if (!p) { showAlert('error', 'Producto inexistente.'); return; }
  renderResultado(p, cantidad);
}

// Inicialización
function init(){
  materias = loadFromStorage(STORAGE_KEYS.materias);
  productos = loadFromStorage(STORAGE_KEYS.productos);

  // Render inicial
  renderMateriasTable();
  renderProductosTable();
  renderMateriaSelects();
  renderProductoSelect();

  // Listeners Materias
  $('#materia-form').addEventListener('submit', onMateriaSubmit);
  $('#materia-limpiar').addEventListener('click', () => { resetMateriaForm(); showAlert(); });
  $('#materias-tbody').addEventListener('click', onMateriasTableClick);

  // Listeners Productos
  $('#producto-form').addEventListener('submit', onProductoSubmit);
  $('#producto-limpiar').addEventListener('click', () => { resetProductoForm(); showAlert(); });
  $('#productos-tbody').addEventListener('click', onProductosTableClick);
  $('#comp-agregar').addEventListener('click', onAgregarComp);
  $('#comp-tbody').addEventListener('click', onCompTableClick);

  // Cálculo
  $('#calculo-form').addEventListener('submit', onCalculoSubmit);
}

document.addEventListener('DOMContentLoaded', init);

// Datos de ejemplo
function seedDemo(){
  const hasData = materias.length || productos.length;
  if (hasData) {
    const ok = confirm('Esto reemplazará los catálogos actuales por datos de ejemplo. ¿Continuar?');
    if (!ok) return;
  }

  materias = [
    { id: 'MP01', nombre: 'Tuerca 01', costoUnitario: 10, unidad: 'u' },
    { id: 'MP02', nombre: 'Tornillo 01', costoUnitario: 20, unidad: 'u' },
    { id: 'MP03', nombre: 'Arandela 01', costoUnitario: 5, unidad: 'u' }
  ];

  productos = [
    {
      id: 'PT01',
      nombre: 'Bulón 01',
      manoObra: 150, // 3 × $50, incorporado como costo por unidad
      composicion: [
        { materiaId: 'MP01', cantidad: 1 },
        { materiaId: 'MP02', cantidad: 1 },
        { materiaId: 'MP03', cantidad: 2 }
      ]
    }
  ];

  saveToStorage(STORAGE_KEYS.materias, materias);
  saveToStorage(STORAGE_KEYS.productos, productos);
  renderMateriasTable();
  renderProductosTable();
  renderMateriaSelects();
  renderProductoSelect();
  showAlert('success', 'Datos de ejemplo cargados.');
}

// botón de ejemplo (atado tras DOMContentLoaded por seguridad)
window.addEventListener('load', () => {
  const btn = document.getElementById('seed-demo');
  if (btn) btn.addEventListener('click', seedDemo);
});
