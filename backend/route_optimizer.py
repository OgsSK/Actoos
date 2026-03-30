"""
Route Optimization Service using AI
Optimizes technician routes based on locations, time windows, and priorities
"""
import os
import json
import logging
from datetime import datetime
from typing import List, Dict, Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# System prompt for route optimization
ROUTE_OPTIMIZER_PROMPT = """Tu es un expert en optimisation de tournées pour les techniciens de terrain.

Ton rôle est d'analyser une liste d'interventions et de suggérer l'ordre optimal de visite pour minimiser les temps de trajet tout en respectant les contraintes.

Critères d'optimisation (par ordre de priorité):
1. **Priorité urgente** - Les interventions urgentes doivent être faites en premier
2. **Créneaux horaires** - Respecter les heures de rendez-vous fixes
3. **Proximité géographique** - Regrouper les interventions par zone
4. **Efficacité** - Minimiser les allers-retours

Pour chaque suggestion, fournis:
- L'ordre optimal des interventions (liste d'IDs)
- Une estimation du temps total de trajet
- Des conseils pratiques pour le technicien

Réponds UNIQUEMENT en JSON avec ce format:
{
  "optimized_order": ["id1", "id2", "id3"],
  "total_estimated_time_minutes": 120,
  "total_interventions": 3,
  "route_summary": "Description courte du parcours",
  "tips": ["Conseil 1", "Conseil 2"],
  "zones": [{"name": "Zone Nord", "interventions": ["id1", "id2"]}]
}
"""

async def optimize_route(interventions: List[Dict], start_address: Optional[str] = None) -> Dict:
    """
    Optimize the route for a list of interventions using AI
    
    Args:
        interventions: List of intervention dicts with id, titre, adresse, ville, 
                      date_prevue, priorite, client info
        start_address: Optional starting point (e.g., technician's home or depot)
    
    Returns:
        Dict with optimized_order, estimated time, tips, etc.
    """
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        logger.warning("EMERGENT_LLM_KEY not set, returning original order")
        return {
            "optimized_order": [i["id"] for i in interventions],
            "total_estimated_time_minutes": len(interventions) * 30,
            "total_interventions": len(interventions),
            "route_summary": "Optimisation non disponible - clé API manquante",
            "tips": [],
            "zones": [],
            "ai_optimized": False
        }
    
    if len(interventions) == 0:
        return {
            "optimized_order": [],
            "total_estimated_time_minutes": 0,
            "total_interventions": 0,
            "route_summary": "Aucune intervention à planifier",
            "tips": [],
            "zones": [],
            "ai_optimized": False
        }
    
    if len(interventions) == 1:
        return {
            "optimized_order": [interventions[0]["id"]],
            "total_estimated_time_minutes": 30,
            "total_interventions": 1,
            "route_summary": f"Une seule intervention: {interventions[0].get('titre', 'Intervention')}",
            "tips": [],
            "zones": [],
            "ai_optimized": False
        }
    
    # Prepare intervention data for AI
    intervention_data = []
    for i, inv in enumerate(interventions):
        client = inv.get("client", {}) or {}
        data = {
            "index": i + 1,
            "id": inv["id"],
            "titre": inv.get("titre", "Intervention"),
            "adresse": inv.get("adresse", "") or client.get("adresse", ""),
            "ville": inv.get("ville", "") or client.get("ville", ""),
            "code_postal": inv.get("code_postal", "") or client.get("code_postal", ""),
            "heure_prevue": inv.get("date_prevue", "")[:16] if inv.get("date_prevue") else "",
            "priorite": inv.get("priorite", "normale"),
            "duree_estimee_min": inv.get("duree_estimee", 60),
            "client_nom": f"{client.get('nom', '')} {client.get('prenom', '')}".strip() or "Client"
        }
        intervention_data.append(data)
    
    # Build the prompt
    user_prompt = f"""Voici les interventions à optimiser pour aujourd'hui:

{json.dumps(intervention_data, indent=2, ensure_ascii=False)}

"""
    if start_address:
        user_prompt += f"Point de départ du technicien: {start_address}\n\n"
    
    user_prompt += "Analyse ces interventions et propose l'ordre optimal de visite."
    
    try:
        # Initialize LLM chat
        chat = LlmChat(
            api_key=api_key,
            session_id=f"route-opt-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            system_message=ROUTE_OPTIMIZER_PROMPT
        ).with_model("openai", "gpt-4o")
        
        # Send message
        response = await chat.send_message(UserMessage(text=user_prompt))
        
        # Parse JSON response
        try:
            # Clean response - remove markdown code blocks if present
            response_text = response.strip()
            if response_text.startswith("```"):
                response_text = response_text.split("```")[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]
            response_text = response_text.strip()
            
            result = json.loads(response_text)
            result["ai_optimized"] = True
            
            # Validate that all IDs are present
            original_ids = set(i["id"] for i in interventions)
            optimized_ids = set(result.get("optimized_order", []))
            
            if optimized_ids != original_ids:
                logger.warning("AI returned different IDs, falling back to original order")
                result["optimized_order"] = [i["id"] for i in interventions]
                result["route_summary"] = "Ordre original conservé (erreur d'optimisation)"
            
            return result
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response as JSON: {e}")
            logger.error(f"Response was: {response[:500]}")
            return {
                "optimized_order": [i["id"] for i in interventions],
                "total_estimated_time_minutes": len(interventions) * 30,
                "total_interventions": len(interventions),
                "route_summary": "Ordre original (erreur de parsing IA)",
                "tips": [],
                "zones": [],
                "ai_optimized": False,
                "error": "Failed to parse AI response"
            }
            
    except Exception as e:
        logger.error(f"Route optimization error: {e}")
        return {
            "optimized_order": [i["id"] for i in interventions],
            "total_estimated_time_minutes": len(interventions) * 30,
            "total_interventions": len(interventions),
            "route_summary": f"Ordre original (erreur: {str(e)[:50]})",
            "tips": [],
            "zones": [],
            "ai_optimized": False,
            "error": str(e)
        }


