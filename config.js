// Settings that change without touching the app code.
window.CONFIG = {
  // Access check endpoint (Yandex Cloud Function). Empty = no check (test mode).
  accessApi: "",
  // Where buyers without access are sent.
  buyUrl: "",
  // Support / questions: a Telegram username without @, e.g. "svetlana_support".
  supportUsername: "",
  // Review mode for Svetlana: add ?review=1 to the link to show the "remark" button.
  reviewParam: "review",
  // Telegram username (without @) who receives review remarks; empty = share sheet.
  reviewTo: "",
};
