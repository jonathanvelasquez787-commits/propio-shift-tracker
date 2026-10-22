# Redondeo personal de ganancias estimadas

El propietario eligió el 21/10/2026 redondear al minuto siguiente desde los
40 segundos, incluidos: 7:39 → 7 minutos, 7:40 → 8 y 8:00 → 8. Es un criterio
personal para la aplicación, no una regla de facturación confirmada por Propio.

## Alcance

- Las llamadas nuevas en vivo y los pagos sugeridos del formulario manual
  usan el umbral. Un pago escrito por el usuario se conserva.
- El bono Higher Rate de esas llamadas usa los mismos minutos estimados.
- Se guardan los segundos reales de inicio y fin. La duración del registro,
  ACW, horario, adherencia y productividad siguen midiendo el tiempo real.
- Los importes de llamadas anteriores no se recalculan. La marca por llamada
  `payEstimateRule: from-40-seconds` conserva el alcance al recargar y sincronizar.
- Al sustituir una estimación por una fila del historial de Propio, prevalecen
  la duración y el pago importados; la marca de estimación se retira.
- Menos de 40 segundos completos puede producir un pago sugerido de cero:
  se conserva la llamada y se espera la información importada de Propio.

## Evidencia y límites

Correo, contrato y guías accesibles no confirmaron un umbral. Los testimonios
públicos son contradictorios: describen redondeos variables, ajustes posteriores
en Analytics y redondeos hacia abajo. No presentar el umbral personal como oficial.

Regresiones en `tests/super-audit-accounting.test.mjs`: límites antes/en/después
de 40 segundos, precisión frente a duración mostrada con dos decimales, base y
Higher Rate consistentes, recarga, sustitución importada e importe manual explícito.

La verificación compilada usa datos ficticios aislados, ambos idiomas y temas,
y 320/390/1200 px. Sus archivos y capturas permanecen fuera de Git.
