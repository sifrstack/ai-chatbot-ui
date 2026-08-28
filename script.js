// =========================
// Config
// =========================

// Auto switch:
// - Local dev: Flask on http://127.0.0.1:5000
// - Deployed frontend (GitHub Pages): backend on Render
const API_BASE =
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "localhost"
    ? "http://127.0.0.1:5000"
    : "https://ai-chatbot-ui-ibps.onrender.com";


// =========================
// UI wiring
// =========================

document
  .getElementById("send-btn")
  .addEventListener("click", sendMessage);

document
  .getElementById("user-input")
  .addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  });


// =========================
// Send message
// =========================

async function sendMessage() {
  const inputField = document.getElementById("user-input");

  const message = inputField.value.trim();

  if (!message) {
    return;
  }

  appendMessage("You", message);

  inputField.value = "";

  // Create empty bot message that will be updated while streaming
  const botEl = appendMessage("Bot", "");

  try {
    const result = await getChatGPTReply(message);

    // ---------------------------------
    // Non-streaming response
    // ---------------------------------

    if (result.mode === "full") {
      botEl.innerText = `Bot: ${result.text}`;
      return;
    }

    // ---------------------------------
    // Streaming response
    // ---------------------------------

    botEl.innerText = "Bot: ";

    await result.pump((_chunk, fullText) => {
      botEl.innerText = `Bot: ${fullText}`;

      const chatWindow = document.getElementById("chat-window");
      chatWindow.scrollTop = chatWindow.scrollHeight;
    });

  } catch (err) {
    console.error("Chat request failed:", err);

    botEl.innerText =
      "Bot: Sorry, the server did not respond. Please try again in a few seconds.";
  }
}


// =========================
// Add message to chat
// =========================

function appendMessage(sender, text) {
  const chatWindow = document.getElementById("chat-window");

  const messageEl = document.createElement("div");

  messageEl.className = `my-2 p-2 rounded ${
    sender === "You"
      ? "bg-blue-100 text-right"
      : "bg-gray-200"
  }`;

  messageEl.innerText = `${sender}: ${text}`;

  chatWindow.appendChild(messageEl);

  chatWindow.scrollTop = chatWindow.scrollHeight;

  return messageEl;
}


// =========================
// Streaming API call
// =========================

async function getChatGPTReply(message) {
  const res = await fetch(`${API_BASE}/api/chat/stream`, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
      "Accept": "text/event-stream",
    },

    body: JSON.stringify({
      message: message,
    }),
  });


  // =========================
  // Handle HTTP errors
  // =========================

  const contentType =
    res.headers.get("content-type") || "";

  if (!res.ok) {
    if (contentType.includes("application/json")) {
      const data = await res.json();

      let errorMessage =
        data.error ||
        "The server returned an error.";

      // Friendly quota message
      if (
        res.status === 429 ||
        String(errorMessage)
          .toLowerCase()
          .includes("quota")
      ) {
        errorMessage =
          "The AI service has temporarily reached its usage limit. Please try again later.";
      }

      return {
        mode: "full",
        text: errorMessage,
      };
    }

    return {
      mode: "full",
      text: `Server error (${res.status}).`,
    };
  }


  // =========================
  // Fallback if not SSE
  // =========================

  if (!contentType.includes("text/event-stream")) {
    if (contentType.includes("application/json")) {
      const data = await res.json();

      return {
        mode: "full",
        text:
          data.reply ||
          data.error ||
          JSON.stringify(data),
      };
    }

    const txt = await res.text();

    return {
      mode: "full",
      text: txt,
    };
  }


  // =========================
  // SSE streaming
  // =========================

  if (!res.body) {
    throw new Error("Streaming response body is unavailable.");
  }

  const reader = res.body.getReader();

  const decoder = new TextDecoder("utf-8");

  let buffer = "";

  let fullText = "";

  let streamFinished = false;


  // =========================
  // Return streaming controller
  // =========================

  return {
    mode: "stream",

    async pump(onChunk) {
      while (!streamFinished) {
        const { value, done } = await reader.read();

        // ---------------------------------
        // Network stream finished
        // ---------------------------------

        if (done) {
          break;
        }


        // ---------------------------------
        // Decode incoming bytes
        // ---------------------------------

        buffer += decoder.decode(value, {
          stream: true,
        });


        // ---------------------------------
        // SSE events end with blank line
        // ---------------------------------

        const events = buffer.split(/\r?\n\r?\n/);

        buffer = events.pop() || "";


        // ---------------------------------
        // Process each complete event
        // ---------------------------------

        for (const event of events) {
          const lines = event.split(/\r?\n/);

          const dataLines = lines
            .filter((line) => line.startsWith("data:"))
            .map((line) => {
              // Remove "data:" and exactly ONE optional
              // SSE separator space.
              let value = line.slice(5);

              if (value.startsWith(" ")) {
                value = value.slice(1);
              }

              return value;
            });

          if (dataLines.length === 0) {
            continue;
          }


          // ---------------------------------
          // JSON SSE format
          // ---------------------------------

          const rawData = dataLines.join("\n");

          if (rawData === "[DONE]") {
            streamFinished = true;
            break;
          }


          let chunk = "";

          try {
            const parsed = JSON.parse(rawData);

            if (
              parsed &&
              typeof parsed.chunk === "string"
            ) {
              chunk = parsed.chunk;
            } else if (
              parsed &&
              typeof parsed.reply === "string"
            ) {
              chunk = parsed.reply;
            } else if (
              parsed &&
              typeof parsed.error === "string"
            ) {
              chunk = `Error: ${parsed.error}`;
            }

          } catch {
            // ---------------------------------
            // Backwards-compatible fallback
            // for old raw SSE responses.
            // ---------------------------------

            chunk = rawData;
          }


          // ---------------------------------
          // Add chunk exactly as received
          // ---------------------------------

          if (chunk) {
            fullText += chunk;

            onChunk(chunk, fullText);
          }
        }
      }


      // ---------------------------------
      // Flush TextDecoder
      // ---------------------------------

      const finalText = decoder.decode();

      if (finalText) {
        buffer += finalText;
      }


      return fullText;
    },
  };
}