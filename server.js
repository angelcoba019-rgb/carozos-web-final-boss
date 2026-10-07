// 1. IMPORTAR LAS HERRAMIENTAS
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const puerto = Number(process.env.PORT) || 3000;
const archivoToken = path.join(__dirname, '.reservas-token');
let tokenReservas = process.env.RESERVAS_TOKEN;

if (!tokenReservas) {
    try {
        tokenReservas = fs.readFileSync(archivoToken, 'utf8').trim();
    } catch (err) {
        if (err.code !== 'ENOENT') {
            throw err;
        }

        tokenReservas = crypto.randomBytes(32).toString('hex');
        fs.writeFileSync(archivoToken, `${tokenReservas}\n`, { flag: 'wx', mode: 0o600 });
    }
}

if (tokenReservas.length < 32) {
    throw new Error('RESERVAS_TOKEN debe tener al menos 32 caracteres.');
}

const tokenValido = (token) => {
    if (typeof token !== 'string') {
        return false;
    }

    const tokenSolicitado = Buffer.from(token);
    const tokenConfigurado = Buffer.from(tokenReservas);
    return tokenSolicitado.length === tokenConfigurado.length &&
        crypto.timingSafeEqual(tokenSolicitado, tokenConfigurado);
};

// 2. CONFIGURAR EL SERVIDOR (Middlewares)
// Permite procesar datos tanto de formularios tradicionales (urlencoded) como enviando JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Servir la carpeta estática "public"
app.use(express.static(path.join(__dirname, 'public')));

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
}[character]));

// 3. CONFIGURAR LA BASE DE DATOS
const db = new sqlite3.Database(process.env.DB_PATH || path.join(__dirname, 'database.db'), (err) => {
    if (err) {
        console.error('Error al abrir la base de datos:', err.message);
    } else {
        console.log('Conectado a la base de datos SQLite.');
        
        // Tabla de Reservas
        db.run(`CREATE TABLE IF NOT EXISTS reservas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT,
            fecha TEXT,
            hora TEXT,
            personas INTEGER,
            mensaje TEXT
        )`);

        // Tabla de Pedidos
        db.run(`CREATE TABLE IF NOT EXISTS pedidos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT,
            telefono TEXT,
            direccion TEXT,
            referencia TEXT,
            metodo_pago TEXT
        )`);
    }
});

// 4. RUTAS

// Ruta A: Procesar reservas
app.post('/procesar', (req, res) => {
    const nombre = String(req.body.nombre || req.body.nombre_completo || '').trim();
    const fecha = String(req.body.fecha || '').trim();
    const hora = String(req.body.hora || '').trim();
    const personas = Number(req.body.personas || req.body.numero_personas);
    const mensaje = String(req.body.mensaje || req.body.Adicional || req.body.info_adicional || req.body.info || '').trim();
    const fechaParsed = new Date(`${fecha}T00:00:00Z`);
    const fechaValida = /^\d{4}-\d{2}-\d{2}$/.test(fecha) &&
        !Number.isNaN(fechaParsed.valueOf()) && fechaParsed.toISOString().slice(0, 10) === fecha;

    if (!nombre || !fechaValida || !/^\d{2}:\d{2}$/.test(hora) ||
        Number(hora.slice(0, 2)) > 23 || Number(hora.slice(3, 5)) > 59 ||
        !Number.isInteger(personas) ||
        personas < 1 || personas > 10) {
        return res.status(400).send('Revisa los datos: nombre, fecha, hora y número de personas son obligatorios (de 1 a 10 personas).');
    }

    const sql = 'INSERT INTO reservas (nombre, fecha, hora, personas, mensaje) VALUES (?, ?, ?, ?, ?)';
    db.run(sql, [nombre, fecha, hora, personas, mensaje], function(err) {
        if (err) {
            console.error('Error al guardar reserva:', err.message);
            return res.status(500).send('Error al registrar la reserva en la base de datos.');
        }
        res.redirect(303, '/reserv.html?guardada=1');
    });
});

// Ruta B: Procesar pedidos
app.post('/enviar-pedido', (req, res) => {
    const nombre = req.body.nombre || '';
    const telefono = req.body.telefono || '';
    const direccion = req.body.direccion || '';
    const referencia = req.body.referencia || '';
    const metodo_pago = req.body.metodo_pago || req.body.pago || '';

    const sql = 'INSERT INTO pedidos (nombre, telefono, direccion, referencia, metodo_pago) VALUES (?, ?, ?, ?, ?)';
    db.run(sql, [nombre, telefono, direccion, referencia, metodo_pago], function(err) {
        if (err) {
            console.error('Error al guardar pedido:', err.message);
            return res.status(500).send('Error al registrar el pedido.');
        }
        res.send('<h2>¡Tu pedido a domicilio ha sido registrado! En breve lo enviaremos.</h2><a href="/">Volver al inicio</a>');
    });
});

// Ruta C: Visualización de reservas para revisión
app.get('/ver-reservas', (req, res) => {
    if (!tokenValido(req.query.token)) {
        return res.sendStatus(404);
    }

    res.set({
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
        'X-Robots-Tag': 'noindex, nofollow, noarchive'
    });

    db.all('SELECT * FROM reservas ORDER BY id DESC', [], (err, rows) => {
        if (err) {
            console.error('Error al consultar reservas:', err.message);
            return res.status(500).send('Error al consultar las reservas.');
        }

        let html = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Ver Reservas - Carozo's</title>
            <link rel="stylesheet" href="/styles.css">
        </head>
        <body>
            <main class="vista-reservas">
                <h1>Reservas registradas</h1>
                ${req.query.guardada === '1' ? '<p class="reserva-confirmacion" role="status">¡Reserva guardada correctamente!</p>' : ''}
                ${rows.length ? `<div class="tabla-reservas-contenedor"><table class="tabla-reservas">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nombre</th>
                        <th>Fecha</th>
                        <th>Hora</th>
                        <th>Personas</th>
                        <th>Información Adicional</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.map((reserva) => `
                        <tr>
                            <td>${escapeHtml(reserva.id)}</td>
                            <td>${escapeHtml(reserva.nombre || '—')}</td>
                            <td>${escapeHtml(reserva.fecha || '—')}</td>
                            <td>${escapeHtml(reserva.hora || '—')}</td>
                            <td>${escapeHtml(reserva.personas || '—')}</td>
                            <td>${escapeHtml(reserva.mensaje || 'Ninguna')}</td>
                        </tr>
                    `).join('')}
                </tbody>
                </table></div>` : '<p class="sin-reservas">Todavía no hay reservas registradas.</p>'}
                <a href="/reserv.html" class="boton-secundario">Registrar otra reserva</a>
            </main>
        </body>
        </html>
        `;

        res.send(html);
    });
});

// 5. ENCENDER EL SERVIDOR
app.listen(puerto, () => {
    console.log(`Servidor de Carozo's Chicken Grill funcionando en http://localhost:${puerto}`);
    console.log(`Enlace privado para consultar reservas: http://localhost:${puerto}/ver-reservas?token=${encodeURIComponent(tokenReservas)}`);
});