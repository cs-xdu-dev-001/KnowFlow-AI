import { validateClientUploadFile } from "./uploadValidation.js";

export function createAttachmentFlow({ state, request, toast, renderAttachmentTray, requestComposerMenuClose }) {
  async function uploadChatAttachment(file) {
    validateClientUploadFile(file);
    const data = new FormData();
    data.append("file", file);
    const attachment = await request("/api/chat/attachments", { method: "POST", body: data });
    state.chatAttachments.push(attachment);
    renderAttachmentTray();
    toast(`附件已添加：${attachment.filename}`);
  }

  async function handleComposerPaste(event) {
    const clipboardData = event.clipboardData;
    const items = Array.from(clipboardData ? clipboardData.items : []);
    const imageItems = items.filter((item) => item.kind === "file" && item.type.startsWith("image/"));
    if (!imageItems.length) return;

    event.preventDefault();
    try {
      for (const [index, item] of imageItems.entries()) {
        const file = item.getAsFile();
        if (!file) continue;
        const rawExt = (file.type.split("/")[1] || "png").replace("jpeg", "jpg");
        const ext = rawExt.includes("+") ? "png" : rawExt;
        const namedFile = new File([file], `screenshot-${Date.now()}-${index + 1}.${ext}`, { type: file.type || "image/png" });
        await uploadChatAttachment(namedFile);
      }
      requestComposerMenuClose();
    } catch (error) {
      toast(error.message || "截图粘贴失败", 4200, "error");
    }
  }

  function removeChatAttachment(attachmentId) {
    state.chatAttachments = state.chatAttachments.filter((item) => item.attachmentId !== attachmentId);
    renderAttachmentTray();
  }

  return {
    handleComposerPaste,
    removeChatAttachment,
    uploadChatAttachment,
  };
}
