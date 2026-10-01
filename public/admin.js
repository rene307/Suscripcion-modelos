/* =========================================================
   SESIÓN
========================================================= */

const token =
  localStorage.getItem("vip_token");

const currentUser =
  JSON.parse(
    localStorage.getItem("vip_user") || "null"
  );


if (
  !token ||
  !currentUser ||
  currentUser.role !== "admin"
) {
  location.href = "/login.html";
}


document.getElementById(
  "adminName"
).textContent =
  currentUser.nombre;


document.getElementById(
  "logoutBtn"
).onclick = () => {

  localStorage.removeItem(
    "vip_token"
  );

  localStorage.removeItem(
    "vip_user"
  );

  location.href =
    "/login.html";
};


/* =========================================================
   API
========================================================= */

async function api(
  url,
  options = {}
) {

  const response =
    await fetch(
      url,
      {
        ...options,

        headers: {
          ...(options.headers || {}),

          Authorization:
            `Bearer ${token}`
        }
      }
    );


  const data =
    await response.json();


  if (!response.ok) {

    throw new Error(
      data.error || "Error"
    );
  }


  return data;
}


/* =========================================================
   ESCAPAR HTML
========================================================= */

function esc(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}


/* =========================================================
   MENÚ
========================================================= */

document
  .querySelectorAll(
    ".side-nav button"
  )
  .forEach((button) => {

    button.onclick = () => {

      document
        .querySelectorAll(
          ".side-nav button"
        )
        .forEach((item) => {

          item.classList.remove(
            "active"
          );
        });


      button.classList.add(
        "active"
      );


      document
        .querySelectorAll(
          '[id^="view-"]'
        )
        .forEach((view) => {

          view.classList.add(
            "hidden"
          );
        });


      document
        .getElementById(
          `view-${button.dataset.view}`
        )
        .classList.remove(
          "hidden"
        );
    };
  });


/* =========================================================
   CONTENIDO
========================================================= */

async function loadContent() {

  const items =
    await api(
      "/api/content"
    );


  document.getElementById(
    "contentCount"
  ).textContent =
    items.length;


  document.getElementById(
    "adminContentGrid"
  ).innerHTML =
    items
      .map((item) => {

        const media =
          item.tipo === "video"
            ? `
              <video
                src="${item.archivo_url}"
                controls
                preload="metadata"
              ></video>
            `
            : `
              <img
                src="${item.archivo_url}"
                alt=""
              >
            `;


        return `
          <article class="card">

            <div class="card-media">
              ${media}
            </div>

            <div class="card-body">

              <h4>
                ${esc(item.titulo)}
              </h4>

              <p>
                ${esc(item.descripcion)}
              </p>

              <button
                class="btn btn-danger"
                style="margin-top:14px"
                onclick="deleteContent(${item.id})"
              >
                Ocultar
              </button>

            </div>

          </article>
        `;
      })
      .join("");
}


async function deleteContent(id) {

  if (
    !confirm(
      "¿Ocultar este contenido?"
    )
  ) {
    return;
  }


  await api(
    `/api/content/${id}`,
    {
      method: "DELETE"
    }
  );


  loadContent();
}


/* =========================================================
   SUBIR CONTENIDO
========================================================= */

