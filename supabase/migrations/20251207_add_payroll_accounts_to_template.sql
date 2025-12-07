  -- Agregar cuentas de pasivos y gastos relacionadas con nómina al catálogo base
-- Estas cuentas estarán disponibles para todos los usuarios al sembrar el catálogo

-- Insertar cuentas de pasivos de nómina en el template (si no existen)
insert into public.chart_accounts_template (code, name, type, level, balance, is_active, description, normal_balance, allow_posting, parent_id)
values
  -- Pasivos Corrientes - Nómina (nivel 2)
  ('2100', 'NÓMINA POR PAGAR', 'liability', 2, 0, true, 'Obligaciones por nómina pendientes de pago', 'credit', false, null),
  
  -- Cuentas de detalle para pasivos de nómina (nivel 3)
  ('2101', 'Salarios por Pagar', 'liability', 3, 0, true, 'Salarios netos pendientes de pago a empleados', 'credit', true, null),
  ('2102', 'Retenciones TSS por Pagar', 'liability', 3, 0, true, 'Retenciones de AFP, SFS y SRL por pagar a la TSS', 'credit', true, null),
  ('2103', 'Otras Deducciones por Pagar', 'liability', 3, 0, true, 'Otras deducciones a empleados pendientes de aplicar', 'credit', true, null),
  ('2104', 'Provisión para Prestaciones Laborales', 'liability', 3, 0, true, 'Provisión para cesantía, preaviso y vacaciones', 'credit', true, null),
  
  -- Subcuentas para retenciones específicas TSS (nivel 4) - opcionales
  ('2102001', 'AFP por Pagar', 'liability', 4, 0, true, 'Retenciones AFP (Administradora de Fondos de Pensiones)', 'credit', true, null),
  ('2102002', 'SFS por Pagar', 'liability', 4, 0, true, 'Retenciones SFS (Seguro Familiar de Salud)', 'credit', true, null),
  ('2102003', 'SRL por Pagar', 'liability', 4, 0, true, 'Retenciones SRL (Seguro de Riesgos Laborales)', 'credit', true, null),
  
  -- Gastos de Nómina (nivel 2)
  ('6100', 'GASTOS DE PERSONAL', 'expense', 2, 0, true, 'Gastos relacionados con el personal y nómina', 'debit', false, null),
  
  -- Cuentas de detalle para gastos de nómina (nivel 3)
  ('6101', 'Sueldos y Salarios', 'expense', 3, 0, true, 'Salarios brutos pagados a empleados', 'debit', true, null),
  ('6102', 'Horas Extras', 'expense', 3, 0, true, 'Pago por horas extras trabajadas', 'debit', true, null),
  ('6103', 'Bonificaciones', 'expense', 3, 0, true, 'Bonificaciones y gratificaciones a empleados', 'debit', true, null),
  ('6104', 'Contribuciones TSS Patronales', 'expense', 3, 0, true, 'Contribuciones del empleador a la TSS (AFP, SFS, SRL)', 'debit', true, null),
  ('6105', 'Regalía Pascual', 'expense', 3, 0, true, 'Regalía pascual pagada a empleados', 'debit', true, null),
  ('6106', 'Vacaciones', 'expense', 3, 0, true, 'Pago de vacaciones a empleados', 'debit', true, null),
  ('6107', 'Cesantía', 'expense', 3, 0, true, 'Pagos por cesantía laboral', 'debit', true, null),
  ('6108', 'Preaviso', 'expense', 3, 0, true, 'Pagos por preaviso de terminación laboral', 'debit', true, null)
on conflict do nothing;

-- Nota: Los valores parent_id se establecerán automáticamente por el sistema
-- al importar el template, basándose en la jerarquía de códigos
