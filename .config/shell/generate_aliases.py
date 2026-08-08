#!/usr/bin/env python3
from __future__ import annotations

import heapq
import os
import re
import shlex
import sys
import tempfile
import tomllib
import unicodedata
from dataclasses import dataclass
from pathlib import Path

ALIAS_NAME_RE = re.compile(r"[A-Za-z_][A-Za-z0-9_-]*\Z")
REQUIREMENT_RE = re.compile(r"[A-Za-z0-9_][A-Za-z0-9_.+-]*\Z")
NU_COMMAND_RE = re.compile(r"\^?[A-Za-z_][A-Za-z0-9_.+-]*\Z")
OPERATORS = frozenset({"|", ";"})
NU_RESERVED = frozenset(
    {
        "alias",
        "break",
        "const",
        "continue",
        "def",
        "do",
        "else",
        "export",
        "export-env",
        "extern",
        "false",
        "for",
        "hide",
        "if",
        "in",
        "let",
        "loop",
        "match",
        "module",
        "mut",
        "not",
        "null",
        "overlay",
        "return",
        "run",
        "source",
        "source-env",
        "true",
        "try",
        "use",
        "where",
        "while",
    }
)


class ValidationError(ValueError):
    pass


@dataclass(frozen=True)
class AliasSpec:
    command: tuple[str, ...]
    requires: str | None
    nu: tuple[str, ...] | None


def validate_tokens(value: object, location: str) -> tuple[str, ...]:
    if not isinstance(value, list) or not value:
        raise ValidationError(f"{location} must be a non-empty array")
    if any(not isinstance(token, str) or not token for token in value):
        raise ValidationError(f"{location} must contain non-empty strings")

    tokens = tuple(value)
    for token in tokens:
        if any(unicodedata.category(character) == "Cc" for character in token):
            raise ValidationError(f"{location} contains a control character")
    for index, token in enumerate(tokens):
        if token in OPERATORS and (
            index == 0
            or index == len(tokens) - 1
            or tokens[index - 1] in OPERATORS
            or tokens[index + 1] in OPERATORS
        ):
            raise ValidationError(f"{location} has invalid operator placement")
    return tokens


def validate_alias(name: object, value: object) -> AliasSpec:
    if not isinstance(name, str) or ALIAS_NAME_RE.fullmatch(name) is None:
        raise ValidationError(f"invalid alias name: {name!r}")
    if name in NU_RESERVED:
        raise ValidationError(f"alias {name!r} is a reserved Nushell name")
    if not isinstance(value, dict):
        raise ValidationError(f"alias {name!r} must be a table")

    unknown = set(value) - {"command", "requires", "nu"}
    if unknown:
        raise ValidationError(f"alias {name!r} has unknown keys: {sorted(unknown)!r}")
    if "command" not in value:
        raise ValidationError(f"alias {name!r} requires 'command'")

    command = validate_tokens(value["command"], f"alias {name!r} command")
    requires = value.get("requires")
    if requires is not None and (
        not isinstance(requires, str) or REQUIREMENT_RE.fullmatch(requires) is None
    ):
        raise ValidationError(f"alias {name!r} has invalid requires")
    nu_value = value.get("nu")
    nu = None if nu_value is None else validate_tokens(nu_value, f"alias {name!r} nu")
    return AliasSpec(command=command, requires=requires, nu=nu)


def nu_tokens(alias: AliasSpec) -> tuple[str, ...]:
    return alias.command if alias.nu is None else alias.nu


def command_positions(tokens: tuple[str, ...]) -> list[int]:
    return [0] + [index + 1 for index, token in enumerate(tokens) if token in OPERATORS]


def dependencies(name: str, alias: AliasSpec, alias_names: set[str]) -> set[str]:
    result: set[str] = set()
    tokens = nu_tokens(alias)
    for index in command_positions(tokens):
        command = tokens[index]
        if NU_COMMAND_RE.fullmatch(command) is None:
            raise ValidationError(
                f"alias {name!r} has invalid Nushell command {command!r}"
            )
        if not command.startswith("^") and command in NU_RESERVED:
            raise ValidationError(
                f"alias {name!r} uses reserved Nushell command {command!r}"
            )
        if not command.startswith("^") and command in alias_names:
            result.add(command)
    return result


def dependency_map(aliases: dict[str, AliasSpec]) -> dict[str, set[str]]:
    alias_names = set(aliases)
    return {
        name: dependencies(name, alias, alias_names) for name, alias in aliases.items()
    }


