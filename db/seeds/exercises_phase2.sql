-- ============================================================
-- Cauce · Fase 2 · Nuevos ejercicios
-- Perfiles: TLP/Borderline · Bipolar · Depresión · Trauma/TEPT · TOC
-- Ejecutar en Supabase Studio → SQL Editor
-- Idempotente: usa ON CONFLICT (id) DO UPDATE
-- ============================================================

insert into public.exercises (
  id, name_es, short_description_es, category, duration_seconds,
  mobility_required, evidence_level, targets, tags, steps, active
) values
-- ----------------------------------------------------------------
-- 1. STOP skill (DBT) — pausa radical antes de actuar por impulso
-- ----------------------------------------------------------------
(
  'dbt_stop',
  'STOP: pausa antes de actuar',
  'Detente un momento antes de reaccionar. Útil en impulsos intensos.',
  'distress_tolerance',
  150,
  'any',
  'high',
  '["agitado","sobrecargado","ansioso"]'::jsonb,
  '["dbt","impulsividad","crisis"]'::jsonb,
  '[
    {"type":"intro","text":"Vamos a pausar. No tienes que hacer nada ahora.","seconds":10},
    {"type":"prompt","text":"S — Stop. Congela el cuerpo. No muevas manos ni pies.","seconds":20},
    {"type":"prompt","text":"T — Toma aire. Inhala lento por la nariz, exhala por la boca.","seconds":30},
    {"type":"prompt","text":"O — Observa. ¿Qué sientes en el cuerpo? ¿Qué emoción aparece?","seconds":40},
    {"type":"prompt","text":"P — Procede con intención. Pregúntate: ¿qué me serviría hacer ahora?","seconds":40},
    {"type":"outro","text":"Ganaste un segundo entre el impulso y la acción. Eso es suficiente.","seconds":10}
  ]'::jsonb,
  true
),

-- ----------------------------------------------------------------
-- 2. Acción opuesta (DBT) — cambiar emoción cambiando la conducta
-- ----------------------------------------------------------------
(
  'dbt_opposite_action',
  'Acción opuesta',
  'Cuando la emoción no encaja con la situación, actúa al revés de lo que pide.',
  'distress_tolerance',
  180,
  'any',
  'high',
  '["agitado","sobrecargado","bloqueado"]'::jsonb,
  '["dbt","emocion"]'::jsonb,
  '[
    {"type":"intro","text":"Si la emoción no calza con los hechos, actuar al revés la baja.","seconds":15},
    {"type":"prompt","text":"¿Qué estás sintiendo ahora? Ponle un nombre.","seconds":25},
    {"type":"prompt","text":"¿Qué te pide hacer esa emoción? (huir, atacar, esconderte, aislarte)","seconds":30},
    {"type":"prompt","text":"Ahora imagina la acción opuesta. Si te pide aislarte, contacta a alguien. Si te pide gritar, baja la voz.","seconds":40},
    {"type":"prompt","text":"Elige una acción opuesta pequeña que puedas hacer en los próximos 10 minutos.","seconds":50},
    {"type":"outro","text":"No tienes que sentirte distinto. Solo actuar distinto. El resto viene.","seconds":20}
  ]'::jsonb,
  true
),

-- ----------------------------------------------------------------
-- 3. Aceptación radical breve — soltar la pelea con lo que es
-- ----------------------------------------------------------------
(
  'radical_acceptance',
  'Aceptación radical',
  'Cuando pelear con la realidad amplifica el dolor. Aceptar no es aprobar.',
  'distress_tolerance',
  240,
  'any',
  'moderate',
  '["bloqueado","sobrecargado"]'::jsonb,
  '["dbt","aceptacion"]'::jsonb,
  '[
    {"type":"intro","text":"Aceptar no es rendirse ni estar de acuerdo. Es dejar de pelear por un rato.","seconds":20},
    {"type":"prompt","text":"Nombra lo que está pasando sin adornos. Una frase.","seconds":30},
    {"type":"prompt","text":"Nota cómo tu cuerpo se resiste. ¿Dónde está la tensión?","seconds":40},
    {"type":"prompt","text":"Respira lento hacia esa zona. No la cambies, solo acompáñala.","seconds":50},
    {"type":"prompt","text":"Repite en voz baja: ''Esto es lo que hay ahora. Puedo estar con esto''.","seconds":50},
    {"type":"prompt","text":"Si vuelve la resistencia, vuelve a la respiración.","seconds":40},
    {"type":"outro","text":"Aceptar un momento no te obliga a aceptar todos los momentos.","seconds":10}
  ]'::jsonb,
  true
),

