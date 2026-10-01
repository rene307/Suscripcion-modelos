WEB MODELO VIP - INSTALACIÓN

Incluye:
- Página pública premium
- Login
- Área privada VIP
- Panel administrador
- Creación y bloqueo de usuarios
- Vencimiento opcional del acceso
- Subida de fotos y videos
- Chat privado en tiempo real
- Node.js + Express
- PostgreSQL
- Socket.IO

1) CREAR BASE DE DATOS
Crea una base PostgreSQL llamada modelo_vip y ejecuta sql/schema.sql.

2) CONFIGURAR .ENV
Copia .env.example como .env y configura PostgreSQL, JWT_SECRET, ADMIN_EMAIL y ADMIN_PASSWORD.

3) INSTALAR
npm install

4) INICIAR
npm start

Abrir http://localhost:3000

IMPORTANTE EN PRODUCCIÓN
La demostración guarda archivos en public/uploads. Para producción conviene usar Supabase Storage, Cloudflare R2, S3 o equivalente, y guardar en PostgreSQL solo URL/metadatos. En Render el disco local no debe tratarse como almacenamiento permanente.

SEGURIDAD
Usar HTTPS, JWT_SECRET largo, contraseñas fuertes, URLs firmadas para contenido privado, rate limiting, validación/escaneo de archivos y copias de seguridad.

NOTA CHAT
vip.js usa ADMIN_ID = 1 como demostración. Si el administrador tiene otro ID, cambia esa constante.
