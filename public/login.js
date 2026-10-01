/* =========================================================
   LOGIN - VALENTINA
========================================================= */


/* =========================================================
   ELEMENTOS
========================================================= */

const form =
  document.getElementById(
    "loginForm"
  );

const errorBox =
  document.getElementById(
    "loginError"
  );


/* =========================================================
   INICIAR SESIÓN
========================================================= */

if (form) {

  form.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();


      const emailInput =
        document.getElementById(
          "email"
        );

      const passwordInput =
        document.getElementById(
          "password"
        );


      const email =
        emailInput
          ? emailInput.value.trim()
          : "";

      const password =
        passwordInput
          ? passwordInput.value
          : "";


      if (errorBox) {
        errorBox.textContent = "";
      }


      if (
        !email ||
        !password
      ) {

        if (errorBox) {
          errorBox.textContent =
            "Ingresa tu correo y contraseña.";
        }

        return;
      }


      try {

        const response =
          await fetch(
            "/api/login",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify({
                  email,
                  password
                })
            }
          );


        const contentType =
          response.headers.get(
            "content-type"
          ) || "";


        if (
          !contentType.includes(
            "application/json"
          )
        ) {

          const text =
            await response.text();

          console.error(
            "Respuesta inesperada:",
            text
          );

          throw new Error(
            "El servidor no respondió correctamente."
          );
        }


        const data =
          await response.json();


        if (!response.ok) {

          throw new Error(
            data.error ||
            "No fue posible iniciar sesión."
          );
        }


        if (
          !data.token ||
          !data.user
        ) {

          throw new Error(
            "La respuesta del servidor está incompleta."
          );
        }


        localStorage.setItem(
          "vip_token",
          data.token
        );

        localStorage.setItem(
          "vip_user",
          JSON.stringify(
            data.user
          )
        );


        if (
          data.user.role ===
          "admin"
        ) {

          window.location.href =
            "/admin.html";

          return;
        }


        window.location.href =
          "/vip.html";


      } catch (error) {

        console.error(
          "Error de login:",
          error
        );

        if (errorBox) {

          errorBox.textContent =
            error.message ||
            "Error de conexión con el servidor.";
        }
      }
    }
  );
}


/* =========================================================
   PAGAR SUSCRIPCIÓN
========================================================= */

const subscriptionPaymentBtn =
  document.getElementById(
    "subscriptionPaymentBtn"
  );


if (subscriptionPaymentBtn) {

  subscriptionPaymentBtn.addEventListener(
    "click",
    () => {

      window.location.href =
        "/suscripcion.html";
    }
  );
}
