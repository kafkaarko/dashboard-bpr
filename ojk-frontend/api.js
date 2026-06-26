const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error("VITE_API_URL belum diset di file .env");
}

export const api = async (endpoint, customOptions = {}) => {
  // Susunan options yang benar
  const options = {
    credentials: "include",
    ...customOptions, // <-- Ini penting untuk memasukkan method: 'POST' dan body
    headers: {
      "Content-Type": "application/json",
      'ngrok-skip-browser-warning': 'any-value', // <-- Wajib ada agar backend Express tahu ini data JSON
      ...customOptions.headers,
    },
  };

  if (options.body && typeof options.body === "object") {
    options.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_URL}${endpoint}`, options);

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  return response.json();
};