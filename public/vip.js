/* =========================================================
   BOTÓN PAGAR SUSCRIPCIÓN
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