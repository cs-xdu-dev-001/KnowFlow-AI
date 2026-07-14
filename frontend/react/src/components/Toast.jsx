import { useEffect, useRef, useState } from "react";

export function Toast() {
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState("neutral");
  const [visible, setVisible] = useState(false);
  const toastTimerRef = useRef(null);

  useEffect(() => {
    const handleToast = (event) => {
      const nextMessage = String(event.detail?.message || "");
      if (!nextMessage) return;
      window.clearTimeout(toastTimerRef.current);
      setMessage(nextMessage);
      setTone(event.detail?.tone || event.detail?.type || "neutral");
      setVisible(true);
      toastTimerRef.current = window.setTimeout(() => setVisible(false), event.detail?.duration || 2400);
    };
    window.addEventListener("knowflow:react-toast", handleToast);
    return () => {
      window.removeEventListener("knowflow:react-toast", handleToast);
      window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const baseClassName = tone === "error" ? "toast error" : "toast";
  const className = visible ? `${baseClassName} show` : baseClassName;

  return (
    <div className={className} id={"toast"} role={tone === "error" ? "alert" : "status"} aria-live={tone === "error" ? "assertive" : "polite"}>
      {message}
    </div>
  );
}
