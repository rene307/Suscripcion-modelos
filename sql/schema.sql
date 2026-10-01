CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  email VARCHAR(180) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'cliente' CHECK (role IN ('admin', 'cliente')),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  acceso_hasta TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contenidos (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(180) NOT NULL,
  descripcion TEXT,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('foto', 'video')),
  archivo_url TEXT NOT NULL,
  creado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mensajes (
  id BIGSERIAL PRIMARY KEY,
  sender_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  receiver_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mensajes_sender_receiver ON mensajes(sender_id, receiver_id, created_at);
CREATE INDEX IF NOT EXISTS idx_contenidos_created_at ON contenidos(created_at DESC);
