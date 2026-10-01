require("dotenv").config();

const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const http = require("http");

const { Server } = require("socket.io");
const { MercadoPagoConfig, Preference } = require("mercadopago");

const pool = require("./db");


/* =========================================================
   SERVIDOR
========================================================= */

const app = express();

const server = http.createServer(app);

const io = new Server(server);

const PORT = Number(
  process.env.PORT || 3000
);

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "CAMBIAR_EN_PRODUCCION";


/* =========================================================
   MERCADO PAGO
========================================================= */

const MERCADOPAGO_ACCESS_TOKEN =
  process.env.MERCADOPAGO_ACCESS_TOKEN;

const APP_BASE_URL =
  process.env.APP_BASE_URL;

const mercadoPagoClient =
  MERCADOPAGO_ACCESS_TOKEN
    ? new MercadoPagoConfig({
        accessToken:
          MERCADOPAGO_ACCESS_TOKEN
      })
    : null;

const preferenceClient =
  mercadoPagoClient
    ? new Preference(
        mercadoPagoClient
      )
    : null;


/* =========================================================
   CARPETAS
========================================================= */

const publicDir = path.join(
  __dirname,
  "..",
  "public"
);

const uploadsDir = path.join(
  publicDir,
  "uploads"
);

fs.mkdirSync(
  uploadsDir,
  {
    recursive: true
  }
);


/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(
  cors()
);

app.use(
  express.json({
    limit: "2mb"
  })
);

app.use(
  express.urlencoded({
    extended: true
  })
);

app.use(
  express.static(
    publicDir
  )
);


/* =========================================================
   MULTER
========================================================= */

const upload = multer({

  dest:
    uploadsDir,

  limits: {
    fileSize:
      100 *
      1024 *
      1024
  },

  fileFilter: (
    req,
    file,
    callback
  ) => {

    const allowed = [

      "image/jpeg",
      "image/png",
      "image/webp",

      "video/mp4",
      "video/webm",

      "audio/webm",
      "audio/ogg",
      "audio/mpeg",
      "audio/mp4",
      "audio/wav"

    ];


    if (
      allowed.includes(
        file.mimetype
      )
    ) {

      callback(
        null,
        true
      );

    } else {

      callback(
        new Error(
          "Tipo de archivo no permitido"
        ),
        false
      );
    }
  }
});


/* =========================================================
   JWT
========================================================= */

function signToken(user) {

  return jwt.sign(
    {
      id:
        user.id,

      email:
        user.email,

      role:
        user.role
    },

    JWT_SECRET,

    {
      expiresIn:
        "12h"
    }
  );
}


/* =========================================================
   AUTENTICACIÓN
========================================================= */

function authRequired(
  req,
  res,
  next
) {

  const header =
    req.headers.authorization ||
    "";

  const token =
    header.startsWith(
      "Bearer "
    )
      ? header.slice(7)
      : null;


  if (!token) {

    return res
      .status(401)
      .json({
        error:
          "No autorizado"
      });
  }


  try {

    req.user =
      jwt.verify(
        token,
        JWT_SECRET
      );

    next();

  } catch {

    return res
      .status(401)
      .json({
        error:
          "Sesión inválida o vencida"
      });
  }
}


/* =========================================================
   ADMIN
========================================================= */

function adminRequired(
  req,
  res,
  next
) {

  if (
    req.user?.role !==
    "admin"
  ) {

    return res
      .status(403)
      .json({
        error:
          "Acceso solo para administrador"
      });
  }

  next();
}


/* =========================================================
   LOGIN
========================================================= */

app.post(
  "/api/login",
  async (
    req,
    res
  ) => {

    try {

      const {
        email,
        password
      } =
        req.body;


      const result =
        await pool.query(
          `
            SELECT
              id,
              nombre,
              email,
              password_hash,
              role,
              activo,
              acceso_hasta
            FROM usuarios
            WHERE LOWER(email) = LOWER($1)
            LIMIT 1
          `,
          [
            email
          ]
        );


      if (
        !result.rows.length
      ) {

        return res
          .status(401)
          .json({
            error:
              "Credenciales incorrectas"
          });
      }


      const user =
        result.rows[0];


      if (!user.activo) {

        return res
          .status(403)
          .json({
            error:
              "Cuenta desactivada"
          });
      }


      if (
        user.acceso_hasta &&
        new Date(
          user.acceso_hasta
        ).getTime() <
        Date.now()
      ) {

        return res
          .status(403)
          .json({
            error:
              "El acceso ha vencido"
          });
      }


      const correctPassword =
        await bcrypt.compare(
          password,
          user.password_hash
        );


      if (!correctPassword) {

        return res
          .status(401)
          .json({
            error:
              "Credenciales incorrectas"
          });
      }


      res.json({

        token:
          signToken(
            user
          ),

        user: {

          id:
            user.id,

          nombre:
            user.nombre,

          email:
            user.email,

          role:
            user.role,

          acceso_hasta:
            user.acceso_hasta
        }
      });


    } catch (error) {

      console.error(
        error
      );

      res
        .status(500)
        .json({
          error:
            "Error del servidor"
        });
    }
  }
);


