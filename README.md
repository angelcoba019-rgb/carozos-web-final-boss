# Carozo's Chicken Grill

Sitio web con servidor Express, páginas estáticas y registro de reservas y pedidos en SQLite.

## Requisitos

- Node.js
- npm

## Ejecutar localmente

```bash
npm install
npm start
```

Abre `http://localhost:3000` en el navegador. El servidor crea las tablas de la base de datos al iniciarse.

## Configuración

- `PORT`: puerto del servidor (por defecto, `3000`).
- `DB_PATH`: ruta opcional para el archivo de base de datos SQLite (por defecto, `database.db` en la carpeta del proyecto).
- `RESERVAS_TOKEN`: token opcional para consultar las reservas; debe tener al menos 32 caracteres. Si no se configura, el servidor genera uno localmente.

La base de datos local y el token generado se excluyen de Git para evitar publicar información de reservas o credenciales.