-- ----------------------------------------------------------------
-- 4. Media sonrisa + manos dispuestas — regulación por la postura
-- ----------------------------------------------------------------
(
  'half_smile_willing_hands',
  'Media sonrisa y manos abiertas',
  'El cuerpo le avisa al cerebro que no hay peligro. Dos gestos simples.',
  'body',
  180,
  'any',
  'moderate',
  '["agitado","ansioso"]'::jsonb,
  '["dbt","postura"]'::jsonb,
  '[
    {"type":"intro","text":"La postura cambia la emoción. Vamos a probarlo.","seconds":15},
    {"type":"prompt","text":"Relaja la mandíbula. Suelta la lengua del paladar.","seconds":30},
    {"type":"prompt","text":"Sube apenas las comisuras de los labios. Media sonrisa, no más.","seconds":45},
    {"type":"prompt","text":"Apoya las manos en los muslos, palmas hacia arriba. Sin apretar.","seconds":45},
    {"type":"prompt","text":"Respira normal. Mantén la media sonrisa y las manos abiertas.","seconds":35},
    {"type":"outro","text":"Si te sentiste raro, es normal. El cuerpo está aprendiendo otro modo.","seconds":10}
  ]'::jsonb,
  true
),

-- ----------------------------------------------------------------
-- 5. Anclaje de rutina — bipolar / desorganización
-- ----------------------------------------------------------------
(
  'routine_anchor',
  'Anclar al día',
  'Cuando el día se siente borroso o caótico, un mini-anclaje devuelve estructura.',
  'grounding',
  120,
  'any',
  'moderate',
  '["bloqueado","sobrecargado"]'::jsonb,
  '["rutina","bipolar"]'::jsonb,
  '[
    {"type":"intro","text":"Vamos a anclarte al día de hoy.","seconds":10},
    {"type":"prompt","text":"¿Qué día es hoy? Dilo en voz alta.","seconds":20},
    {"type":"prompt","text":"¿Qué hora aproximada? ¿Comiste algo? ¿Dormiste anoche?","seconds":30},
    {"type":"prompt","text":"Elige UNA cosa pequeña para hacer en la próxima hora. Una sola.","seconds":40},
    {"type":"outro","text":"No necesitas planificar el día entero. Un paso a la vez.","seconds":20}
  ]'::jsonb,
  true
),

-- ----------------------------------------------------------------
-- 6. Respiración para dormir — exhalación larga
-- ----------------------------------------------------------------
(
  'sleep_winddown',
  'Respiración para bajar a dormir',
  'Exhalaciones largas activan el sistema parasimpático. Útil antes de acostarse.',
  'breathing',
  300,
  'any',
  'high',
  '["ansioso","sobrecargado","agitado"]'::jsonb,
  '["sueno","bipolar"]'::jsonb,
  '[
    {"type":"intro","text":"Inhala en 4, exhala en 8. Vamos a repetir unas cuantas veces.","seconds":15},
    {"type":"cycle","phases":[{"label":"Inhala","seconds":4},{"label":"Exhala","seconds":8}],"repeat":12},
    {"type":"outro","text":"Deja que el cuerpo siga solo. Si quieres dormir, deja el teléfono.","seconds":15}
  ]'::jsonb,
  true
),

-- ----------------------------------------------------------------
-- 7. Acción pequeña — activación conductual (depresión)
-- ----------------------------------------------------------------
(
  'small_action',
  'Una acción chica',
  'Cuando el cuerpo pesa y nada vale la pena, una micro-acción rompe la inercia.',
  'grounding',
  180,
  'any',
  'high',
  '["bloqueado"]'::jsonb,
  '["depresion","activacion_conductual"]'::jsonb,
  '[
    {"type":"intro","text":"No se trata de sentirte mejor primero. Se trata de moverte primero.","seconds":20},
    {"type":"prompt","text":"Elige una acción que toma menos de 5 minutos. Lavarte la cara, tomar agua, abrir una ventana.","seconds":40},
    {"type":"prompt","text":"No pienses si vale la pena. Solo elige una.","seconds":30},
    {"type":"prompt","text":"Visualízate haciéndola. Paso por paso.","seconds":50},
    {"type":"outro","text":"Ahora, si puedes, hazla. Si no, elige una más pequeña. Sirve igual.","seconds":40}
  ]'::jsonb,
  true
),