/* =========================================================
   USUARIO ACTUAL
========================================================= */

app.get(
  "/api/me",
  authRequired,
  async (
    req,
    res
  ) => {

    try {

      const result =
        await pool.query(
          `
            SELECT
              id,
              nombre,
              email,
              role,
              activo,
              acceso_hasta
            FROM usuarios
            WHERE id = $1
          `,
          [
            req.user.id
          ]
        );


      if (
        !result.rows.length
      ) {

        return res
          .status(404)
          .json({
            error:
              "Usuario no encontrado"
          });
      }


      res.json(
        result.rows[0]
      );


    } catch (error) {

      console.error(
        error
      );

      res
        .status(500)
        .json({
          error:
            "Error del servidor"
        });
    }
  }
);


/* =========================================================
   OBTENER CONTENIDO
========================================================= */

app.get(
  "/api/content",
  authRequired,
  async (
    req,
    res
  ) => {

    try {

      const result =
        await pool.query(
          `
            SELECT
              id,
              titulo,
              descripcion,
              tipo,
              archivo_url,
              created_at
            FROM contenidos
            WHERE activo = TRUE
            ORDER BY created_at DESC
          `
        );


      res.json(
        result.rows
      );


    } catch (error) {

      console.error(
        error
      );

      res
        .status(500)
        .json({
          error:
            "No fue posible cargar el contenido"
        });
    }
  }
);


/* =========================================================
   PUBLICAR CONTENIDO
========================================================= */

app.post(
  "/api/content",
  authRequired,
  adminRequired,
  upload.single(
    "archivo"
  ),
  async (
    req,
    res
  ) => {

    try {

      if (!req.file) {

        return res
          .status(400)
          .json({
            error:
              "Debes seleccionar un archivo"
          });
      }


      const extension =
        path.extname(
          req.file.originalname
        ) || "";


      const finalName =
        `${req.file.filename}${extension}`;


      const finalPath =
        path.join(
          uploadsDir,
          finalName
        );


      fs.renameSync(
        req.file.path,
        finalPath
      );


      const tipo =
        req.file.mimetype
          .startsWith(
            "video/"
          )
          ? "video"
          : "foto";


      const archivoUrl =
        `/uploads/${finalName}`;


      const result =
        await pool.query(
          `
            INSERT INTO contenidos
            (
              titulo,
              descripcion,
              tipo,
              archivo_url,
              creado_por
            )
            VALUES
            (
              $1,
              $2,
              $3,
              $4,
              $5
            )
            RETURNING
              id,
              titulo,
              descripcion,
              tipo,
              archivo_url,
              created_at
          `,
          [
            req.body.titulo ||
              "Contenido privado",

            req.body.descripcion ||
              "",

            tipo,

            archivoUrl,

            req.user.id
          ]
        );


      res
        .status(201)
        .json(
          result.rows[0]
        );


    } catch (error) {

      console.error(
        error
      );

      res
        .status(500)
        .json({
          error:
            "No fue posible guardar el contenido"
        });
    }
  }
);


/* =========================================================
   OCULTAR CONTENIDO
========================================================= */

app.delete(
  "/api/content/:id",
  authRequired,
  adminRequired,
  async (
    req,
    res
  ) => {

    try {

      await pool.query(
        `
          UPDATE contenidos
          SET activo = FALSE
          WHERE id = $1
        `,
        [
          req.params.id
        ]
      );


      res.json({
        ok: true
      });


    } catch (error) {

      console.error(
        error
      );

      res
        .status(500)
        .json({
          error:
            "No fue posible ocultar el contenido"
        });
    }
  }
);


/* =========================================================
   USUARIOS
========================================================= */

app.get(
  "/api/users",
  authRequired,
  adminRequired,
  async (
    req,
    res
  ) => {

    try {

      const result =
        await pool.query(
          `
            SELECT
              id,
              nombre,
              email,
              role,
              activo,
              acceso_hasta,
              created_at
            FROM usuarios
            ORDER BY created_at DESC
          `
        );


      res.json(
        result.rows
      );


    } catch (error) {

      console.error(
        error
      );

      res
        .status(500)
        .json({
          error:
            "No fue posible cargar los usuarios"
        });
    }
  }
);


/* =========================================================
   CREAR USUARIO
========================================================= */

