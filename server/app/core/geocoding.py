import logging
import httpx

logger = logging.getLogger(__name__)

NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse"
USER_AGENT = "SumateApp/1.0 (contacto@sumate.app)"


async def reverse_geocode(latitude: float, longitude: float) -> tuple[str, str]:
    headers = {"User-Agent": USER_AGENT}
    params = {
        "format": "jsonv2",
        "lat": str(latitude),
        "lon": str(longitude),
        "zoom": "18",
        "addressdetails": "1",
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.get(NOMINATIM_REVERSE_URL, params=params, headers=headers)
            if response.status_code == 200:
                data = response.json()
                address_data = data.get("address", {})

                name = data.get("name")
                place = (
                    name
                    or address_data.get("amenity")
                    or address_data.get("building")
                    or address_data.get("tourism")
                    or address_data.get("leisure")
                    or address_data.get("shop")
                    or address_data.get("road")
                    or "Punto en el mapa"
                )

                parts = []
                road = address_data.get("road")
                suburb = (
                    address_data.get("suburb")
                    or address_data.get("neighbourhood")
                    or address_data.get("quarter")
                )
                city = (
                    address_data.get("city")
                    or address_data.get("town")
                    or address_data.get("village")
                    or address_data.get("county")
                )
                state = address_data.get("state")

                if road:
                    parts.append(road)
                if suburb and suburb != road:
                    parts.append(suburb)
                if city and city != suburb:
                    parts.append(city)
                if state and state != city:
                    parts.append(state)

                address = ", ".join(parts) if parts else data.get("display_name", f"{latitude:.5f}, {longitude:.5f}")
                return place[:255], address[:500]

    except Exception as exc:
        logger.warning("Fallo al resolver geocodificación inversa con Nominatim: %s", exc)

    return "Ubicación en el mapa", f"Coordenadas: {latitude:.5f}, {longitude:.5f}"