document.getElementById(
  "uploadForm"
).onsubmit =
  async (event) => {

    event.preventDefault();


    const response =
      await fetch(
        "/api/content",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${token}`
          },

          body:
            new FormData(
              event.currentTarget
            )
        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      alert(
        data.error ||
        "No fue posible subir el archivo"
      );

      return;
    }


    event.currentTarget.reset();

    loadContent();
  };


/* =========================================================
   CLIENTES
========================================================= */

let allUsers = [];

let selectedChatUser = null;


async function loadUsers() {

  allUsers =
    await api(
      "/api/users"
    );


  const clients =
    allUsers.filter(
      (user) =>
        user.role === "cliente"
    );


  document.getElementById(
    "userCount"
  ).textContent =
    clients.length;


  document.getElementById(
    "usersTable"
  ).innerHTML =
    allUsers
      .map((user) => {

        const access =
          user.acceso_hasta
            ? new Date(
                user.acceso_hasta
              ).toLocaleString()
            : "Sin vencimiento";


        return `
          <tr>

            <td>
              ${esc(user.nombre)}
            </td>

            <td>
              ${esc(user.email)}
            </td>

            <td>
              ${esc(user.role)}
            </td>

            <td>
              ${access}
            </td>

            <td>

              <span
                class="
                  badge
                  ${
                    user.activo
                      ? "on"
                      : "off"
                  }
                "
              >
                ${
                  user.activo
                    ? "Activo"
                    : "Bloqueado"
                }
              </span>

            </td>

            <td>

              ${
                user.id !==
                currentUser.id
                  ? `
                    <button
                      class="btn btn-dark"
                      onclick="
                        toggleUser(
                          ${user.id},
                          ${!user.activo}
                        )
                      "
                    >
                      ${
                        user.activo
                          ? "Bloquear"
                          : "Activar"
                      }
                    </button>
                  `
                  : ""
              }

            </td>

          </tr>
        `;
      })
      .join("");


  document.getElementById(
    "chatUsers"
  ).innerHTML =
    clients
      .map((user) => {

        return `
          <button
            class="chat-user"
            data-user-id="${user.id}"
            onclick="openChat(${user.id})"
          >

            <strong>
              ${esc(user.nombre)}
            </strong>

            <small>
              ${esc(user.email)}
            </small>

          </button>
        `;
      })
      .join("");
}


async function toggleUser(
  id,
  activo
) {

  await api(
    `/api/users/${id}/status`,
    {
      method: "PATCH",

      headers: {
        "Content-Type":
          "application/json"
      },

      body:
        JSON.stringify({
          activo
        })
    }
  );


  loadUsers();
}


/* =========================================================
   CREAR USUARIO
========================================================= */

document.getElementById(
  "createUserForm"
).onsubmit =
  async (event) => {

    event.preventDefault();


    const form =
      new FormData(
        event.currentTarget
      );


    const payload = {

      nombre:
        form.get("nombre"),

      email:
        form.get("email"),

      password:
        form.get("password"),

      role:
        "cliente",

      acceso_hasta:
        form.get(
          "acceso_hasta"
        ) || null
    };


    try {

      await api(
        "/api/users",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify(
              payload
            )
        }
      );


      event.currentTarget.reset();

      loadUsers();

      alert(
        "Usuario creado."
      );

    } catch (error) {

      alert(
        error.message
      );
    }
  };


/* =========================================================
   SOCKET.IO
========================================================= */

const socket =
  io({
    auth: {
      token
    }
  });


/* =========================================================
   RENDER DEL MENSAJE
========================================================= */

function renderMessage(message) {

  const mine =
    Number(
      message.sender_id
    ) ===
    Number(
      currentUser.id
    );


  const texto =
    String(
      message.texto || ""
    );


  let contenido = "";


  if (
    texto.startsWith(
      "[[image]]"
    )
  ) {

    const url =
      texto.replace(
        "[[image]]",
        ""
      );


    contenido = `
      <img
        src="${esc(url)}"
        class="chat-image"
        alt="Fotografía enviada"
      >
    `;

  } else if (
    texto.startsWith(
      "[[audio]]"
    )
  ) {

    const url =
      texto.replace(
        "[[audio]]",
        ""
      );


    contenido = `
      <audio
        src="${esc(url)}"
        class="chat-audio"
        controls
      ></audio>
    `;

  } else {

    contenido =
      `<div>${esc(texto)}</div>`;
  }


  return `
    <div
      class="
        message
        ${mine ? "mine" : ""}
      "
    >

      ${contenido}

      <small>
        ${
          new Date(
            message.created_at
          ).toLocaleString()
        }
      </small>

    </div>
  `;
}


/* =========================================================
   ABRIR CHAT
========================================================= */

async function openChat(userId) {

  selectedChatUser =
    allUsers.find(
      (user) =>
        Number(user.id) ===
        Number(userId)
    );


  if (!selectedChatUser) {
    return;
  }


  document.getElementById(
    "adminChatTitle"
  ).textContent =
    selectedChatUser.nombre;


  document
    .querySelectorAll(
      ".chat-user"
    )
    .forEach((button) => {

      button.classList.remove(
        "active"
      );
    });


  const activeButton =
    document.querySelector(
      `.chat-user[data-user-id="${userId}"]`
    );


  if (activeButton) {

    activeButton.classList.add(
      "active"
    );
  }


  const rows =
    await api(
      `/api/messages/${userId}`
    );


  const box =
    document.getElementById(
      "adminMessages"
    );


  box.innerHTML =
    rows
      .map(renderMessage)
      .join("");


  box.scrollTop =
    box.scrollHeight;
}


/* =========================================================
   ENVIAR TEXTO
========================================================= */

document.getElementById(
  "adminChatForm"
).onsubmit =
  (event) => {

    event.preventDefault();


    if (!selectedChatUser) {

      alert(
        "Selecciona un cliente."
      );

      return;
    }


    const input =
      document.getElementById(
        "adminMessageInput"
      );


    const texto =
      input.value.trim();


    if (!texto) {
      return;
    }


    socket.emit(
      "private-message",
      {
        receiverId:
          selectedChatUser.id,

        texto
      }
    );


    input.value = "";


    document.getElementById(
      "adminEmojiPicker"
    ).classList.add(
      "hidden"
    );
  };


/* =========================================================
   SELECTOR DE EMOJIS
========================================================= */

const adminEmojiBtn =
  document.getElementById(
    "adminEmojiBtn"
  );


const adminEmojiPicker =
  document.getElementById(
    "adminEmojiPicker"
  );


adminEmojiBtn.onclick = () => {

  adminEmojiPicker
    .classList
    .toggle(
      "hidden"
    );
};


adminEmojiPicker
  .querySelectorAll(
    "button"
  )
  .forEach((button) => {

    button.onclick = () => {

      const input =
        document.getElementById(
          "adminMessageInput"
        );


      input.value +=
        button.textContent;


      input.focus();
    };
  });


/* =========================================================
   SUBIR ARCHIVO DE CHAT
========================================================= */

async function uploadChatFile(
  file
) {

  const formData =
    new FormData();


  formData.append(
    "archivo",
    file
  );


  const response =
    await fetch(
      "/api/chat/upload",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${token}`
        },

        body:
          formData
      }
    );


  const data =
    await response.json();


  if (!response.ok) {

    throw new Error(
      data.error ||
      "No fue posible subir el archivo"
    );
  }


  return data.url;
}


