document.addEventListener('DOMContentLoaded', () => {
    const enlacesNavegacion = document.querySelectorAll('.navegacion a');
    const paginaActual = window.location.pathname.split('/').pop() || 'index.html';

    enlacesNavegacion.forEach((enlace) => {
        if (enlace.getAttribute('href') === paginaActual) {
            enlace.style.color = 'var(--color-fuego)';
            enlace.style.borderBottom = '2px solid var(--color-fuego)';
        }
    });

    if (new URLSearchParams(window.location.search).get('guardada') === '1') {
        const formulario = document.querySelector('form.formulario');
        if (formulario) {
            const confirmacion = document.createElement('p');
            confirmacion.className = 'reserva-confirmacion';
            confirmacion.setAttribute('role', 'status');
            confirmacion.textContent = '¡Tu reserva fue guardada correctamente!';
            formulario.prepend(confirmacion);
        }
    }

    const inputFecha = document.getElementById('fecha');
    const inputHora = document.getElementById('hora');

    if (inputFecha) {
        const ahora = new Date();
        const hoy = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
        inputFecha.setAttribute('min', hoy);

        const actualizarHoraMinima = () => {
            if (inputHora) {
                const fechaEsHoy = inputFecha.value === hoy;
                const horas = String(ahora.getHours()).padStart(2, '0');
                const minutos = String(ahora.getMinutes()).padStart(2, '0');
                inputHora.min = fechaEsHoy ? `${horas}:${minutos}` : '';
            }
        };

        inputFecha.addEventListener('change', actualizarHoraMinima);
        actualizarHoraMinima();
    }
});