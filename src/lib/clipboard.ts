/**
 * Clipboard write with a fallback for insecure contexts.
 *
 * The Clipboard API is unavailable over plain HTTP, which is how the app runs
 * in local development and in preview environments behind a proxy. When it is
 * missing we fall back to a hidden textarea + execCommand. The return value is
 * the truth about whether the copy worked — the UI must never claim success
 * when this returns false.
 */
export async function copyText(text: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission denied or API unavailable — fall through to the fallback.
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-1000px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