app.post(
  "/api/users",
  authRequired,
  adminRequired,
  async (
    req,
    res
  ) => {

    try {

      const {
        nombre,
        email,
        password,
        role = "cliente",
        acceso_hasta = null
      } =
        req.body;


      if (
        !nombre ||
        !email ||
        !password
      ) {

        return res
          .status(400)
          .json({
            error:
              "Faltan datos obligatorios"
          });
      }


      const hash =
        await bcrypt.hash(
          password,
          12
        );


      const result =
        await pool.query(
          `
            INSERT INTO usuarios
            (
              nombre,
              email,
              password_hash,
              role,
              acceso_hasta
            )
            VALUES
            (
              $1,
              LOWER($2),
              $3,
              $4,
              $5
            )
            RETURNING
              id,
              nombre,
              email,
              role,
              activo,
              acceso_hasta,
              created_at
          `,
          [
            nombre,
            email,
            hash,
            role,
            acceso_hasta ||
              null
          ]
        );


      res
        .status(201)
        .json(
          result.rows[0]
        );


    } catch (error) {

      if (
        error.code ===
        "23505"
      ) {

        return res
          .status(409)
          .json({
            error:
              "Ese correo ya existe"
          });
      }


      console.error(
        error
      );

      res
        .status(500)
        .json({
          error:
            "No fue posible crear el usuario"
        });
    }
  }
);


/* =========================================================
   ACTIVAR / BLOQUEAR USUARIO
========================================================= */

app.patch(
  "/api/users/:id/status",
  authRequired,
  adminRequired,
  async (
    req,
    res
  ) => {

    try {

      const result =
        await pool.query(
          `
            UPDATE usuarios
            SET activo = $1
            WHERE id = $2
            RETURNING
              id,
              nombre,
              email,
              role,
              activo,
              acceso_hasta
          `,
          [
            Boolean(
              req.body.activo
            ),

            req.params.id
          ]
        );


      if (
        !result.rows.length
      ) {

        return res
          .status(404)
          .json({
            error:
              "Usuario no encontrado"
          });
      }


      res.json(
        result.rows[0]
      );


    } catch (error) {

      console.error(
        error
      );

      res
        .status(500)
        .json({
          error:
            "No fue posible actualizar el usuario"
        });
    }
  }
);


/* =========================================================
   MENSAJES
========================================================= */

app.get(
  "/api/messages/:otherUserId",
  authRequired,
  async (
    req,
    res
  ) => {

    try {

      const otherUserId =
        Number(
          req.params.otherUserId
        );


      const result =
        await pool.query(
          `
            SELECT
              id,
              sender_id,
              receiver_id,
              texto,
              created_at
            FROM mensajes
            WHERE
              (
                sender_id = $1
                AND
                receiver_id = $2
              )
              OR
              (
                sender_id = $2
                AND
                receiver_id = $1
              )
            ORDER BY created_at ASC
          `,
          [
            req.user.id,
            otherUserId
          ]
        );


      res.json(
        result.rows
      );


    } catch (error) {

      console.error(
        error
      );

      res
        .status(500)
        .json({
          error:
            "No fue posible cargar los mensajes"
        });
    }
  }
);


/* =========================================================
   SUBIR FOTO O AUDIO DEL CHAT
========================================================= */

app.post(
  "/api/chat/upload",
  authRequired,
  upload.single(
    "archivo"
  ),
  async (
    req,
    res
  ) => {

    try {

      if (!req.file) {

        return res
          .status(400)
          .json({
            error:
              "Debes seleccionar un archivo"
          });
      }


      let extension =
        path.extname(
          req.file.originalname
        );


      if (!extension) {

        if (
          req.file.mimetype ===
          "audio/webm"
        ) {

          extension =
            ".webm";
        }


        if (
          req.file.mimetype ===
          "audio/ogg"
        ) {

          extension =
            ".ogg";
        }


        if (
          req.file.mimetype ===
          "audio/mpeg"
        ) {

          extension =
            ".mp3";
        }


        if (
          req.file.mimetype ===
          "audio/mp4"
        ) {

          extension =
            ".m4a";
        }


        if (
          req.file.mimetype ===
          "audio/wav"
        ) {

          extension =
            ".wav";
        }
      }


      const finalName =
        `${req.file.filename}${extension}`;


      const finalPath =
        path.join(
          uploadsDir,
          finalName
        );


      fs.renameSync(
        req.file.path,
        finalPath
      );


      res.json({

        url:
          `/uploads/${finalName}`,

        mimetype:
          req.file.mimetype
      });


    } catch (error) {

      console.error(
        error
      );

      res
        .status(500)
        .json({
          error:
            "No fue posible subir el archivo"
        });
    }
  }
);


/* =========================================================
   MERCADO PAGO - CREAR PREFERENCIA
========================================================= */

