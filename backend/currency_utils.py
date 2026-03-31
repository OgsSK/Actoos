"""
Currency formatting utilities for multi-currency support with conversion
"""
from models import SUPPORTED_CURRENCIES

# Taux de change par rapport à l'EUR (base)
# Ces taux sont approximatifs - en production, utiliser une API comme exchangerate-api.com
EXCHANGE_RATES = {
    "EUR": 1.0,
    "USD": 1.08,      # 1 EUR = 1.08 USD
    "XOF": 655.96,    # 1 EUR = 655.96 XOF (CFA)
    "GBP": 0.86,      # 1 EUR = 0.86 GBP
    "CHF": 0.97,      # 1 EUR = 0.97 CHF
    "CAD": 1.47,      # 1 EUR = 1.47 CAD
    "MAD": 10.85      # 1 EUR = 10.85 MAD
}

def convert_amount(amount: float, from_currency: str = "EUR", to_currency: str = "EUR") -> float:
    """
    Convert an amount from one currency to another
    
    Args:
        amount: The amount to convert
        from_currency: Source currency code
        to_currency: Target currency code
    
    Returns:
        Converted amount
    """
    if from_currency == to_currency:
        return amount
    
    # Convert to EUR first (base currency)
    from_rate = EXCHANGE_RATES.get(from_currency, 1.0)
    to_rate = EXCHANGE_RATES.get(to_currency, 1.0)
    
    # amount in EUR = amount / from_rate
    # amount in target = amount_eur * to_rate
    amount_eur = amount / from_rate
    converted = amount_eur * to_rate
    
    return round(converted, 2)


def get_exchange_rate(from_currency: str = "EUR", to_currency: str = "EUR") -> float:
    """Get exchange rate between two currencies"""
    if from_currency == to_currency:
        return 1.0
    
    from_rate = EXCHANGE_RATES.get(from_currency, 1.0)
    to_rate = EXCHANGE_RATES.get(to_currency, 1.0)
    
    return to_rate / from_rate


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