/* =========================================================
   FOTO
========================================================= */

const adminPhotoBtn =
  document.getElementById(
    "adminPhotoBtn"
  );


const adminImageInput =
  document.getElementById(
    "adminImageInput"
  );


adminPhotoBtn.onclick = () => {

  if (!selectedChatUser) {

    alert(
      "Selecciona un cliente."
    );

    return;
  }


  adminImageInput.click();
};


adminImageInput.onchange =
  async () => {

    const file =
      adminImageInput.files[0];


    if (!file) {
      return;
    }


    try {

      const url =
        await uploadChatFile(
          file
        );


      socket.emit(
        "private-message",
        {
          receiverId:
            selectedChatUser.id,

          texto:
            `[[image]]${url}`
        }
      );


    } catch (error) {

      alert(
        error.message
      );
    }


    adminImageInput.value =
      "";
  };


/* =========================================================
   AUDIO
========================================================= */

let mediaRecorder = null;

let audioChunks = [];

let audioStream = null;


const adminAudioBtn =
  document.getElementById(
    "adminAudioBtn"
  );


adminAudioBtn.onclick =
  async () => {

    if (!selectedChatUser) {

      alert(
        "Selecciona un cliente."
      );

      return;
    }


    if (
      mediaRecorder &&
      mediaRecorder.state ===
        "recording"
    ) {

      mediaRecorder.stop();

      adminAudioBtn.innerHTML =
        "🎤";

      adminAudioBtn.classList.remove(
        "recording"
      );

      return;
    }


    try {

      audioStream =
        await navigator
          .mediaDevices
          .getUserMedia({
            audio: true
          });


      audioChunks = [];


      mediaRecorder =
        new MediaRecorder(
          audioStream
        );


      mediaRecorder.ondataavailable =
        (event) => {

          if (
            event.data.size > 0
          ) {

            audioChunks.push(
              event.data
            );
          }
        };


      mediaRecorder.onstop =
        async () => {

          const blob =
            new Blob(
              audioChunks,
              {
                type:
                  mediaRecorder.mimeType ||
                  "audio/webm"
              }
            );


          const file =
            new File(
              [blob],
              `audio-${Date.now()}.webm`,
              {
                type:
                  blob.type
              }
            );


          try {

            const url =
              await uploadChatFile(
                file
              );


            socket.emit(
              "private-message",
              {
                receiverId:
                  selectedChatUser.id,

                texto:
                  `[[audio]]${url}`
              }
            );


          } catch (error) {

            alert(
              error.message
            );
          }


          if (audioStream) {

            audioStream
              .getTracks()
              .forEach(
                (track) => {

                  track.stop();
                }
              );
          }
        };


      mediaRecorder.start();


      adminAudioBtn.innerHTML =
        "■";


      adminAudioBtn.classList.add(
        "recording"
      );


    } catch (error) {

      console.error(
        error
      );


      alert(
        "No se pudo acceder al micrófono."
      );
    }
  };


/* =========================================================
   MENSAJES EN TIEMPO REAL
========================================================= */

socket.on(
  "private-message",
  (message) => {

    if (!selectedChatUser) {
      return;
    }


    const ids = [
      Number(
        message.sender_id
      ),

      Number(
        message.receiver_id
      )
    ];


    if (
      ids.includes(
        Number(
          currentUser.id
        )
      ) &&
      ids.includes(
        Number(
          selectedChatUser.id
        )
      )
    ) {

      const box =
        document.getElementById(
          "adminMessages"
        );


      box.insertAdjacentHTML(
        "beforeend",
        renderMessage(
          message
        )
      );


      box.scrollTop =
        box.scrollHeight;
    }
  }
);


/* =========================================================
   INICIO
========================================================= */

loadContent();

loadUsers();