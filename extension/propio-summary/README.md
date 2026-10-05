# Propio · Minutos y ganancias

Extensión independiente para el historial de interpreters.propio-ls.com. No necesita cuenta en otra herramienta ni tiene conexión con Shift Tracker, Twilio o el puente de llamadas. Permisos: almacenamiento local de la configuración y acceso únicamente al portal de Propio. No tiene worker, observador de red ni mensajería con otras páginas.

La barra muestra el subtotal visible de Duration (Minutes) y Pay. Primero elegir Start Date y End Date en Propio y aplicar el filtro para actualizar el historial. Sum period / Sumar período recorre Primera/Anterior/Siguiente del paginador reconocido, suma todas las páginas de ese rango y vuelve a la inicial. Al pasar el mouse por el botón aparece una explicación; también tiene descripción accesible y explicación en Details / Detalles. Muestra progreso y permite cancelar. Un cambio de fechas/tamaño/orden/cantidad o intervención durante el recorrido cancela el cálculo; un fallo no se presenta como total completo.

El pago se lee de Propio, no se estima por tarifa. Incluye pagos cero y ajustes negativos. Valores pendientes o no reconocidos se excluyen de su suma y se marca Total parcial. No incluye llamadas en curso. El total calculado queda en memoria; Recalcular incorpora cambios posteriores. No persiste filas ni guarda identificadores de clientes. Límite de 2.000 páginas y 15 segundos por transición.

Solo lee encabezados, duración/pago, fechas seleccionadas y metadatos del paginador/orden. No opera disponibilidad, aceptar o colgar, ni registra/importa llamadas en otras apps. En Details / Detalles se puede configurar una conversión secundaria opcional y elegir English o Español. Inglés por defecto, incluyendo configuraciones antiguas sin idioma; cambiarlo se guarda automáticamente sin alterar moneda/cambio ni el total calculado. Traduce botones, estados, errores, tooltip, explicaciones, privacidad y popup. Guarda únicamente moneda, cambio e idioma en esta extensión, sin consultar configuraciones de otras herramientas. No pide ni guarda usuario, contraseña, cookies o tokens de la sesión.

## Instalación

Descomprimir el ZIP en una carpeta que se vaya a conservar. En chrome://extensions, activar Modo de desarrollador, elegir Cargar descomprimida y seleccionar propio-summary, que contiene manifest.json. Recargar el portal. La extensión anterior que combinaba tracker y resumen debe actualizarse al puente 1.3.0 para que desaparezca su barra al recargar Propio.

El paquete incluye propio-resumen.user.js como alternativa para quien ya use un gestor de userscripts. Usar extensión o userscript, no ambos. El userscript guarda su configuración con una clave local propia de Propio. No descarga código ni envía datos a servidores. Un gestor como Tampermonkey es una extensión; esa alternativa tampoco funciona por sí sola desde otro sitio web.

## Validación

El subtotal y el contraste se confirmaron mediante capturas del portal real. El recorrido completo se probó en Chromium aislado con 285 llamadas/19 páginas, páginas con datos iguales y carga demorada, restauración, cancelación, cambio de fechas, conversión y ambos temas a 320/1000 px. La separación de permisos y ausencia de conexión al tracker se verifican en pruebas. Falta comprobar el recorrido completo en el historial real del usuario.

Build autónomo: node scripts/build-summary-extension.mjs <salida>. Cada archivo del paquete queda autocontenido; no necesita archivos de otra extensión ni una instalación del tracker.
