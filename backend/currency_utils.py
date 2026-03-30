"""
Currency formatting utilities for multi-currency support
"""
from models import SUPPORTED_CURRENCIES

def format_currency(amount: float, currency_code: str = "EUR", show_symbol: bool = True) -> str:
    """
    Format an amount according to the currency settings
    
    Args:
        amount: The numeric amount to format
        currency_code: The ISO currency code (EUR, USD, XOF, etc.)
        show_symbol: Whether to include the currency symbol
    
    Returns:
        Formatted currency string
    """
    currency = SUPPORTED_CURRENCIES.get(currency_code, SUPPORTED_CURRENCIES["EUR"])
    
    # Format the number
    decimal_sep = currency["decimal_separator"]
    thousands_sep = currency["thousands_separator"]
    
    # Split into integer and decimal parts
    if amount < 0:
        sign = "-"
        amount = abs(amount)
    else:
        sign = ""
    
    # Round to 2 decimal places
    amount = round(amount, 2)
    int_part = int(amount)
    dec_part = round((amount - int_part) * 100)
    
    # Format integer part with thousands separator
    int_str = ""
    int_part_str = str(int_part)
    for i, digit in enumerate(reversed(int_part_str)):
        if i > 0 and i % 3 == 0:
            int_str = thousands_sep + int_str
        int_str = digit + int_str
    
    # Combine
    formatted = f"{sign}{int_str}{decimal_sep}{dec_part:02d}"
    
    if show_symbol:
        symbol = currency["symbol"]
        position = currency["position"]
        if position == "before":
            formatted = f"{symbol}{formatted}"
        else:
            formatted = f"{formatted} {symbol}"
    
    return formatted


def get_currency_info(currency_code: str) -> dict:
    """Get currency information"""
    return SUPPORTED_CURRENCIES.get(currency_code, SUPPORTED_CURRENCIES["EUR"])


def get_all_currencies() -> list:
    """Get list of all supported currencies"""
    return [
        {"code": code, **info}
        for code, info in SUPPORTED_CURRENCIES.items()
    ]


def format_currency_for_pdf(amount: float, currency_code: str = "EUR") -> str:
    """
    Format currency specifically for PDF generation (ReportLab)
    Uses simpler formatting compatible with PDF fonts
    """
    currency = SUPPORTED_CURRENCIES.get(currency_code, SUPPORTED_CURRENCIES["EUR"])
    
    # Format with 2 decimal places
    amount = round(amount, 2)
    
    # Simple formatting
    if currency_code == "XOF":
        # CFA doesn't use decimals typically
        formatted = f"{int(amount):,}".replace(",", " ")
        return f"{formatted} CFA"
    elif currency_code in ["EUR", "MAD"]:
        formatted = f"{amount:,.2f}".replace(",", " ").replace(".", ",")
        return f"{formatted} {currency['symbol']}"
    else:
        formatted = f"{amount:,.2f}"
        if currency["position"] == "before":
            return f"{currency['symbol']}{formatted}"
        else:
            return f"{formatted} {currency['symbol']}"
