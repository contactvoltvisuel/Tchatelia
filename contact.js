const contactForm = document.querySelector("#contactForm");
const contactStatus = document.querySelector("#contactStatus");

contactForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(contactForm);
  const submitButton = contactForm.querySelector("button");
  submitButton.disabled = true;
  contactStatus.className = "contact-status";
  contactStatus.textContent = "Envoi en cours...";

  try {
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        subject: formData.get("subject"),
        message: formData.get("message"),
        website: formData.get("website"),
        accepted: formData.get("accepted") === "yes",
      }),
    });
    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(result.error || "Le message n'a pas pu etre envoye.");
    }

    contactForm.reset();
    contactStatus.className = "contact-status success";
    contactStatus.textContent = "Ton message a bien ete envoye.";
  } catch (error) {
    contactStatus.className = "contact-status error";
    contactStatus.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});
