---
description: Kotlin language conventions
globs:
  - "**/*.kt"
  - "**/*.kts"
---

# Kotlin

- Use English for all code and documentation.
- Always declare the type of each variable and function (parameters and return value).
  - Avoid `Any`; create necessary types.
- Don't leave blank lines within a function.
- Use PascalCase for classes, camelCase for variables and functions, snake_case for file and directory names, UPPERCASE for environment variables.
- Avoid magic numbers; define constants.
- Use complete words instead of abbreviations.
  - Except for standard abbreviations like API, URL.
  - Except for well-known abbreviations: i, j for loop counters, err for errors, ctx for contexts.

## Functions

- Write short functions with a single purpose (less than 20 instructions).
- Name functions with a verb.
  - Boolean returns: `isX`, `hasX`, `canX`.
  - Unit returns: `executeX`, `saveX`.
- Avoid nesting blocks via early checks and returns, and extraction to utility functions.
- Use higher-order functions (`map`, `filter`, `reduce`) to avoid deep nesting.
  - Use lambda expressions for simple transformations; named functions for anything non-trivial.
- Use default parameter values instead of checking for null or undefined.
- Reduce function parameters with RO-RO:
  - Use a data class to pass multiple parameters and to return results.
  - Declare types for input arguments and output.
- Use a single level of abstraction.

## Data and Classes

- Use data classes for data.
- Don't abuse primitive types; encapsulate data in composite types.
- Avoid data validation in functions; use classes with internal validation.
- Prefer immutability: `val` over `var`.
- Follow SOLID principles.
- Prefer composition over inheritance.
- Declare interfaces to define contracts.
- Write small classes with a single purpose (less than 200 instructions, less than 10 public methods, less than 10 properties).

## Exceptions

- Use exceptions to handle errors you don't expect.
- If you catch an exception, it should be to fix an expected problem or add context; otherwise, use a global handler.