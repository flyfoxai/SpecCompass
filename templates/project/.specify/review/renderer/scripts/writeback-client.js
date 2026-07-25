/* Capability-scoped, retry-bounded client for the loopback review writer. */
(function () {
  const CONFIG_TIMEOUT_MS = 5_000;
  const SUBMIT_TIMEOUT_MS = 12_000;
  const RETRY_DELAYS_MS = [250, 750];
  let configPromise = null;

  class WritebackClientError extends Error {
    constructor(code, message, options = {}) {
      super(message);
      this.name = "WritebackClientError";
      this.code = code;
      this.status = options.status || 0;
      this.retryable = options.retryable === true;
      this.allowFallback = options.allowFallback === true;
      this.recoveryAction = options.recoveryAction || "retry_writeback";
      this.attempts = options.attempts || 1;
    }
  }

  function delay(milliseconds) {
    return new Promise((resolveDelay) => window.setTimeout(resolveDelay, milliseconds));
  }

  function requestId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    const bytes = new Uint8Array(16);
    window.crypto?.getRandomValues?.(bytes);
    const suffix = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
    return `writeback-${Date.now()}-${suffix || Math.random().toString(36).slice(2)}`;
  }

  async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new WritebackClientError("WRITEBACK_TIMEOUT", `local writeback timed out after ${timeoutMs}ms`, {
          retryable: true,
          allowFallback: true,
          recoveryAction: "retry_then_download"
        });
      }
      throw new WritebackClientError("WRITEBACK_NETWORK_ERROR", error?.message || "local writeback network request failed", {
        retryable: true,
        allowFallback: true,
        recoveryAction: "retry_then_download"
      });
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function responseError(response) {
    const text = await response.text();
    let body = null;
    try { body = JSON.parse(text); } catch { /* legacy text response */ }
    const detail = body?.error || {};
    return new WritebackClientError(
      detail.code || `HTTP_${response.status}`,
      detail.message || text.trim() || `local writeback failed (HTTP ${response.status})`,
      {
        status: response.status,
        retryable: detail.retryable === true || response.status >= 500,
        allowFallback: detail.allow_fallback === true,
        recoveryAction: detail.recovery_action || (response.status === 409 ? "reload_review" : "fix_and_retry")
      }
    );
  }

  async function loadConfig() {
    if (!configPromise) {
      configPromise = (async () => {
        const response = await fetchWithTimeout("/__speccompass/writeback-config", {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin"
        }, CONFIG_TIMEOUT_MS);
        if (!response.ok) throw await responseError(response);
        const config = await response.json();
        if (!config?.endpoint || !config?.token || !config?.target_version) {
          throw new WritebackClientError("INVALID_WRITEBACK_CONFIG", "local writeback configuration is incomplete", {
            recoveryAction: "reload_review"
          });
        }
        return config;
      })().catch((error) => {
        configPromise = null;
        throw error;
      });
    }
    return configPromise;
  }

  async function submit(payload) {
    if (!payload || typeof payload !== "object") {
      throw new WritebackClientError("INVALID_WRITEBACK_PAYLOAD", "local writeback payload is required");
    }
    if (!payload.request_id) payload.request_id = requestId();

    let lastError = null;
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        const config = await loadConfig();
        if (!payload.expected_target_version) payload.expected_target_version = config.target_version;
        const response = await fetchWithTimeout(config.endpoint, {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            "X-SpecCompass-Writeback-Token": config.token,
            "X-SpecCompass-Writeback-Request-ID": payload.request_id
          },
          body: JSON.stringify(payload)
        }, SUBMIT_TIMEOUT_MS);
        if (!response.ok) throw await responseError(response);
        const text = await response.text();
        let result;
        try { result = JSON.parse(text); }
        catch { throw new WritebackClientError("INVALID_WRITEBACK_RESPONSE", "local writeback returned an invalid response", { retryable: true, allowFallback: true }); }
        if (!result?.ok || !result?.target_version) {
          throw new WritebackClientError("INVALID_WRITEBACK_RESPONSE", "local writeback response is incomplete", { retryable: true, allowFallback: true });
        }
        config.target_version = result.target_version;
        return result;
      } catch (error) {
        lastError = error instanceof WritebackClientError
          ? error
          : new WritebackClientError("WRITEBACK_CLIENT_ERROR", error?.message || String(error));
        lastError.attempts = attempt + 1;
        if (!lastError.retryable || attempt === RETRY_DELAYS_MS.length) break;
        await delay(RETRY_DELAYS_MS[attempt]);
      }
    }
    throw lastError;
  }

  window.SpecCompassWriteback = {
    loadConfig,
    submit,
    WritebackClientError,
    limits: {
      config_timeout_ms: CONFIG_TIMEOUT_MS,
      submit_timeout_ms: SUBMIT_TIMEOUT_MS,
      max_attempts: RETRY_DELAYS_MS.length + 1
    }
  };
})();
