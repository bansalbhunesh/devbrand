import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("completeText llm routing", () => {
  const prev = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "{\"ok\": true}" } }],
        }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...prev };
    vi.restoreAllMocks();
  });

  it("uses OpenAI-compatible chat/completions when LLM_PROVIDER=openai_compatible", async () => {
    process.env.LLM_PROVIDER = "openai_compatible";
    process.env.OPENAI_COMPAT_BASE_URL = "http://127.0.0.1:11434/v1";
    process.env.OPENAI_COMPAT_MODEL = "test-model";
    process.env.OPENAI_COMPAT_API_KEY = "";

    const { completeText } = await import("./client");
    const text = await completeText({
      system: "SYS",
      user: "USR",
      maxTokens: 10,
      temperature: 0.2,
    });

    expect(text).toContain("ok");
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:11434/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe("test-model");
    expect(body.messages).toEqual([
      { role: "system", content: "SYS" },
      { role: "user", content: "USR" },
    ]);
  });

  it("sends Bearer when OPENAI_COMPAT_API_KEY is set", async () => {
    process.env.LLM_PROVIDER = "openai_compatible";
    process.env.OPENAI_COMPAT_BASE_URL = "https://api.example/v1/";
    process.env.OPENAI_COMPAT_MODEL = "m";
    process.env.OPENAI_COMPAT_API_KEY = "sekret";

    const { completeText } = await import("./client");
    await completeText({ system: "a", user: "b", maxTokens: 5 });

    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer sekret");
  });

  it("infers Gemini OpenAI-compat base when GEMINI_API_KEY is set and URL omitted", async () => {
    process.env.LLM_PROVIDER = "openai_compatible";
    delete process.env.OPENAI_COMPAT_BASE_URL;
    delete process.env.OLLAMA_HOST;
    delete process.env.OPENHUMAN_OLLAMA_BASE_URL;
    process.env.GEMINI_API_KEY = "g-test";
    delete process.env.OPENAI_COMPAT_API_KEY;
    delete process.env.OPENAI_COMPAT_MODEL;
    delete process.env.GEMINI_MODEL;

    const { completeText } = await import("./client");
    await completeText({ system: "s", user: "u", maxTokens: 5 });

    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe("gemini-2.0-flash");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer g-test");
  });
});
