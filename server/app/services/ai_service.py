import os
from typing import Any
from urllib import error, request

from dotenv import load_dotenv
from fastapi import HTTPException


load_dotenv()


SYSTEM_PROMPT = (
    "You are an expert frontend engineer. Convert the provided UI screenshot into a "
    "single React component using Tailwind CSS classes only. Return only code in one "
    "markdown code block. Do not include explanations."
)


async def generate_code_from_image(base64_image: str, mime_type: str = "image/png") -> str:
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    openai_api_key = os.getenv("OPENAI_API_KEY")

    # Use Gemini first when GEMINI_API_KEY is configured, without requiring openai package.
    if gemini_api_key:
        return await _generate_with_gemini_http(base64_image, gemini_api_key, mime_type)

    # OpenAI path (only used if OPENAI_API_KEY is configured).
    try:
        from openai import AsyncOpenAI
    except ImportError as exc:
        raise RuntimeError(
            "The 'openai' package is not available for this Python interpreter. "
            "Install dependencies and run with: python -m uvicorn app.main:app --reload"
        ) from exc

    if not openai_api_key:
        raise RuntimeError("Set GEMINI_API_KEY (or OPENAI_API_KEY) in environment variables.")

    client = AsyncOpenAI(api_key=openai_api_key)
    model_name = os.getenv("MODEL_NAME", "gpt-4o")

    response = await client.responses.create(
        model=model_name,
        input=[
            {
                "role": "system",
                "content": [
                    {"type": "input_text", "text": SYSTEM_PROMPT},
                ],
            },
            {
                "role": "user",
                "content": [
                    {"type": "input_text", "text": "Generate the React component for this UI image."},
                    {"type": "input_image", "image_url": f"data:{mime_type};base64,{base64_image}"},
                ],
            },
        ],
    )
    return response.output_text


async def _generate_with_gemini_http(base64_image: str, api_key: str, mime_type: str) -> str:
    import asyncio
    import json

    model_name = os.getenv("MODEL_NAME", "gemini-2.5-flash")

    payload: dict[str, Any] = {
        "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": "Generate the React component for this UI image."},
                    {"inline_data": {"mime_type": mime_type, "data": base64_image}},
                ],
            }
        ],
    }

    last_error_message = "Unknown Gemini error"
    saw_503 = False

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"
        f"?key={api_key}"
    )

    for attempt in range(3):
        req = request.Request(
            url=url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        def _send() -> dict[str, Any]:
            with request.urlopen(req, timeout=60) as resp:
                return json.loads(resp.read().decode("utf-8"))

        try:
            data = await asyncio.to_thread(_send)
            parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
            text = "".join(part.get("text", "") for part in parts if isinstance(part, dict)).strip()
            if text:
                return text
            last_error_message = f"Gemini returned no text output: {data}"
        except error.HTTPError as exc:
            err_body = exc.read().decode("utf-8", errors="replace")
            last_error_message = f"Gemini API error ({model_name}): {exc.code} {err_body}"

            # Retry up to 3 total attempts only for 503 high-demand responses.
            if exc.code == 503:
                saw_503 = True
                if attempt < 2:
                    await asyncio.sleep(2)
                    continue
        except Exception as exc:
            last_error_message = f"Gemini request failed ({model_name}): {exc}"

        break

    if saw_503:
        raise HTTPException(
            status_code=503,
            detail="Gemini model is experiencing high demand. Please try again in a few seconds.",
        )

    raise RuntimeError(last_error_message)
