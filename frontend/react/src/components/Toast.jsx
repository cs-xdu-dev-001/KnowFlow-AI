import { useEffect, useRef, useState } from "react";

export function Toast() {
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);
  const toastTimerRef = useRef(null);

  useEffect(() => {
    const handleToast = (event) => {
      const nextMessage = String(event.detail?.message || "");
      if (!nextMessage) return;
      window.clearTimeout(toastTimerRef.current);
      setMessage(nextMessage);
      setVisible(true);
      toastTimerRef.current = window.setTimeout(() => setVisible(false), event.detail?.duration || 2400);
    };
    window.addEventListener("knowflow:legacy-toast", handleToast);
    return () => {
      window.removeEventListener("knowflow:legacy-toast", handleToast);
      window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  return (
    <div className={visible ? "toast show" : "toast"} id={"toast"} role={"status"} aria-live={"polite"}>
      {message}
    </div>
  );
}