def order_aliases(aliases: dict[str, AliasSpec]) -> list[str]:
    required = dependency_map(aliases)
    dependents = {name: set() for name in aliases}
    for name, names_required in required.items():
        for requirement in names_required:
            dependents[requirement].add(name)

    ready = [name for name, names_required in required.items() if not names_required]
    heapq.heapify(ready)
    ordered: list[str] = []
    while ready:
        name = heapq.heappop(ready)
        ordered.append(name)
        for dependent in sorted(dependents[name]):
            required[dependent].remove(name)
            if not required[dependent]:
                heapq.heappush(ready, dependent)
    if len(ordered) != len(aliases):
        cyclic = sorted(set(aliases) - set(ordered))
        raise ValidationError(f"Nushell alias cycle: {', '.join(cyclic)}")
    return ordered


def validate_document(document: object) -> dict[str, AliasSpec]:
    if not isinstance(document, dict) or set(document) != {"aliases"}:
        raise ValidationError("root must contain only 'aliases'")
    raw_aliases = document["aliases"]
    if not isinstance(raw_aliases, dict):
        raise ValidationError("'aliases' must be a table")

    aliases = {name: validate_alias(name, value) for name, value in raw_aliases.items()}
    alias_names = set(aliases)
    for name, alias in aliases.items():
        if alias.requires in alias_names:
            raise ValidationError(
                f"alias {name!r} requires {alias.requires!r}, which cannot name a generated alias"
            )
    order_aliases(aliases)
    return aliases


def render_sh_tokens(tokens: tuple[str, ...]) -> str:
    positions = set(command_positions(tokens))
    rendered: list[str] = []
    for index, token in enumerate(tokens):
        if token in OPERATORS:
            rendered.append(token)
            continue
        if index in positions and token.startswith("^"):
            token = token[1:]
        rendered.append(shlex.quote(token))
    return " ".join(rendered)


def render_sh(aliases: dict[str, AliasSpec]) -> str:
    lines: list[str] = []
    for name in sorted(aliases):
        alias = aliases[name]
        definition = f"alias {name}={shlex.quote(render_sh_tokens(alias.command))}"
        if alias.requires is None:
            lines.append(definition)
        else:
            lines.extend(
                [
                    f"if command -v {alias.requires} >/dev/null 2>&1; then",
                    f"  {definition}",
                    "fi",
                ]
            )
    return "\n".join(lines) + "\n"


def quote_nu_argument(token: str) -> str:
    return '"' + token.replace("\\", "\\\\").replace('"', '\\"') + '"'


def render_nu_tokens(tokens: tuple[str, ...]) -> str:
    positions = set(command_positions(tokens))
    return " ".join(
        token if token in OPERATORS or index in positions else quote_nu_argument(token)
        for index, token in enumerate(tokens)
    )


def render_nu(aliases: dict[str, AliasSpec]) -> str:
    definitions: list[str] = []
    for name in order_aliases(aliases):
        tokens = nu_tokens(aliases[name])
        expression = render_nu_tokens(tokens)
        if OPERATORS.isdisjoint(tokens):
            definitions.append(f"alias {name} = {expression}")
        else:
            definitions.append(
                f"def --wrapped {name} [...rest] {{\n  {expression} ...$rest\n}}"
            )
    return "\n".join(definitions) + "\n"


def load_aliases(path: Path) -> dict[str, AliasSpec]:
    return validate_document(tomllib.loads(path.read_text(encoding="utf-8")))


def fsync_directory(directory: Path) -> None:
    descriptor = os.open(directory, os.O_RDONLY | os.O_DIRECTORY)
    try:
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


def update_file(path: Path, content: bytes) -> bool:
    try:
        if path.read_bytes() == content:
            return False
    except FileNotFoundError:
        pass

    temporary_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="wb",
            dir=path.parent,
            prefix=f".{path.name}.",
            delete=False,
        ) as temporary:
            temporary_path = Path(temporary.name)
            os.chmod(temporary.fileno(), 0o600)
            temporary.write(content)
            temporary.flush()
            os.fsync(temporary.fileno())
        os.chmod(temporary_path, 0o644)
        os.replace(temporary_path, path)
        temporary_path = None
        fsync_directory(path.parent)
        return True
    finally:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)


def main(arguments: list[str] | None = None) -> int:
    arguments = sys.argv[1:] if arguments is None else arguments
    if arguments:
        print("generate_aliases.py: accepts no arguments", file=sys.stderr)
        return 2

    try:
        directory = Path(__file__).resolve().parent
        shell_path = (directory / "aliases.sh").resolve()
        nu_path = (directory / "aliases.nu").resolve()
        aliases = load_aliases(directory / "aliases.toml")
        shell_content = render_sh(aliases).encode("utf-8")
        nu_content = render_nu(aliases).encode("utf-8")
        changed: list[Path] = []
        if update_file(shell_path, shell_content):
            changed.append(shell_path)
        if update_file(nu_path, nu_content):
            changed.append(nu_path)
    except (
        OSError,
        RuntimeError,
        UnicodeError,
        tomllib.TOMLDecodeError,
        ValidationError,
    ) as error:
        print(f"generate_aliases.py: {error}", file=sys.stderr)
        return 1

    for path in changed:
        print(path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
