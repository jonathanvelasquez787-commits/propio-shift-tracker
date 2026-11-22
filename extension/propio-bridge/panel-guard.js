// Dentro del panel lateral la app a veces "se va a la web" con location.replace('/') (por ejemplo al cerrar sesion).
// En una extension esa direccion no existe: se cancela el viaje y se recarga el panel, que pide entrar de nuevo si hace falta.
if (typeof navigation !== 'undefined') {
  navigation.addEventListener('navigate', (event) => {
    const target = new URL(event.destination.url);
    if (target.origin === window.location.origin && !target.pathname.endsWith('/panel.html') && event.cancelable) {
      event.preventDefault();
      window.location.reload();
    }
  });
}
