# Presentación esencial y accesibilidad

Alcance: fase 10, puntos 61–62 y 78–79 del plan integral.

## Comportamiento

- Temas y colores permite activar una vista esencial y elegir si Inicio muestra ganancias/meta, bloques/tabla del día y progreso de Logros. La elección permanece en ajustes sincronizables y respaldables; desactivar restaura los bloques elegidos sin borrar datos ni cambiar las reglas de Logros. Turno, llamadas, navegación, reloj, fecha completa y frase fija permanecen disponibles. No se incorpora otro lenguaje visual: controles y detalles reutilizan los patrones actuales.
- El guardado fallido de preferencias devuelve los controles y apariencia a su valor anterior. No se confunde un cambio en memoria con uno guardado.
- Las siete paletas alternativas ajustan texto secundario, acentos y estados frente a página y ambos paneles. Las comprobaciones verifican contraste mínimo de 4.5:1 para texto normal y texto sobre los seis acentos activos. La frase usa el texto de cada paleta. Los colores originales conservan su identidad.
- A 480 px y menos, el reloj y la fecha completa pasan a su propia fila del mismo layout. La frase sigue fija y completa; ningún ancho pequeño la sustituye por otro mensaje.
- Barra y tarjeta de llamadas consultan el mismo descriptor: llamada en curso, llamada terminada pendiente de guardar y pausa. La llamada pendiente conserva la duración cerrada y ofrece Revisar llamada para recuperar el formulario existente. No hace pasar una llamada pendiente por guardada ni modifica contabilidad.
- El lector recibe cambios de etiqueta de actividad; los cronómetros se marcan como temporizadores sin región viva que anuncie cada segundo. La etiqueta solo se reemplaza cuando cambia.
- Enlace para saltar al contenido de la página activa, regiones principales, foco visible general, restauración de foco al cerrar modales y protección frente a un enfoque diferido que intente alcanzar un modal detrás de otro. Las trampas Tab/Shift+Tab existentes se conservan y el selector nativo de apariencia también contiene el ciclo de Tab. Los modales quedan por encima del menú lateral, que antes tapaba su borde izquierdo en escritorio, conservando los avisos por encima.
- Las ayudas de Horario/Avisos se pueden fijar mediante toque o clic; otro clic cierra la ayuda y Escape la descarta sin cerrar el diálogo padre. Las ayudas de Logros y los tooltips reubicados de Finanzas conservan sus implementaciones propias. Controles compactos reciben objetivos táctiles mínimos de 44 px en dispositivo con puntero grueso. Movimiento reducido desactiva desplazamiento suave y limita animaciones/transiciones.

## Evidencia automática

`tests/presentation-accessibility.test.mjs` verifica preferencias reversibles, rechazo de almacenamiento, contraste de las catorce combinaciones de paleta/modo sobre tres superficies, texto sobre acentos, coherencia de llamadas pendientes/duración/acciones, prioridad de actividades y regreso de foco. La suite de recuperación de actividades se ejecuta junto a estos casos para comprobar que los descartes existentes conservan su alcance.

Comprobados durante implementación: 22 casos de presentación/recuperación, sintaxis e imports/exports y wiring UI. El criterio propio se agregó a la matriz de producción; el inventario conjunto se valida al integrar las demás fases. La compilación y traducciones finales se integran en la entrega general. El compilado intermedio comprobó ocho recorridos de llamadas pendientes (ES/EN, claro/oscuro, 320/1280 px): misma etiqueta, duración cerrada 00:02:03, descarte cancelado protegido, reapertura del formulario y llamadas guardadas intactas, sin errores JS. Se inspeccionaron las capturas móvil claro y escritorio oscuro de este flujo.

## Límites

Los cálculos de contraste son evidencia sobre tokens y superficies concretas; no certifican cada combinación de transparencia, imagen o estado de todos los componentes. Las pruebas de foco ejecutan las funciones reales con elementos controlados; una simulación no sustituye una sesión humana con lector de pantalla, monitor físico, lupa del sistema o pantalla táctil. Ninguno de estos cambios certifica reglas de pago de Propio, crea llamadas o altera ganancias.
