import "dotenv/config";
async function test() {
  try {
    const res = await fetch("http://localhost:3000/api/gemini/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "hello" })
    });
    const data = await res.json();
    console.log(res.status, data);
  } catch(e) {
    console.error(e);
  }
}
test();
