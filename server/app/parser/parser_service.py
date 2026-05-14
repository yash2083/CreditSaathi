"""Invoice parsing service using Google Gemma 4 31B via OpenRouter.

Accepts a base64-encoded invoice image, sends it to the vision LLM,
and returns structured GST data as a Python dict.
"""

import base64
import json
import re
import httpx

from app.config import settings

EXTRACTION_PROMPT = """You are a GST tax invoice parser for Indian invoices. Analyze this invoice image and extract ALL data into the exact JSON structure below. Be precise with numbers — do not round.

Return ONLY valid JSON, no markdown fences, no explanation:

{
  "seller": {
    "name": "",
    "gstin": "",
    "address": "",
    "state": "",
    "state_code": ""
  },
  "buyer": {
    "name": "",
    "gstin": "",
    "address": "",
    "state": "",
    "state_code": ""
  },
  "invoice": {
    "invoice_number": "",
    "invoice_date": "",
    "place_of_supply": "",
    "hsn_sac_code": "",
    "irn": "",
    "ack_number": ""
  },
  "line_items": [
    {
      "description": "",
      "hsn_sac": "",
      "quantity": 0,
      "unit": "",
      "rate": 0.0,
      "discount": 0.0,
      "taxable_value": 0.0,
      "cgst_rate": 0.0,
      "cgst_amount": 0.0,
      "sgst_rate": 0.0,
      "sgst_amount": 0.0,
      "igst_rate": 0.0,
      "igst_amount": 0.0,
      "total": 0.0
    }
  ],
  "tax_summary": {
    "total_taxable_value": 0.0,
    "total_cgst": 0.0,
    "total_sgst": 0.0,
    "total_igst": 0.0,
    "total_tax": 0.0,
    "total_amount": 0.0,
    "amount_in_words": ""
  },
  "metadata": {
    "payment_mode": "",
    "order_id": "",
    "e_way_bill": "",
    "transport": "",
    "reverse_charge": false
  }
}

Rules:
- Use 0.0 for missing numeric fields, "" for missing text fields
- Dates in DD-MM-YYYY format
- All amounts in INR (numeric, no currency symbols)
- If only IGST is present (inter-state), set CGST/SGST to 0
- If only CGST+SGST is present (intra-state), set IGST to 0
"""


async def parse_invoice_image(image_bytes: bytes, content_type: str) -> dict:
    """Send an invoice image to Gemma 4 31B and return parsed data.

    Args:
        image_bytes: Raw bytes of the uploaded image.
        content_type: MIME type (e.g. 'image/png', 'image/jpeg').

    Returns:
        dict with structured invoice data, or error dict on failure.
    """
    if not settings.OPENROUTER_API_KEY:
        return {"error": "OPENROUTER_API_KEY is not configured on the server."}

    # Encode image to base64 data URI
    b64 = base64.b64encode(image_bytes).decode("utf-8")
    data_uri = f"data:{content_type};base64,{b64}"

    model = getattr(settings, "OPENROUTER_MODEL", "google/gemma-4-31b-it:free")

    payload = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": EXTRACTION_PROMPT},
                    {"type": "image_url", "image_url": {"url": data_uri}},
                ],
            }
        ],
        "max_tokens": 4096,
        "temperature": 0.1,
    }

    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://creditsaathi.app",
        "X-Title": "CreditSaathi Invoice Parser",
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            resp = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                json=payload,
                headers=headers,
            )
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            return {"error": f"OpenRouter API error: {e.response.status_code} — {e.response.text[:300]}"}
        except httpx.RequestError as e:
            return {"error": f"Network error calling OpenRouter: {str(e)}"}

    data = resp.json()

    # Extract the text content from the LLM response
    try:
        raw_text = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError):
        return {"error": "Unexpected response structure from OpenRouter.", "raw": data}

    # Parse JSON from LLM output (handle markdown fences if present)
    json_str = raw_text.strip()
    # Strip ```json ... ``` wrapper if present
    fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", json_str)
    if fence_match:
        json_str = fence_match.group(1).strip()

    try:
        parsed = json.loads(json_str)
    except json.JSONDecodeError:
        return {"error": "Failed to parse LLM output as JSON.", "raw_text": raw_text}

    return parsed
