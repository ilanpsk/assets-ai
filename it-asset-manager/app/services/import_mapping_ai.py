from typing import List, Dict, Any, Optional
import json
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from langchain_core.messages import SystemMessage, HumanMessage

from app.models.system_setting import SystemSetting
from app.ai.core.llm import get_llm_client

logger = logging.getLogger(__name__)

SYSTEM_FIELD_DESCRIPTIONS = {
    "name": "The primary name or title of the asset (e.g. 'Dell XPS 15', 'MacBook Pro')",
    "serial_number": "Unique hardware identifier (e.g. SN-12345, Service Tag)",
    "status": "Current lifecycle state (e.g. Active, In Stock, Broken, Retired)",
    "location": "Physical location (e.g. New York Office, Warehouse A)",
    "asset_type_id": "Category or type of device (e.g. Laptop, Monitor, Printer)",
    "purchase_date": "Date the asset was bought",
    "purchase_price": "Cost of the asset",
    "vendor": "Supplier or vendor name",
    "order_number": "Purchase order number or invoice ID",
    "warranty_end": "Date when warranty expires",
}

async def suggest_mapping(
    db: AsyncSession, 
    headers: List[str], 
    preview_rows: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Uses AI to suggest mappings for unknown headers to system fields.
    Returns a dict with suggestions: 
    { "suggestions": [{"header": "Current State", "target": "status", "confidence": 0.9, "reason": "..."}] }
    """
    try:
        # 1. Check if AI is configured
        res = await db.execute(
            select(SystemSetting).where(SystemSetting.key.in_(['ai_provider', 'ai_api_key', 'ai_model']))
        )
        settings_map = {s.key: s.value for s in res.scalars().all()}
        
        provider = settings_map.get('ai_provider')
        api_key = settings_map.get('ai_api_key')
        
        if not provider or not api_key:
            logger.info("AI mapping skipped: Provider or API Key not configured.")
            return {"suggestions": []}

        # 2. Prepare Prompt
        llm = get_llm_client(
            api_key=api_key,
            provider=provider,
            model_name=settings_map.get('ai_model')
        )
        
        # Format preview for context (limit to 3 rows to save tokens)
        preview_text = json.dumps(preview_rows[:3], default=str)
        
        system_prompt = f"""You are an IT Asset Management data expert.
Your goal is to map CSV headers to our internal system fields based on their name and data samples.

Supported System Fields:
{json.dumps(SYSTEM_FIELD_DESCRIPTIONS, indent=2)}

Instructions:
1. Analyze the 'headers' and 'preview_data'.
2. For each header, determine if it strongly matches one of the System Fields.
3. Ignore headers that are clearly custom attributes (e.g. 'Color', 'Weight') or already match exactly.
4. Return a JSON object with a list of suggestions.
5. ONLY suggest if confidence is high (> 0.7).
6. Strict JSON output only. No markdown.

Output Format:
{{
  "suggestions": [
    {{
      "header": "CSV Header Name",
      "target": "system_field_key",
      "confidence": 0.0-1.0,
      "reason": "Brief explanation"
    }}
  ]
}}
"""
        
        user_prompt = f"""
Headers: {json.dumps(headers)}
Preview Data: {preview_text}
"""

        # 3. Call LLM
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt)
        ]
        
        response = await llm.ainvoke(messages)
        content = response.content
        
        # Clean markdown if present
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
            
        result = json.loads(content)
        return result

    except Exception as e:
        logger.error(f"AI Mapping suggestion failed: {str(e)}", exc_info=True)
        return {"suggestions": []}
