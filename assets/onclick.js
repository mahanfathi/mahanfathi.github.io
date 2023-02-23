function copyToClipboard(event, message) {
  navigator.clipboard.writeText(message)
    .then(() => {
      // Clear previous pop-up message
      if (prevPopup) {
        document.body.removeChild(prevPopup);
      }

      // Create new pop-up message
      var popup = document.createElement("div");
      popup.innerHTML = message + " copied to clipboard";
      popup.classList.add("popup");
      popup.style.left = event.pageX + "px";
      popup.style.top = event.pageY + "px";
      document.body.appendChild(popup);

      // Remove pop-up after 3 seconds
      setTimeout(() => {
        document.body.removeChild(popup);
      }, 3000);
    })
    .catch((err) => {
      console.error("Could not copy text: ", err);
    });
}

var prevPopup = null;
