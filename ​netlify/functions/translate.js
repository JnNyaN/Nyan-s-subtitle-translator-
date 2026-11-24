
exports.handler = async function (event, context) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  const send = (statusCode, data) => ({
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(data),
  });

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return send(405, {
      error: { message: "Method Not Allowed" },
    });
  }

  try {
    const { apiKey, modelName, requestBody } =
      JSON.parse(event.body || "{}");

    if (!apiKey || !modelName) {
      return send(400, {
        error: { message: "Missing API Key or Model Name" },
      });
    }

    // Normalize Model ID
    const cleanModel = modelName
      .trim()
      .replace(/^models\//, "");

    const headers = {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    };

    const baseUrl =
      "https://generativelanguage.googleapis.com/v1beta";

    // Check model and supported methods
    if (!requestBody) {
      return send(400, {
        error: { message: "Missing requestBody" },
      });
    }

    const googleUrl =
      `${baseUrl}/models/${encodeURIComponent(cleanModel)}:generateContent`;

    const googleResponse = await fetch(googleUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    const responseText = await googleResponse.text();

    let responseData;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { rawResponse: responseText };
    }

    // Extra diagnostics for 404
    if (googleResponse.status === 404) {
      let modelInfo = null;
      let listError = null;

      try {
        const listResponse = await fetch(
          `${baseUrl}/models?pageSize=100`,
          {
            method: "GET",
            headers: {
              "x-goog-api-key": apiKey,
            },
          }
        );

        const listText = await listResponse.text();
        const listData = JSON.parse(listText);

        if (listResponse.ok) {
          const found = (listData.models || []).find(
            model =>
              model.name === `models/${cleanModel}`
          );

          modelInfo = found
            ? {
                found: true,
                name: found.name,
                supportedMethods:
                  found.supportedGenerationMethods || [],
              }
            : {
                found: false,
                message:
                  "Model not found in the first page of available models.",
              };
        } else {
          listError = listData;
        }
      } catch (err) {
        listError = { message: err.message };
      }

      return send(404, {
        error: {
          message:
            responseData?.error?.message ||
            "Gemini Model Not Found",
          details: responseData,
        },
        diagnostics: {
          requestedModel: cleanModel,
          modelInfo,
          listError,
        },
      });
    }

    // Other API errors
    if (!googleResponse.ok) {
      return send(googleResponse.status, {
        error: {
          message:
            responseData?.error?.message ||
            "Google Gemini API Error",
          details: responseData,
        },
      });
    }

    // Success
    return send(200, responseData);

  } catch (error) {
    console.error("Proxy Error:", error.message);

    return send(500, {
      error: {
        message: error.message || "Proxy Error",
      },
    });
  }
};