-- ----------------------------------------------------------------
-- 8. Tres cosas chicas — observación sin gratitud forzada
-- ----------------------------------------------------------------
(
  'three_small_things',
  'Tres cosas chicas',
  'Observar tres cosas concretas, sin exigirte que sean positivas.',
  'grounding',
  180,
  'any',
  'moderate',
  '["bloqueado","ansioso"]'::jsonb,
  '["depresion","atencion"]'::jsonb,
  '[
    {"type":"intro","text":"Sin exigirte sentir algo bonito. Solo observar.","seconds":15},
    {"type":"prompt","text":"Primera cosa: algo que ves ahora. Descríbelo con detalle.","seconds":45},
    {"type":"prompt","text":"Segunda cosa: algo que tu cuerpo está haciendo sin que lo decidas (respirar, sentarte).","seconds":50},
    {"type":"prompt","text":"Tercera cosa: un sonido pequeño. Cualquiera.","seconds":50},
    {"type":"outro","text":"El mundo sigue estando. Tú también.","seconds":20}
  ]'::jsonb,
  true
),

-- ----------------------------------------------------------------
-- 9. Orientación al presente — trauma / flashback
-- ----------------------------------------------------------------
(
  'present_orientation',
  'Orientarse al presente',
  'Para cuando el pasado se siente demasiado cerca. Devuelve la fecha, el lugar, el cuerpo.',
  'grounding',
  180,
  'any',
  'high',
  '["ansioso","sobrecargado","agitado"]'::jsonb,
  '["trauma","flashback"]'::jsonb,
  '[
    {"type":"intro","text":"Estás a salvo ahora. Vamos a anclar el aquí.","seconds":15},
    {"type":"prompt","text":"Di tu nombre en voz alta. Y la fecha de hoy. Año incluido.","seconds":30},
    {"type":"prompt","text":"Mira alrededor. Nombra 3 objetos que veas. No los que imaginas, los que ves.","seconds":45},
    {"type":"prompt","text":"Siente los pies en el suelo. Los huesos apoyando el peso.","seconds":45},
    {"type":"prompt","text":"Lo que viviste fue antes. Ahora es otro momento, otro cuerpo-ahora.","seconds":30},
    {"type":"outro","text":"Si vuelve la sensación, puedes hacer este ejercicio otra vez.","seconds":15}
  ]'::jsonb,
  true
),

-- ----------------------------------------------------------------
-- 10. Abrazo de mariposa — autoabrazo bilateral
-- ----------------------------------------------------------------
(
  'butterfly_hug',
  'Abrazo de mariposa',
  'Palmadas lentas y alternadas en los hombros. Calma el sistema nervioso.',
  'body',
  180,
  'any',
  'moderate',
  '["ansioso","sobrecargado","agitado"]'::jsonb,
  '["trauma","bilateral"]'::jsonb,
  '[
    {"type":"intro","text":"Cruza los brazos sobre el pecho. Manos en los hombros opuestos.","seconds":20},
    {"type":"prompt","text":"Vas a dar palmaditas lentas, primero una mano, luego la otra. Como alas de mariposa.","seconds":25},
    {"type":"cycle","phases":[{"label":"Izquierda","seconds":1},{"label":"Derecha","seconds":1}],"repeat":60},
    {"type":"outro","text":"Suelta los brazos. Deja que el cuerpo se asiente.","seconds":15}
  ]'::jsonb,
  true
),

-- ----------------------------------------------------------------
-- 11. Surfear la urgencia — TOC / impulsos compulsivos
-- ----------------------------------------------------------------
(
  'urge_surfing',
  'Surfear la urgencia',
  'Las urgencias suben, peakean y bajan. Puedes observarlas sin ceder.',
  'distress_tolerance',
  300,
  'any',
  'high',
  '["agitado","sobrecargado"]'::jsonb,
  '["toc","compulsion","adicciones"]'::jsonb,
  '[
    {"type":"intro","text":"Una urgencia es una ola. Sube, llega al peak, baja. Siempre.","seconds":20},
    {"type":"prompt","text":"Nota la urgencia. ¿Dónde la sientes en el cuerpo?","seconds":40},
    {"type":"prompt","text":"Ponle una intensidad del 0 al 10. Sin juicio.","seconds":30},
    {"type":"prompt","text":"Respira hacia esa zona. No tienes que hacer lo que la urgencia pide.","seconds":60},
    {"type":"prompt","text":"Observa cómo sube un poco... y cómo empieza a bajar. Puede tardar, está bien.","seconds":80},
    {"type":"prompt","text":"Cada vez que resistes la ola, la próxima ola es un poco más chica.","seconds":50},
    {"type":"outro","text":"Ganaste esta ola. Eso es todo lo que necesitas hoy.","seconds":20}
  ]'::jsonb,
  true
)

on conflict (id) do update set
  name_es = excluded.name_es,
  short_description_es = excluded.short_description_es,
  category = excluded.category,
  duration_seconds = excluded.duration_seconds,
  mobility_required = excluded.mobility_required,
  evidence_level = excluded.evidence_level,
  targets = excluded.targets,
  tags = excluded.tags,
  steps = excluded.steps,
  active = excluded.active;