async def get_route_suggestions(
    interventions: List[Dict],
    technicien_id: str,
    date: str
) -> Dict:
    """
    Get AI-powered route suggestions for a technician's day
    
    Args:
        interventions: List of interventions for the day
        technicien_id: Technician ID
        date: Date string (YYYY-MM-DD)
    
    Returns:
        Route optimization result with suggestions
    """
    # Filter to only planned interventions
    planned = [i for i in interventions if i.get("statut") in ["planifiee", "en_cours"]]
    
    if not planned:
        return {
            "date": date,
            "technicien_id": technicien_id,
            "optimized_order": [],
            "total_interventions": 0,
            "message": "Aucune intervention planifiée pour cette date"
        }
    
    # Get optimization
    result = await optimize_route(planned)
    result["date"] = date
    result["technicien_id"] = technicien_id
    
    return result


def calculate_simple_route_score(interventions: List[Dict]) -> Dict:
    """
    Calculate a simple route efficiency score without AI
    Based on geographic clustering and priority ordering
    
    Args:
        interventions: List of interventions
    
    Returns:
        Dict with score and basic analysis
    """
    if not interventions:
        return {"score": 100, "issues": [], "suggestions": []}
    
    issues = []
    suggestions = []
    score = 100
    
    # Check for priority issues
    urgent_count = sum(1 for i in interventions if i.get("priorite") in ["urgente", "haute"])
    if urgent_count > 0:
        # Check if urgent ones are first
        for idx, inv in enumerate(interventions):
            if inv.get("priorite") in ["urgente", "haute"] and idx > urgent_count:
                issues.append(f"Intervention urgente '{inv.get('titre')}' n'est pas en début de tournée")
                score -= 10
    
    # Check for geographic clustering
    cities = [i.get("ville", "") or i.get("client", {}).get("ville", "") for i in interventions]
    city_changes = sum(1 for i in range(1, len(cities)) if cities[i] != cities[i-1] and cities[i] and cities[i-1])
    
    if city_changes > len(interventions) / 2:
        issues.append("Nombreux changements de ville - la tournée pourrait être optimisée")
        suggestions.append("Regroupez les interventions par zone géographique")
        score -= 15
    
    # Check time gaps
    # (simplified - would need actual time parsing for full implementation)
    
    return {
        "score": max(0, score),
        "issues": issues,
        "suggestions": suggestions,
        "city_changes": city_changes,
        "urgent_interventions": urgent_count
    }
