import { useState } from "react";
import api from "../../services/api";

export default function CreateNotice() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post("/notices", {
      title,
      content,
      expiresAt: new Date(expiresAt),
    });
    setTitle("");
    setContent("");
    setExpiresAt("");
    alert("Notice posted");
  };

  return (
    <form onSubmit={submit}>
      <h3>Create Notice</h3>

      <input
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />

      <textarea
        placeholder="Content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        required
      />

      <input
        type="datetime-local"
        placeholder="Expires At"
        value={expiresAt}
        onChange={(e) => setExpiresAt(e.target.value)}
        required
      />

      <button type="submit">Post</button>
    </form>
  );
}
