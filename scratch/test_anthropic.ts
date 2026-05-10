import Anthropic from "@anthropic-ai/sdk";

async function test() {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  try {
    const msg = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 10,
      messages: [{ role: "user", content: "hi" }],
    });
    console.log("Anthropic Success:", msg.content[0].text);
  } catch (err) {
    console.error("Anthropic Failure:", err.message);
  }
}

test();