app.post(
  "/api/payments/create-preference",
  authRequired,
  async (
    req,
    res
  ) => {

    try {

      if (
        !MERCADOPAGO_ACCESS_TOKEN ||
        !preferenceClient
      ) {

        return res
          .status(500)
          .json({
            error:
              "Falta MERCADOPAGO_ACCESS_TOKEN en .env"
          });
      }


      if (!APP_BASE_URL) {

        return res
          .status(500)
          .json({
            error:
              "Falta APP_BASE_URL en .env"
          });
      }


      /*
       * IMPORTANTE:
       *
       * El precio se define en el backend.
       * No se recibe desde vip.js.
       *
       * Así el cliente no puede modificar
       * el precio desde el navegador.
       */

      const PRECIO_MEMBRESIA =
        10000;


      const response =
        await preferenceClient.create({

          body: {

            items: [
              {
                id:
                  "membresia-vip-30",

                title:
                  "Membresía VIP 30 días",

                quantity:
                  1,

                currency_id:
                  "CLP",

                unit_price:
                  PRECIO_MEMBRESIA
              }
            ],


            payer: {

              email:
                req.user.email
            },


            external_reference:

              String(
                req.user.id
              ),


            back_urls: {

              success:
                `${APP_BASE_URL}/pagos/pago-exitoso.html`,

              pending:
                `${APP_BASE_URL}/pagos/pago-pendiente.html`,

              failure:
                `${APP_BASE_URL}/pagos/pago-error.html`
            },


            auto_return:
              "approved"
          }
        });


      return res.json({

        preferenceId:
          response.id,

        checkoutUrl:
          response.init_point
      });


    } catch (error) {

      console.error(
        "Error Mercado Pago:",
        error
      );


      return res
        .status(500)
        .json({
          error:
            "No fue posible crear el pago"
        });
    }
  }
);


/* =========================================================
   SOCKET.IO - AUTENTICACIÓN
========================================================= */

io.use(
  (
    socket,
    next
  ) => {

    try {

      socket.user =
        jwt.verify(
          socket.handshake
            .auth?.token,

          JWT_SECRET
        );


      next();


    } catch {

      next(
        new Error(
          "No autorizado"
        )
      );
    }
  }
);


/* =========================================================
   SOCKET.IO - CHAT
========================================================= */

io.on(
  "connection",
  (socket) => {

    socket.join(
      `user:${socket.user.id}`
    );


    socket.on(
      "private-message",
      async (
        payload
      ) => {

        try {

          const receiverId =
            Number(
              payload.receiverId
            );


          const texto =
            String(
              payload.texto ||
              ""
            ).trim();


          if (
            !receiverId ||
            !texto
          ) {

            return;
          }


          const result =
            await pool.query(
              `
                INSERT INTO mensajes
                (
                  sender_id,
                  receiver_id,
                  texto
                )
                VALUES
                (
                  $1,
                  $2,
                  $3
                )
                RETURNING
                  id,
                  sender_id,
                  receiver_id,
                  texto,
                  created_at
              `,
              [
                socket.user.id,
                receiverId,
                texto
              ]
            );


          const message =
            result.rows[0];


          io.to(
            `user:${receiverId}`
          ).emit(
            "private-message",
            message
          );


          io.to(
            `user:${socket.user.id}`
          ).emit(
            "private-message",
            message
          );


        } catch (error) {

          console.error(
            error
          );
        }
      }
    );
  }
);


/* =========================================================
   ADMIN INICIAL
========================================================= */

async function ensureAdmin() {

  const email =
    process.env.ADMIN_EMAIL;


  const password =
    process.env.ADMIN_PASSWORD;


  if (
    !email ||
    !password
  ) {

    return;
  }


  const exists =
    await pool.query(
      `
        SELECT id
        FROM usuarios
        WHERE LOWER(email) =
              LOWER($1)
      `,
      [
        email
      ]
    );


  if (
    exists.rows.length
  ) {

    return;
  }


  const hash =
    await bcrypt.hash(
      password,
      12
    );


  await pool.query(
    `
      INSERT INTO usuarios
      (
        nombre,
        email,
        password_hash,
        role,
        activo
      )
      VALUES
      (
        'Administradora',
        LOWER($1),
        $2,
        'admin',
        TRUE
      )
    `,
    [
      email,
      hash
    ]
  );


  console.log(
    "Usuario administrador inicial creado."
  );
}


/* =========================================================
   INICIAR
========================================================= */

ensureAdmin()
  .then(() => {

    server.listen(
      PORT,
      () => {

        console.log(
          `Servidor iniciado en http://localhost:${PORT}`
        );
      }
    );

  })
  .catch((error) => {

    console.error(
      "Error iniciando la aplicación:",
      error
    );

    process.exit(1);
  });