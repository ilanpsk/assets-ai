from __future__ import annotations

from typing import Any, Callable, TypeVar

T = TypeVar("T")


def unpack_items_total(result: Any) -> tuple[list[Any], int]:
    """
    Normalize common "list" return shapes used across services/endpoints:

    - (items, total)
    - {"items": items, "total": total}
    - items (list)
    """
    if isinstance(result, tuple) and len(result) == 2:
        items, total = result
        if isinstance(items, list) and isinstance(total, int):
            return items, total

    if isinstance(result, dict) and "items" in result:
        items = result.get("items")
        total = result.get("total")
        if isinstance(items, list) and isinstance(total, int):
            return items, total
        if isinstance(items, list):
            return items, len(items)

    if isinstance(result, list):
        return result, len(result)

    return [], 0


def extract_first_matching(
    obj: Any,
    predicate: Callable[[Any], bool],
    *,
    max_depth: int = 4,
) -> Any | None:
    """
    Try to find a matching object inside nested containers (list/tuple/Row-like).

    Useful when services accidentally return joined rows, nested sequences,
    or framework-specific envelopes.
    """
    if predicate(obj):
        return obj

    if max_depth <= 0:
        return None

    # SQLAlchemy Row has `_mapping`; avoid treating strings/bytes as iterables.
    mapping = getattr(obj, "_mapping", None)
    if mapping is not None:
        try:
            for v in mapping.values():
                found = extract_first_matching(v, predicate, max_depth=max_depth - 1)
                if found is not None:
                    return found
        except Exception:
            # Best-effort extraction only.
            pass

    if isinstance(obj, (list, tuple)):
        for v in obj:
            found = extract_first_matching(v, predicate, max_depth=max_depth - 1)
            if found is not None:
                return found

        if len(obj) == 1:
            return extract_first_matching(obj[0], predicate, max_depth=max_depth - 1)

    return None




