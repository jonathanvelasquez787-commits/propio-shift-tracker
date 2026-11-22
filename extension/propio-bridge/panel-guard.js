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

// Cuando cae del icono de Chrome (panel.html?popup=1) la ventanita mide lo que ella diga, con el maximo que deja Chrome de alto (600).
// El que se desplaza es la propia ventana (no el body): asi la barra de acciones pegada arriba se entera del scroll.
if (new URLSearchParams(window.location.search).get('popup') === '1') {
  const style = document.createElement('style');
  style.textContent = 'html{width:500px;height:600px;overflow-x:hidden;overflow-y:auto}body{width:500px;margin:0}';
  document.head.appendChild(style);
}
