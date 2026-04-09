import re


def extract_jsx(markdown_text: str) -> str:
    """
    Extract React/JSX code from markdown code fences.
    """
    if not markdown_text:
        return ""

    pattern = re.compile(
        r"```(?:jsx|tsx|javascript|js|react)?\s*\n(.*?)```",
        re.IGNORECASE | re.DOTALL,
    )
    matches = pattern.findall(markdown_text)
    if matches:
        return "\n\n".join(block.strip() for block in matches if block.strip())

    # Fallback: return the raw response if no fenced block is found.
    return markdown_text.strip()
