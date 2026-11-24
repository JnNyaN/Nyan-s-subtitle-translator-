javascript
export default async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: { message: "Method Not Allowed" } }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { apiKey, modelName, requestBody } = await req.json();

    if (!apiKey || !modelName || !requestBody) {
      return new Response(
        JSON.stringify({ error: { message: "Missing required fields (apiKey, modelName, requestBody)" } }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const googleUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const googleResponse = await fetch(googleUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const responseText = await googleResponse.text();

    return new Response(responseText, {
      status: googleResponse.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: { message: error.message || "Netlify Proxy Error" } }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
};
