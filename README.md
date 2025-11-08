# Calculadora de costo de lote (HTML/CSS/JS)

Aplicación web sin frameworks para gestionar materias primas y productos terminados, y calcular el costo unitario y el costo total de un lote de producción. Toda la información se guarda en `localStorage` y la interfaz se actualiza en tiempo real sin recargar la página.

## Características
- Materias primas (ABM): agregar, editar, eliminar y listar.
- Productos terminados (ABM): agregar, editar, eliminar y listar.
- Constructor de composición: asigna materias primas con cantidad por unidad de producto.
- Mano de obra por unidad: costo numérico propio de cada producto.
- Cálculo de costos: desglose por materia prima y mano de obra, costo unitario y costo total de lote.
- Validaciones: números no negativos, referencias válidas, IDs únicos, mensajes de error claros.
- Persistencia local: guarda los catálogos en `localStorage`.

## Estructura del proyecto
- `index.html`: vista principal y formularios (Materias, Productos, Cálculo).
- `style.css`: estilos responsivos y accesibles.
- `script.js`: lógica de ABM, renderizado dinámico, almacenamiento y cálculo.

## Modelo de datos
- Materia prima
  ```json
  {
    "id": "MP01",
    "nombre": "Tuerca 01",
    "costoUnitario": 10,
    "unidad": "u"
  }
  ```
- Producto terminado
  ```json
  {
    "id": "PT01",
    "nombre": "Bulón 01",
    "manoObra": 150,
    "composicion": [
      { "materiaId": "MP01", "cantidad": 1 },
      { "materiaId": "MP02", "cantidad": 1 },
      { "materiaId": "MP03", "cantidad": 2 }
    ]
  }
  ```

Notas:
- `manoObra` es el costo por unidad del producto (número ≥ 0).
- `composicion` lista las materias primas y la cantidad usada por unidad del producto.

## Persistencia (localStorage)
- Claves usadas:
  - `materias`: array JSON de materias primas.
  - `productos`: array JSON de productos terminados.
- Si `localStorage` está vacío o corrupto, la app inicializa arrays vacíos.

## Reglas de cálculo
- Costo unitario del producto = suma por cada materia (`cantidad_por_unidad * costoUnitario`) + `manoObra`.
- Costo de lote = `costo unitario * cantidad_a_producir`.

Ejemplo (traducción del enunciado):
- Materias: MP01 $10, MP02 $20, MP03 $5.
- Producto Bulón 01: composición = MP01×1, MP02×1, MP03×2; mano de obra = 3×$50 = $150.
- Costo unitario = 1×10 + 1×20 + 2×5 + 150 = $190.
- Lote de 1000 unidades = 190 × 1000 = $190.000.

## Validaciones
- No se permiten valores negativos para costos ni mano de obra; cantidades en composición deben ser > 0.
- No se pueden guardar productos que referencien materias inexistentes.
- No se puede eliminar una materia si está usada por algún producto (la app indica cuáles).
- IDs de materias y productos deben ser únicos.

## Uso
1. Abrir `index.html` en el navegador.
2. Materias primas:
   - Completar ID, Nombre, Costo, Unidad y presionar "Guardar materia".
   - Editar/Eliminar usando los botones de cada fila.
3. Productos terminados:
   - Completar ID, Nombre, Mano de obra (por unidad).
   - Agregar composición: seleccionar materia, ingresar cantidad (> 0) y "Agregar".
   - "Guardar producto" para persistir cambios.
4. Cálculo de costos:
   - Seleccionar producto y cantidad a producir.
   - Presionar "Calcular costo" para ver desglose, costo unitario y total del lote.

## Puntos de interés en el código
- Render de tablas y selects, y manejo de eventos: `script.js`.
- Cálculo del costo unitario: función `calcularCostoUnitario(...)` en `script.js`.
- Guardado/carga en `localStorage`: utilidades `loadFromStorage` y `saveToStorage` en `script.js`.

## Notas
- La app no usa frameworks; todo es HTML/CSS/JS nativo.
- La interfaz es responsiva y utiliza roles/labels para accesibilidad básica.
