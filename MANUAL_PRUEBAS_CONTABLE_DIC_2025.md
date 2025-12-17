# Manual de Pruebas Contables (QA) — Diciembre 2025

## 1) Objetivo
Validar que el sistema contable registra operaciones y genera estados financieros correctamente para el período **Diciembre 2025**.

Se debe confirmar:
- Integridad de asientos (débitos = créditos) y uso de asientos **posteados**.
- Consistencia de clasificación de cuentas (Activos/Pasivos/Patrimonio/Ingresos/Costos/Gastos).
- Estados financieros que **cuadran** según principios contables:
  - **Balance General:** `Activos = Pasivos + Patrimonio + Resultado`
  - **Estado de Resultados:** `Ingresos - Costos - Gastos = Utilidad Neta`
  - **Costos de Ventas:** `InvInicial + Compras - InvFinal = Costo de Venta`
  - **Flujo de Efectivo:** `Neto = Cierre - Apertura`


## 2) Alcance
- **Período único:** `2025-12-01` a `2025-12-31`
- Solo se consideran **asientos posteados** (`status = posted`) para la verificación.


## 3) Requisitos previos (setup)
Antes de ejecutar cualquier prueba, validar lo siguiente:

### 3.1 Configuración contable
Ir a: **Configuración/Settings → Contabilidad → Cuentas Contables por Defecto**

Confirmar:
- **Cuenta de Cuentas por Cobrar (Clientes)** configurada (ej. 110101)
- **Cuenta de Ventas** configurada (ej. 4001)
- **Cuenta de ITBIS por Pagar** configurada (ej. 210201)
- **Cuenta de Cuentas por Pagar (Proveedores)** configurada (ej. 200101)
- **Cuenta de Banco/Caja por defecto para pagos a proveedores** configurada (ej. 100101)

Criterio:
- Si alguna cuenta por defecto crítica está vacía, **detener prueba** y reportar.

### 3.2 Catálogo de cuentas
Confirmar:
- Las cuentas están activas.
- Los tipos (`type`) de cuentas están correctamente asignados (asset/liability/equity/income/cost/expense).


## 4) Convenciones para la prueba (para evitar sesgos)
- Registrar transacciones **dentro de Diciembre 2025**.
- Verificar que las operaciones generen o impacten asientos **posteados**.
- Mantener consistencia de cuentas típicas:
  - Caja/Bancos: 10xx / 11xx
  - CxC: 1101xx
  - Inventarios: 12xx
  - ITBIS por pagar: 21xxxx
  - CxP: 2001xx
  - Ventas: 4xxx
  - Costos: 5xxx
  - Gastos: 6xxx


## 5) Pruebas mínimas de operaciones (todas en Dic 2025)

### A) Venta a crédito + Cobro
Objetivo: validar Ventas, ITBIS, CxC y cobro.

Pasos:
1. Crear una **Factura de Venta** (tipo crédito) en Diciembre 2025.
2. Confirmar guardado y totales.
3. Registrar un **Cobro** a esa factura en Diciembre 2025.
4. Verificar que el asiento del cobro refleje:
   - **Dr Caja/Banco**
   - **Cr CxC**

Resultado esperado:
- Baja CxC y sube Caja/Banco según el monto cobrado.


### B) Compra a crédito (CxP) + Pago
Objetivo: validar CxP, inventario/gasto y pago.

Pasos:
1. Crear una **Factura de Proveedor** (a crédito) en Diciembre 2025.
   - Si corresponde a inventario, seleccionar el ítem de inventario.
2. Verificar impacto contable (según configuración):
   - Inventario: **Dr Inventario (12xx)** / **Cr CxP (2001xx)**
   - ITBIS compras (si aplica): **Dr ITBIS en compras**
3. Registrar un **Pago a Proveedor** en Diciembre 2025.
4. Verificar asiento del pago:
   - **Dr CxP**
   - **Cr Caja/Banco** (debe usar la cuenta por defecto configurada, ej. 100101)

Resultado esperado:
- Baja CxP y baja Caja/Banco por el pago.


### C) Asiento Manual (Diario)
Objetivo: validar que el diario permite registrar asientos balanceados.

Pasos:
1. Crear un asiento simple en Diciembre 2025:
   - **Dr 100101 (Caja)**
   - **Cr 3xxx (Capital / Patrimonio)**
2. Postear.

Resultado esperado:
- Débitos = créditos.
- El mayor de Caja sube y el capital sube.


## 6) Validación de Estados Financieros (Dic 2025)
Ir a: **Contabilidad → Estados Financieros**
Seleccionar **Diciembre 2025**.

### A) Balance General
Validar:
- No debe aparecer banner: **“Advertencia: Balance no cuadra”**
- Debe cumplirse:
  - `Activos = Pasivos + Patrimonio + Resultado`

### B) Estado de Resultados
Validar:
- `Utilidad Neta = Ingresos - Costos - Gastos`
- La **Utilidad Neta** debe coincidir con “Beneficios del período actual” en el Balance.

### C) Estado de Costos de Ventas
Validar:
- `InvInicial + Compras - InvFinal = Costo de Venta`
- Debe conciliar con costos usados en Resultados.

Criterio visual:
- No debe aparecer banner: **“Advertencia: Costos no concilian”**

### D) Estado de Gastos G. y Adm.
Validar:
- La suma de categorías (ej. 6001..6005, 6101, 6102 según plan de cuentas) concilia con el total.

Criterio visual:
- No debe aparecer banner: **“Advertencia: Gastos no concilian”**

### E) Flujo de Efectivo
Validar:
- `Neto = Efectivo final - Efectivo inicial`

Criterio visual:
- No debe aparecer banner: **“Advertencia: Flujo de Efectivo no concilia con Caja/Bancos”**


## 7) Formato de reporte de incidencias
Si una prueba falla, reportar:
- Módulo (Ventas / Compras / Cobros / Pagos / Diario / Estados)
- Pasos exactos para reproducir
- Resultado esperado
- Resultado real
- Capturas
- Fecha y período (confirmar Dic 2025)
- Cuenta(s) afectadas (código y nombre)
- ID/Número de asiento (si aplica)
- Diferencia (monto)


## 8) Criterios de aprobación
La prueba se considera aprobada si:
- No aparecen banners de descuadre en Balance/Costos/Gastos/Flujo.
- Las transacciones de Dic 2025 generan asientos consistentes.
- No existen asientos posteados desbalanceados.
